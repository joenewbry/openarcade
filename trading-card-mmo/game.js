// trading-card-mmo/game.js — Trading Card MMO ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const PINK = '#ee44aa';
const GOLD = '#ffd700';
const BG = '#1a1a2e';
const RARITY_COLORS = { Common: '#aaaaaa', Rare: '#4488ff', Epic: '#aa44ff', Legendary: '#ffd700' };

let score = 0;
let gold = 0;
let wins = 0;
let playerCollection = [];
let playerDeck = [];
let aiCollection = [];
let aiDeck = [];
let view = 'menu';
let battleState = null;
let tournamentState = null;
let packCards = [];
let packRevealIdx = 0;
let hoverCard = null;
let deckScrollY = 0;
let collScrollY = 0;
let menuButtons = [];
let battleLog = [];
let tradeOfferPlayer = [];
let tradeOfferAI = [];
let tradePhase = 'select';
let mouseX = 0, mouseY = 0;

const scoreEl = document.getElementById('score');
const goldEl = document.getElementById('goldDisplay');
const cardCountEl = document.getElementById('cardCount');

const CARD_TEMPLATES = [];

function makeCards() {
  const creatures = [
    { name: 'Goblin Scout', atk: 2, def: 1, cost: 1, rarity: 'Common' },
    { name: 'Forest Sprite', atk: 1, def: 2, cost: 1, rarity: 'Common' },
    { name: 'Iron Golem', atk: 3, def: 4, cost: 3, rarity: 'Common' },
    { name: 'Shadow Cat', atk: 3, def: 2, cost: 2, rarity: 'Common' },
    { name: 'River Nymph', atk: 2, def: 3, cost: 2, rarity: 'Common' },
    { name: 'Stone Guard', atk: 1, def: 5, cost: 3, rarity: 'Common' },
    { name: 'Flame Imp', atk: 4, def: 1, cost: 2, rarity: 'Common' },
    { name: 'Moss Turtle', atk: 1, def: 4, cost: 2, rarity: 'Common' },
    { name: 'Ember Fox', atk: 2, def: 2, cost: 1, rarity: 'Common' },
    { name: 'Bone Warrior', atk: 3, def: 3, cost: 3, rarity: 'Common' },
    { name: 'Wind Hawk', atk: 3, def: 3, cost: 3, rarity: 'Rare' },
    { name: 'Crystal Knight', atk: 4, def: 4, cost: 4, rarity: 'Rare' },
    { name: 'Lava Drake', atk: 5, def: 3, cost: 4, rarity: 'Rare' },
    { name: 'Frost Giant', atk: 4, def: 6, cost: 5, rarity: 'Rare' },
    { name: 'Thunder Eagle', atk: 5, def: 4, cost: 5, rarity: 'Rare' },
    { name: 'Plague Rat', atk: 4, def: 2, cost: 3, rarity: 'Rare' },
    { name: 'Void Stalker', atk: 6, def: 3, cost: 5, rarity: 'Epic' },
    { name: 'Sun Phoenix', atk: 5, def: 5, cost: 6, rarity: 'Epic' },
    { name: 'Abyssal Leviathan', atk: 7, def: 6, cost: 7, rarity: 'Epic' },
    { name: 'Storm Elemental', atk: 6, def: 4, cost: 6, rarity: 'Epic' },
    { name: 'Ancient Dragon', atk: 8, def: 7, cost: 8, rarity: 'Legendary' },
    { name: 'Celestial Titan', atk: 9, def: 9, cost: 9, rarity: 'Legendary' },
    { name: 'World Serpent', atk: 7, def: 8, cost: 8, rarity: 'Legendary' },
  ];
  const spells = [
    { name: 'Spark', effect: 'Deal 1 dmg', cost: 1, rarity: 'Common', dmg: 1 },
    { name: 'Mend', effect: 'Heal 2 HP', cost: 1, rarity: 'Common', heal: 2 },
    { name: 'Fireball', effect: 'Deal 3 dmg', cost: 2, rarity: 'Common', dmg: 3 },
    { name: 'Heal', effect: 'Heal 4 HP', cost: 2, rarity: 'Common', heal: 4 },
    { name: 'Lightning', effect: 'Deal 4 dmg', cost: 3, rarity: 'Rare', dmg: 4 },
    { name: 'Blizzard', effect: '2 dmg to all', cost: 4, rarity: 'Rare', aoe: 2 },
    { name: 'Divine Light', effect: 'Heal 6 HP', cost: 4, rarity: 'Rare', heal: 6 },
    { name: 'Meteor', effect: 'Deal 6 dmg', cost: 5, rarity: 'Epic', dmg: 6 },
    { name: 'Resurrect', effect: 'Heal 8 HP', cost: 5, rarity: 'Epic', heal: 8 },
    { name: 'Apocalypse', effect: '4 dmg to all', cost: 7, rarity: 'Legendary', aoe: 4 },
  ];
  const equips = [
    { name: 'Rusty Sword', effect: '+2 ATK', cost: 1, rarity: 'Common', atkBuff: 2 },
    { name: 'Wood Shield', effect: '+2 DEF', cost: 1, rarity: 'Common', defBuff: 2 },
    { name: 'Steel Armor', effect: '+3 DEF', cost: 2, rarity: 'Common', defBuff: 3 },
    { name: 'Flame Blade', effect: '+3 ATK', cost: 3, rarity: 'Rare', atkBuff: 3 },
    { name: 'Dragon Scale', effect: '+4 DEF', cost: 3, rarity: 'Rare', defBuff: 4 },
    { name: 'Excalibur', effect: '+5 ATK', cost: 5, rarity: 'Epic', atkBuff: 5 },
    { name: 'Aegis Shield', effect: '+5 DEF', cost: 5, rarity: 'Epic', defBuff: 5 },
    { name: 'Crown of Stars', effect: '+4/+4', cost: 7, rarity: 'Legendary', atkBuff: 4, defBuff: 4 },
  ];
  let id = 0;
  creatures.forEach(c => CARD_TEMPLATES.push({ id: id++, ...c, type: 'Creature' }));
  spells.forEach(s => CARD_TEMPLATES.push({ id: id++, ...s, type: 'Spell' }));
  equips.forEach(e => CARD_TEMPLATES.push({ id: id++, ...e, type: 'Equipment' }));
}
makeCards();

function cloneCard(t) { return { ...t, uid: Math.random().toString(36).slice(2, 10) }; }
function cardValue(c) { return { Common: 1, Rare: 3, Epic: 8, Legendary: 20 }[c.rarity] || 1; }
function collectionValue(co) { return co.reduce((s, c) => s + cardValue(c), 0); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeStarterDeck() {
  const st = CARD_TEMPLATES.filter(c => c.rarity === 'Common');
  const d = [];
  for (let i = 0; i < 20; i++) d.push(cloneCard(st[i % st.length]));
  return d;
}

function makeAICollection() {
  const co = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.random();
    let pool;
    if (r < 0.5) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Common');
    else if (r < 0.8) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Rare');
    else if (r < 0.95) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Epic');
    else pool = CARD_TEMPLATES.filter(c => c.rarity === 'Legendary');
    co.push(cloneCard(pool[Math.floor(Math.random() * pool.length)]));
  }
  return co;
}

function aiBuildDeck(collection) {
  const sorted = [...collection].sort((a, b) => {
    const va = (a.type === 'Creature' ? (a.atk + a.def) : cardValue(a) * 2) / Math.max(1, a.cost);
    const vb = (b.type === 'Creature' ? (b.atk + b.def) : cardValue(b) * 2) / Math.max(1, b.cost);
    return vb - va;
  });
  return sorted.slice(0, 20);
}

function generatePack() {
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const r = Math.random();
    let pool;
    if (r < 0.55) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Common');
    else if (r < 0.82) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Rare');
    else if (r < 0.95) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Epic');
    else pool = CARD_TEMPLATES.filter(c => c.rarity === 'Legendary');
    cards.push(cloneCard(pool[Math.floor(Math.random() * pool.length)]));
  }
  return cards;
}

function updateUI() {
  if (scoreEl) scoreEl.textContent = wins;
  if (goldEl) goldEl.textContent = gold;
  if (cardCountEl) cardCountEl.textContent = playerCollection.length;
}

function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

// ── Drawing helpers ──

// Draw a rounded-rect approximation using fillRect + corner fills
// For simplicity we use fillRect (no native roundRect in renderer)
// and draw a border via strokeLine calls.
function drawRoundRectFill(renderer, x, y, w, h, color) {
  renderer.fillRect(x, y, w, h, color);
}

function drawRoundRectStroke(renderer, x, y, w, h, color, lw = 2) {
  renderer.drawLine(x, y, x + w, y, color, lw);
  renderer.drawLine(x + w, y, x + w, y + h, color, lw);
  renderer.drawLine(x + w, y + h, x, y + h, color, lw);
  renderer.drawLine(x, y + h, x, y, color, lw);
}

function drawCard(renderer, text, card, x, y, w, h, hl, sm) {
  const rc = RARITY_COLORS[card.rarity];
  drawRoundRectFill(renderer, x, y, w, h, hl ? '#2a2a4e' : '#1e1e38');
  drawRoundRectStroke(renderer, x, y, w, h, rc, 1.5);

  if (card.rarity === 'Legendary') {
    renderer.setGlow(GOLD, 0.9);
    drawRoundRectStroke(renderer, x, y, w, h, GOLD, 2);
    renderer.setGlow(null);
  } else if (card.rarity === 'Epic') {
    renderer.setGlow('#aa44ff', 0.7);
    drawRoundRectStroke(renderer, x, y, w, h, '#aa44ff', 2);
    renderer.setGlow(null);
  }

  const fs = sm ? 8 : 11;
  // Card name
  const nm = card.name.length > 11 ? card.name.slice(0, 10) + '.' : card.name;
  text.drawText(nm, x + 3, y + 2, fs, rc, 'left');
  // Cost diamond
  text.drawText(card.cost + '\u2666', x + w - (sm ? 16 : 22), y + 2, fs, '#4af', 'left');
  // Type icon
  const icons = { Creature: '\u2694', Spell: '\u2728', Equipment: '\u26E8' };
  const iconFs = sm ? 12 : 18;
  text.drawText(icons[card.type] || '?', x + w / 2 - iconFs * 0.3, y + (sm ? 14 : 18), iconFs, '#dddddd', 'left');
  // Stats
  if (card.type === 'Creature') {
    const statFs = sm ? 7 : 10;
    text.drawText('ATK:' + (card.curAtk !== undefined ? card.curAtk : card.atk), x + 3, y + h - (sm ? 16 : 22), statFs, '#ff5555', 'left');
    text.drawText('DEF:' + (card.curDef !== undefined ? card.curDef : card.def), x + 3, y + h - (sm ? 7 : 10), statFs, '#55ff55', 'left');
  } else {
    const effFs = sm ? 6 : 8;
    const eff = (card.effect || '').length > 10 ? (card.effect || '').slice(0, 9) + '.' : (card.effect || '');
    text.drawText(eff, x + 3, y + h - (sm ? 7 : 12), effFs, '#cccccc', 'left');
  }
  // Rarity initial
  text.drawText(card.rarity[0], x + w - (sm ? 9 : 13), y + h - (sm ? 8 : 10), sm ? 6 : 8, rc, 'left');
}

function drawBtn(renderer, text, x, y, w, h, label, color, hov) {
  const bgColor = hov ? '#2e2e4e' : '#1a1a2e';
  drawRoundRectFill(renderer, x, y, w, h, bgColor);
  if (hov) {
    renderer.setGlow(color || PINK, 0.6);
    drawRoundRectStroke(renderer, x, y, w, h, color || PINK, 2);
    renderer.setGlow(null);
  } else {
    drawRoundRectStroke(renderer, x, y, w, h, color || PINK, 1.5);
  }
  text.drawText(label, x + w / 2, y + h / 2 - 6, 12, color || PINK, 'center');
  return { x, y, w, h };
}

// ── Battle helpers ──

function initBattle(aiD) {
  const pd = shuffle([...playerDeck].map(c => ({ ...c, curAtk: c.atk, curDef: c.def })));
  const ad = shuffle([...(aiD || aiDeck)].map(c => ({ ...c, curAtk: c.atk, curDef: c.def })));
  battleState = {
    playerHP: 20, aiHP: 20,
    playerMana: 1, aiMana: 1, maxMana: 1, aiMaxMana: 1,
    playerHand: pd.splice(0, 4),
    aiHand: ad.splice(0, 4),
    playerField: [], aiField: [],
    playerDeckPile: pd, aiDeckPile: ad,
    turn: 'player', selectedFieldCard: null, attackTarget: null,
    turnNum: 1, gameOver: false, winner: null,
    aiThinking: false, aiThinkTimer: 0,
    msg: 'Your turn! Play cards or attack.',
  };
  battleLog = [];
  view = 'battle';
}

function battlePlayCard(idx) {
  const bs = battleState;
  if (bs.turn !== 'player' || bs.gameOver) return;
  const card = bs.playerHand[idx];
  if (!card || card.cost > bs.playerMana) return;
  bs.playerMana -= card.cost;

  if (card.type === 'Creature') {
    if (bs.playerField.length >= 5) { bs.msg = 'Field full!'; bs.playerMana += card.cost; return; }
    card.attacked = false; card.curAtk = card.atk; card.curDef = card.def;
    bs.playerField.push(card);
    bs.playerHand.splice(idx, 1);
    battleLog.push('You play ' + card.name);
    bs.msg = 'Played ' + card.name;
  } else if (card.type === 'Spell') {
    if (card.dmg) {
      if (bs.aiField.length > 0 && !card.aoe) {
        let best = 0;
        bs.aiField.forEach((c, i) => { if ((c.curAtk || c.atk) > (bs.aiField[best].curAtk || bs.aiField[best].atk)) best = i; });
        bs.aiField[best].curDef -= card.dmg;
        battleLog.push(card.name + ' hits ' + bs.aiField[best].name + ' for ' + card.dmg);
        if (bs.aiField[best].curDef <= 0) { battleLog.push(bs.aiField[best].name + ' destroyed!'); bs.aiField.splice(best, 1); }
      } else if (card.aoe) {
        for (let i = bs.aiField.length - 1; i >= 0; i--) {
          bs.aiField[i].curDef -= card.aoe;
          if (bs.aiField[i].curDef <= 0) { battleLog.push(bs.aiField[i].name + ' destroyed!'); bs.aiField.splice(i, 1); }
        }
        battleLog.push(card.name + ' hits all for ' + card.aoe);
      } else {
        bs.aiHP -= card.dmg;
        battleLog.push(card.name + ' deals ' + card.dmg + ' to AI');
      }
    }
    if (card.heal) {
      bs.playerHP = Math.min(20, bs.playerHP + card.heal);
      battleLog.push(card.name + ' heals ' + card.heal);
    }
    bs.playerHand.splice(idx, 1);
    bs.msg = 'Cast ' + card.name;
  } else if (card.type === 'Equipment') {
    if (bs.playerField.length > 0) {
      let best = 0;
      bs.playerField.forEach((c, i) => { if ((c.curAtk || 0) > (bs.playerField[best].curAtk || 0)) best = i; });
      if (card.atkBuff) bs.playerField[best].curAtk += card.atkBuff;
      if (card.defBuff) bs.playerField[best].curDef += card.defBuff;
      battleLog.push(card.name + ' on ' + bs.playerField[best].name);
      bs.playerHand.splice(idx, 1);
      bs.msg = 'Equipped ' + card.name;
    } else { bs.msg = 'No creatures!'; bs.playerMana += card.cost; return; }
  }
  checkBattleEnd();
}

function battleAttack(fi, ti) {
  const bs = battleState;
  const atk = bs.playerField[fi];
  if (!atk || atk.attacked) return;
  if (ti === -1) {
    if (bs.aiField.length > 0) { bs.msg = 'Attack creatures first!'; return; }
    bs.aiHP -= (atk.curAtk || atk.atk);
    battleLog.push(atk.name + ' hits AI for ' + (atk.curAtk || atk.atk));
    atk.attacked = true;
  } else if (ti >= 0 && ti < bs.aiField.length) {
    const def = bs.aiField[ti];
    def.curDef -= (atk.curAtk || atk.atk);
    atk.curDef -= (def.curAtk || def.atk);
    battleLog.push(atk.name + ' vs ' + def.name);
    if (def.curDef <= 0) { battleLog.push(def.name + ' destroyed!'); bs.aiField.splice(ti, 1); }
    if (atk.curDef <= 0) { battleLog.push(atk.name + ' destroyed!'); bs.playerField.splice(fi, 1); }
    atk.attacked = true;
  }
  bs.selectedFieldCard = null;
  bs.attackTarget = null;
  bs.msg = 'Select creature or end turn.';
  checkBattleEnd();
}

function endPlayerTurn() {
  const bs = battleState;
  bs.turn = 'ai';
  bs.aiThinking = true;
  bs.aiThinkTimer = 35;
  bs.msg = 'AI thinking...';
  bs.playerField.forEach(c => c.attacked = false);
}

function aiTurn() {
  const bs = battleState;
  bs.aiMaxMana = Math.min(10, bs.aiMaxMana + 1);
  bs.aiMana = bs.aiMaxMana;
  if (bs.aiDeckPile.length > 0 && bs.aiHand.length < 8) bs.aiHand.push(bs.aiDeckPile.pop());

  let played = true;
  while (played) {
    played = false;
    const playable = bs.aiHand.filter(c => c.cost <= bs.aiMana).sort((a, b) => b.cost - a.cost);
    for (const card of playable) {
      const idx = bs.aiHand.indexOf(card);
      if (idx < 0) continue;
      if (card.type === 'Creature' && bs.aiField.length < 5) {
        bs.aiMana -= card.cost;
        card.curAtk = card.atk; card.curDef = card.def; card.attacked = false;
        bs.aiField.push(card); bs.aiHand.splice(idx, 1);
        battleLog.push('AI plays ' + card.name); played = true; break;
      } else if (card.type === 'Spell') {
        bs.aiMana -= card.cost;
        if (card.dmg && bs.playerField.length > 0 && !card.aoe) {
          let best = 0;
          bs.playerField.forEach((c, i) => { if ((c.curAtk || c.atk) > (bs.playerField[best].curAtk || bs.playerField[best].atk)) best = i; });
          bs.playerField[best].curDef -= card.dmg;
          battleLog.push('AI ' + card.name + ' on ' + bs.playerField[best].name);
          if (bs.playerField[best].curDef <= 0) { battleLog.push(bs.playerField[best].name + ' destroyed!'); bs.playerField.splice(best, 1); }
        } else if (card.aoe) {
          for (let i = bs.playerField.length - 1; i >= 0; i--) {
            bs.playerField[i].curDef -= card.aoe;
            if (bs.playerField[i].curDef <= 0) { battleLog.push(bs.playerField[i].name + ' destroyed!'); bs.playerField.splice(i, 1); }
          }
          battleLog.push('AI casts ' + card.name);
        } else if (card.dmg) {
          bs.playerHP -= card.dmg;
          battleLog.push('AI ' + card.name + ' for ' + card.dmg);
        } else if (card.heal) {
          bs.aiHP = Math.min(20, bs.aiHP + card.heal);
          battleLog.push('AI heals ' + card.heal);
        }
        bs.aiHand.splice(idx, 1); played = true; break;
      } else if (card.type === 'Equipment' && bs.aiField.length > 0) {
        bs.aiMana -= card.cost;
        let best = 0;
        bs.aiField.forEach((c, i) => { if ((c.curAtk || 0) > (bs.aiField[best].curAtk || 0)) best = i; });
        if (card.atkBuff) bs.aiField[best].curAtk += card.atkBuff;
        if (card.defBuff) bs.aiField[best].curDef += card.defBuff;
        battleLog.push('AI equips ' + card.name);
        bs.aiHand.splice(idx, 1); played = true; break;
      }
    }
  }

  const attackers = [...bs.aiField];
  for (const creature of attackers) {
    if (creature.attacked) continue;
    if (!bs.aiField.includes(creature)) continue;
    creature.attacked = true;
    if (bs.playerField.length > 0) {
      let weakest = 0;
      bs.playerField.forEach((c, i) => {
        if ((c.curDef || c.def) < (bs.playerField[weakest].curDef || bs.playerField[weakest].def)) weakest = i;
      });
      const def = bs.playerField[weakest];
      def.curDef -= (creature.curAtk || creature.atk);
      creature.curDef -= (def.curAtk || def.atk);
      battleLog.push('AI ' + creature.name + ' vs ' + def.name);
      if (def.curDef <= 0) { battleLog.push(def.name + ' destroyed!'); bs.playerField.splice(weakest, 1); }
      if (creature.curDef <= 0) {
        battleLog.push(creature.name + ' destroyed!');
        const ci = bs.aiField.indexOf(creature);
        if (ci >= 0) bs.aiField.splice(ci, 1);
      }
    } else {
      bs.playerHP -= (creature.curAtk || creature.atk);
      battleLog.push('AI ' + creature.name + ' hits you for ' + (creature.curAtk || creature.atk));
    }
    if (bs.playerHP <= 0 || bs.aiHP <= 0) break;
  }

  checkBattleEnd();
  if (!bs.gameOver) {
    bs.turn = 'player';
    bs.turnNum++;
    bs.maxMana = Math.min(10, bs.maxMana + 1);
    bs.playerMana = bs.maxMana;
    if (bs.playerDeckPile.length > 0 && bs.playerHand.length < 8) bs.playerHand.push(bs.playerDeckPile.pop());
    bs.playerField.forEach(c => c.attacked = false);
    bs.aiField.forEach(c => c.attacked = false);
    bs.msg = 'Your turn! Play cards or attack.';
  }
}

function checkBattleEnd() {
  const bs = battleState;
  if (bs.aiHP <= 0) { bs.gameOver = true; bs.winner = 'player'; bs.msg = 'Victory!'; }
  else if (bs.playerHP <= 0) { bs.gameOver = true; bs.winner = 'ai'; bs.msg = 'Defeat!'; }
}

function finishBattle() {
  const bs = battleState;
  if (bs.winner === 'player') {
    wins++;
    gold += 75;
    score = wins * 10 + collectionValue(playerCollection);
    packCards = generatePack();
    packRevealIdx = -1;
    view = 'packopen';
  } else {
    gold += 15;
    if (tournamentState) { tournamentState.eliminated = true; view = 'tournament'; }
    else view = 'menu';
  }
  updateUI();
}

function initTournament() {
  tournamentState = { round: 1, maxRounds: 4, opponents: [], results: [], eliminated: false, rewards: [100, 200, 400, 800] };
  for (let i = 0; i < 4; i++) {
    const opp = [];
    const rc = 0.3 + i * 0.15;
    for (let j = 0; j < 25; j++) {
      const r = Math.random();
      let pool;
      if (r < (1 - rc)) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Common');
      else if (r < (1 - rc * 0.4)) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Rare');
      else if (r < (1 - rc * 0.1)) pool = CARD_TEMPLATES.filter(c => c.rarity === 'Epic');
      else pool = CARD_TEMPLATES.filter(c => c.rarity === 'Legendary');
      opp.push(cloneCard(pool[Math.floor(Math.random() * pool.length)]));
    }
    tournamentState.opponents.push(aiBuildDeck(opp));
  }
  view = 'tournament';
}

function generateAITradeOffer() {
  const pv = tradeOfferPlayer.reduce((s, c) => s + cardValue(c), 0);
  const tv = Math.max(1, pv - 1 + Math.floor(Math.random() * 3));
  const avail = aiCollection.filter(c => !aiDeck.some(d => d.uid === c.uid));
  tradeOfferAI = [];
  if (avail.length === 0) {
    for (let i = 0; i < 2; i++) {
      const pool = CARD_TEMPLATES.filter(c => cardValue(c) <= tv);
      if (pool.length) tradeOfferAI.push(cloneCard(pool[Math.floor(Math.random() * pool.length)]));
    }
    return;
  }
  const sh = shuffle([...avail]);
  let val = 0;
  for (const c of sh) {
    if (val >= tv || tradeOfferAI.length >= 3) break;
    tradeOfferAI.push(c); val += cardValue(c);
  }
}

function executeTrade() {
  for (const c of tradeOfferPlayer) {
    const idx = playerCollection.findIndex(p => p.uid === c.uid);
    if (idx >= 0) playerCollection.splice(idx, 1);
    const di = playerDeck.findIndex(d => d.uid === c.uid);
    if (di >= 0) playerDeck.splice(di, 1);
  }
  for (const c of tradeOfferAI) {
    playerCollection.push(c);
    const ai = aiCollection.findIndex(a => a.uid === c.uid);
    if (ai >= 0) aiCollection.splice(ai, 1);
  }
  for (const c of tradeOfferPlayer) aiCollection.push(c);
  tradePhase = 'done';
  updateUI();
}

// ── Action handler ──

function handleAction(action, btn, game) {
  switch (action) {
    case 'battle':
      if (playerDeck.length < 10) return;
      aiDeck = aiBuildDeck(aiCollection);
      initBattle();
      break;
    case 'tournament':
      if (playerDeck.length < 10) return;
      initTournament();
      break;
    case 'buypack':
      if (gold >= 50) { gold -= 50; packCards = generatePack(); packRevealIdx = -1; view = 'packopen'; updateUI(); }
      break;
    case 'collection': collScrollY = 0; view = 'collection'; break;
    case 'deckbuilder': deckScrollY = 0; view = 'deckbuilder'; break;
    case 'trade': tradeOfferPlayer = []; tradeOfferAI = []; tradePhase = 'select'; view = 'trade'; break;
    case 'menu': view = 'menu'; break;
    case 'openpack': packRevealIdx = 0; break;
    case 'revealnext': if (packRevealIdx < packCards.length - 1) packRevealIdx++; break;
    case 'packcontinue':
      for (const c of packCards) playerCollection.push(c);
      updateUI();
      if (tournamentState && !tournamentState.eliminated) {
        tournamentState.results.push(true);
        tournamentState.round++;
        gold += tournamentState.rewards[tournamentState.round - 2] || 0;
        updateUI();
        view = 'tournament';
      } else view = 'menu';
      break;
    case 'endturn': endPlayerTurn(); break;
    case 'tournfight': {
      const rd = btn && btn.round !== undefined ? btn.round : tournamentState.round - 1;
      initBattle(tournamentState.opponents[rd]);
      break;
    }
    case 'tradeaccept': executeTrade(); break;
    case 'tradedecline': tradeOfferPlayer = []; tradeOfferAI = []; break;
  }
}

function handleBattleClick(cx, cy) {
  const bs = battleState;
  if (!bs || bs.gameOver) { if (bs && bs.gameOver) finishBattle(); return; }
  if (bs.turn !== 'player') return;

  const hw = Math.min(95, (W - 20) / Math.max(1, bs.playerHand.length));
  for (let i = 0; i < bs.playerHand.length; i++) {
    if (cx >= 10 + i * hw && cx <= 10 + i * hw + hw - 4 && cy >= 270 && cy <= 365) {
      battlePlayCard(i); return;
    }
  }

  for (let i = 0; i < bs.playerField.length; i++) {
    if (cx >= 10 + i * 100 && cx <= 102 + i * 100 && cy >= 158 && cy <= 234) {
      if (bs.selectedFieldCard === i) bs.selectedFieldCard = null;
      else { bs.selectedFieldCard = i; bs.attackTarget = null; }
      if (bs.selectedFieldCard !== null) {
        bs.msg = bs.aiField.length === 0 ? 'Click AI HP bar to attack!' : 'Select enemy to attack!';
      }
      return;
    }
  }

  if (bs.selectedFieldCard !== null) {
    for (let i = 0; i < bs.aiField.length; i++) {
      if (cx >= 10 + i * 100 && cx <= 102 + i * 100 && cy >= 38 && cy <= 114) {
        battleAttack(bs.selectedFieldCard, i); return;
      }
    }
    if (cy < 30 && bs.aiField.length === 0) { battleAttack(bs.selectedFieldCard, -1); return; }
  }
}

function handleDeckBuilderClick(cx, cy) {
  for (let i = 0; i < playerDeck.length; i++) {
    const dy = 52 + i * 21 + deckScrollY;
    if (cx >= 215 && cx <= 240 && cy >= dy && cy <= dy + 19) {
      playerDeck.splice(i, 1); updateUI(); return;
    }
  }
  const avail = playerCollection.filter(c => !playerDeck.some(d => d.uid === c.uid)).sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < avail.length; i++) {
    const dy = 52 + i * 21 + deckScrollY;
    if (cx >= 560 && cx <= 590 && cy >= dy && cy <= dy + 19 && playerDeck.length < 20) {
      playerDeck.push(avail[i]); updateUI(); return;
    }
  }
}

function handleTradeClick(cx, cy) {
  if (tradePhase === 'done') { tradeOfferPlayer = []; tradeOfferAI = []; tradePhase = 'select'; view = 'menu'; return; }
  if (tradePhase !== 'select') return;
  const pc = playerCollection.filter(c => !tradeOfferPlayer.some(o => o.uid === c.uid));
  const sorted = pc.sort((a, b) => cardValue(b) - cardValue(a));
  for (let i = 0; i < Math.min(sorted.length, 18); i++) {
    const col = i % 6, row = Math.floor(i / 6);
    const cardX = 8 + col * 97, cardY = 58 + row * 48;
    if (cx >= cardX && cx <= cardX + 92 && cy >= cardY && cy <= cardY + 43) {
      if (tradeOfferPlayer.length < 3) { tradeOfferPlayer.push(sorted[i]); tradeOfferAI = []; }
      return;
    }
  }
  for (let i = 0; i < tradeOfferPlayer.length; i++) {
    const cardX = 10 + i * 97;
    if (cx >= cardX + 72 && cx <= cardX + 92 && cy >= 235 && cy <= 267) {
      tradeOfferPlayer.splice(i, 1); tradeOfferAI = []; return;
    }
  }
}

// ── View draw functions ──

function drawMenu(renderer, text) {
  renderer.fillRect(0, 0, W, H, BG);

  renderer.setGlow(PINK, 0.8);
  text.drawText('TRADING CARD MMO', W / 2, 28, 22, PINK, 'center');
  renderer.setGlow(null);

  text.drawText('Collect \u2022 Build \u2022 Battle \u2022 Trade', W / 2, 60, 10, '#777777', 'center');
  text.drawText('Collection: ' + playerCollection.length + ' cards  |  Value: ' + collectionValue(playerCollection), 40, 80, 10, '#aaaaaa', 'left');
  text.drawText('Deck: ' + playerDeck.length + '/20  |  Wins: ' + wins + '  |  Gold: ' + gold, 40, 94, 10, '#aaaaaa', 'left');

  menuButtons = [];
  const bw = 200, bh = 38, bx = W / 2 - bw / 2;
  const items = [
    { label: '\u2694 QUICK BATTLE', action: 'battle', color: '#ff4444' },
    { label: '\u2606 TOURNAMENT', action: 'tournament', color: GOLD },
    { label: '\u25A0 BUY PACK (50g)', action: 'buypack', color: '#44aaff' },
    { label: '\u25CF COLLECTION', action: 'collection', color: '#55ff55' },
    { label: '\u25B2 DECK BUILDER', action: 'deckbuilder', color: '#ffaa44' },
    { label: '\u2660 TRADE', action: 'trade', color: '#aa44ff' },
  ];
  items.forEach((item, i) => {
    const by = 115 + i * 48;
    const hov = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
    const btn = drawBtn(renderer, text, bx, by, bw, bh, item.label, item.color, hov);
    menuButtons.push({ ...btn, action: item.action });
  });

  // Preview cards
  const prev = playerDeck.slice(0, 5);
  for (let i = 0; i < prev.length; i++) {
    drawCard(renderer, text, prev[i], 55 + i * 105, 415, 90, 70, false, true);
  }
}

function drawCollection(renderer, text) {
  renderer.fillRect(0, 0, W, H, BG);
  text.drawText('COLLECTION (' + playerCollection.length + ' cards)', 20, 8, 14, PINK, 'left');
  menuButtons = [];
  const bh = mouseX >= 520 && mouseX <= 590 && mouseY >= 5 && mouseY <= 32;
  menuButtons.push({ ...drawBtn(renderer, text, 520, 5, 70, 27, 'BACK', '#888888', bh), action: 'menu' });

  const sorted = [...playerCollection].sort((a, b) => {
    const ro = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
    return (ro[a.rarity] - ro[b.rarity]) || a.cost - b.cost;
  });
  const cw = 90, ch = 105, gap = 8, cols = 6;
  for (let i = 0; i < sorted.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = 8 + col * (cw + gap);
    const cy = 40 + row * (ch + gap) + collScrollY;
    if (cy + ch < 35 || cy > H) continue;
    const inDeck = playerDeck.some(d => d.uid === sorted[i].uid);
    drawCard(renderer, text, sorted[i], cx, cy, cw, ch, inDeck, true);
    if (inDeck) {
      text.drawText('IN DECK', cx + 3, cy + ch - 10, 7, '#55ff55', 'left');
    }
  }
  if (sorted.length > 24) {
    text.drawText('Scroll to see more', W / 2, H - 8, 9, '#555555', 'center');
  }
}

function drawDeckBuilder(renderer, text) {
  renderer.fillRect(0, 0, W, H, BG);
  text.drawText('DECK BUILDER (' + playerDeck.length + '/20)', 20, 6, 13, PINK, 'left');
  menuButtons = [];
  const bh2 = mouseX >= 520 && mouseX <= 590 && mouseY >= 5 && mouseY <= 30;
  menuButtons.push({ ...drawBtn(renderer, text, 520, 5, 70, 25, 'BACK', '#888888', bh2), action: 'menu' });

  text.drawText('YOUR DECK', 10, 30, 10, '#55ff55', 'left');
  for (let i = 0; i < playerDeck.length; i++) {
    const c = playerDeck[i];
    const dy = 52 + i * 21 + deckScrollY;
    if (dy < 38 || dy > H - 5) continue;
    const rc = RARITY_COLORS[c.rarity];
    const hov = mouseX >= 5 && mouseX <= 238 && mouseY >= dy && mouseY <= dy + 19;
    renderer.fillRect(5, dy, 233, 19, hov ? '#2a2a4e' : '#1a1a2e');
    renderer.drawLine(5, dy, 238, dy, rc, 1);
    renderer.drawLine(5, dy + 19, 238, dy + 19, rc, 1);
    renderer.drawLine(5, dy, 5, dy + 19, rc, 1);
    renderer.drawLine(238, dy, 238, dy + 19, rc, 1);
    text.drawText(c.cost + '\u2666', 9, dy + 4, 9, '#44aaff', 'left');
    text.drawText(c.name, 28, dy + 4, 9, rc, 'left');
    if (c.type === 'Creature') text.drawText(c.atk + '/' + c.def, 185, dy + 4, 9, '#ff5555', 'left');
    text.drawText('X', 222, dy + 4, 9, '#ff4444', 'left');
  }

  text.drawText('AVAILABLE', 255, 30, 10, '#ffaa44', 'left');
  const avail = playerCollection.filter(c => !playerDeck.some(d => d.uid === c.uid));
  const sa = avail.sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < sa.length; i++) {
    const c = sa[i];
    const dy = 52 + i * 21 + deckScrollY;
    if (dy < 38 || dy > H - 5) continue;
    const rc = RARITY_COLORS[c.rarity];
    const hov = mouseX >= 250 && mouseX <= 593 && mouseY >= dy && mouseY <= dy + 19;
    renderer.fillRect(250, dy, 343, 19, hov ? '#2a2a4e' : '#1a1a2e');
    renderer.drawLine(250, dy, 593, dy, rc, 1);
    renderer.drawLine(250, dy + 19, 593, dy + 19, rc, 1);
    renderer.drawLine(250, dy, 250, dy + 19, rc, 1);
    renderer.drawLine(593, dy, 593, dy + 19, rc, 1);
    text.drawText(c.cost + '\u2666', 254, dy + 4, 9, '#44aaff', 'left');
    text.drawText(c.name, 274, dy + 4, 9, rc, 'left');
    if (c.type === 'Creature') text.drawText(c.atk + '/' + c.def, 415, dy + 4, 9, '#ff5555', 'left');
    text.drawText(c.type, 465, dy + 4, 9, '#aaaaaa', 'left');
    if (playerDeck.length < 20) text.drawText('+', 575, dy + 4, 9, '#55ff55', 'left');
  }
}

function drawBattle(renderer, text) {
  if (!battleState) return;
  const bs = battleState;
  renderer.fillRect(0, 0, W, H, BG);

  // AI HP bar
  renderer.fillRect(W - 160, 6, 150, 13, '#333333');
  renderer.fillRect(W - 160, 6, Math.max(0, bs.aiHP / 20) * 150, 13, '#ff4444');
  text.drawText('AI: ' + Math.max(0, bs.aiHP) + '/20', W - 158, 7, 9, '#ffffff', 'left');

  // Player HP bar
  renderer.fillRect(10, H - 20, 150, 13, '#333333');
  renderer.fillRect(10, H - 20, Math.max(0, bs.playerHP / 20) * 150, 13, '#55ff55');
  text.drawText('YOU: ' + Math.max(0, bs.playerHP) + '/20', 12, H - 19, 9, '#ffffff', 'left');

  // Mana & decks
  text.drawText('Mana:' + bs.playerMana + '/' + bs.maxMana, 175, H - 19, 9, '#44aaff', 'left');
  text.drawText('Mana:' + bs.aiMana + '/' + bs.aiMaxMana, 175, 7, 9, '#aa44ff', 'left');
  text.drawText('Deck:' + bs.playerDeckPile.length, 300, H - 19, 9, '#666666', 'left');
  text.drawText('Deck:' + bs.aiDeckPile.length, 300, 7, 9, '#666666', 'left');
  text.drawText(bs.turn === 'player' ? '\u25B6 YOUR TURN' : '\u25B6 AI TURN', 420, H - 19, 10, bs.turn === 'player' ? '#44aaff' : '#ffaa44', 'left');
  text.drawText('Turn ' + bs.turnNum, 420, 7, 9, '#555555', 'left');

  // AI field
  text.drawText('AI FIELD', 10, 22, 9, '#ff5555', 'left');
  for (let i = 0; i < bs.aiField.length; i++) {
    const cx = 10 + i * 100, cy = 38;
    const tgt = bs.attackTarget === i;
    drawCard(renderer, text, bs.aiField[i], cx, cy, 92, 76, tgt, true);
    if (tgt) drawRoundRectStroke(renderer, cx - 1, cy - 1, 94, 78, '#ff4444', 3);
  }

  text.drawText('AI Hand: ' + bs.aiHand.length, 10, 122, 9, '#666666', 'left');

  // Dividers
  renderer.fillRect(0, 134, W, 1, '#333333');

  // Player field
  text.drawText('YOUR FIELD', 10, 144, 9, '#55ff55', 'left');
  for (let i = 0; i < bs.playerField.length; i++) {
    const cx = 10 + i * 100, cy = 158;
    const sel = bs.selectedFieldCard === i;
    drawCard(renderer, text, bs.playerField[i], cx, cy, 92, 76, sel, true);
    if (sel) drawRoundRectStroke(renderer, cx - 1, cy - 1, 94, 78, '#44aaff', 3);
    if (bs.turn === 'player' && bs.playerField[i] && !bs.playerField[i].attacked) {
      text.drawText('\u2694 READY', cx + 24, cy + 66, 7, '#55ff55', 'left');
    }
  }

  renderer.fillRect(0, 247, W, 1, '#333333');

  // Player hand
  text.drawText('YOUR HAND', 10, 256, 9, PINK, 'left');
  const hw = Math.min(95, (W - 20) / Math.max(1, bs.playerHand.length));
  for (let i = 0; i < bs.playerHand.length; i++) {
    const cx = 10 + i * hw, cy = 270;
    const canPlay = bs.playerHand[i].cost <= bs.playerMana && bs.turn === 'player';
    drawCard(renderer, text, bs.playerHand[i], cx, cy, hw - 4, 95, canPlay, true);
    if (!canPlay) {
      renderer.fillRect(cx, cy, hw - 4, 95, '#00000073');
    }
  }

  // Message and log
  text.drawText(bs.msg, 10, 372, 10, '#eeee88', 'left');
  const ls = Math.max(0, battleLog.length - 4);
  for (let i = ls; i < battleLog.length; i++) {
    text.drawText(battleLog[i], 10, 385 + (i - ls) * 11, 8, '#555555', 'left');
  }

  menuButtons = [];
  if (bs.turn === 'player' && !bs.gameOver) {
    const eh = mouseX >= 460 && mouseX <= 590 && mouseY >= 440 && mouseY <= 468;
    menuButtons.push({ ...drawBtn(renderer, text, 460, 440, 130, 28, 'END TURN', '#ffaa44', eh), action: 'endturn' });
  }

  // Game over overlay
  if (bs.gameOver) {
    renderer.fillRect(0, 0, W, H, '#1a1a2ed9');
    const col = bs.winner === 'player' ? '#55ff55' : '#ff4444';
    const msg = bs.winner === 'player' ? 'VICTORY!' : 'DEFEAT!';
    renderer.setGlow(col, 1.0);
    text.drawText(msg, W / 2, H / 2 - 26, 28, col, 'center');
    renderer.setGlow(null);
    text.drawText('Click to continue', W / 2, H / 2 + 10, 12, '#aaaaaa', 'center');
  }
}

function drawPackOpen(renderer, text) {
  renderer.fillRect(0, 0, W, H, BG);

  renderer.setGlow(GOLD, 0.8);
  text.drawText('BOOSTER PACK!', W / 2, 26, 20, GOLD, 'center');
  renderer.setGlow(null);

  menuButtons = [];
  if (packRevealIdx < 0) {
    drawRoundRectFill(renderer, W / 2 - 60, 100, 120, 180, '#2a1a3e');
    renderer.setGlow(GOLD, 0.7);
    drawRoundRectStroke(renderer, W / 2 - 60, 100, 120, 180, GOLD, 2);
    renderer.setGlow(null);
    text.drawText('?', W / 2, 185, 36, GOLD, 'center');
    text.drawText('Click to open!', W / 2, 308, 12, '#aaaaaa', 'center');
    menuButtons.push({ x: W / 2 - 60, y: 100, w: 120, h: 180, action: 'openpack' });
  } else {
    for (let i = 0; i < packCards.length; i++) {
      const cx = 80 + i * 160, cy = 90;
      if (i <= packRevealIdx) {
        const rc = RARITY_COLORS[packCards[i].rarity];
        renderer.setGlow(rc, 0.9);
        drawCard(renderer, text, packCards[i], cx, cy, 130, 190, true, false);
        renderer.setGlow(null);
        text.drawText(packCards[i].rarity, cx + 35, cy + 198, 11, rc, 'left');
      } else {
        drawRoundRectFill(renderer, cx, cy, 130, 190, '#2a1a3e');
        drawRoundRectStroke(renderer, cx, cy, 130, 190, '#555555', 1.5);
        text.drawText('?', cx + 52, cy + 95, 32, '#555555', 'left');
      }
    }
    if (packRevealIdx < packCards.length - 1) {
      text.drawText('Click to reveal next', W / 2, 360, 12, '#aaaaaa', 'center');
      menuButtons.push({ x: 0, y: 0, w: W, h: H, action: 'revealnext' });
    } else {
      text.drawText('Cards added to collection!', W / 2, 360, 12, '#55ff55', 'center');
      const ch2 = mouseX >= W / 2 - 60 && mouseX <= W / 2 + 60 && mouseY >= 390 && mouseY <= 425;
      menuButtons.push({ ...drawBtn(renderer, text, W / 2 - 60, 390, 120, 35, 'CONTINUE', PINK, ch2), action: 'packcontinue' });
    }
  }
}

function drawTournament(renderer, text) {
  if (!tournamentState) return;
  const ts = tournamentState;
  renderer.fillRect(0, 0, W, H, BG);

  renderer.setGlow(GOLD, 0.8);
  text.drawText('\u2606 TOURNAMENT', W / 2, 18, 20, GOLD, 'center');
  renderer.setGlow(null);

  menuButtons = [];
  const oppNames = ['Novice Collector', 'Card Trader', 'Deck Master', 'Grand Champion'];
  for (let i = 0; i < ts.maxRounds; i++) {
    const y = 55 + i * 90;
    const isCur = i === ts.round - 1;
    const isPast = i < ts.round - 1;
    const rc = isPast ? '#55ff55' : (isCur ? GOLD : '#444444');
    text.drawText('Round ' + (i + 1) + (isPast ? ' \u2714' : ''), 40, y, 13, rc, 'left');
    text.drawText('vs ' + oppNames[i], 40, y + 16, 11, '#aaaaaa', 'left');
    text.drawText('Reward: ' + ts.rewards[i] + 'g + Pack', 40, y + 30, 10, '#44aaff', 'left');
    if (isPast) {
      text.drawText(ts.results[i] ? 'WON' : 'LOST', 350, y + 10, 12, ts.results[i] ? '#55ff55' : '#ff4444', 'left');
    }
    if (isCur && !ts.eliminated) {
      const fh = mouseX >= 350 && mouseX <= 500 && mouseY >= y - 5 && mouseY <= y + 30;
      menuButtons.push({ ...drawBtn(renderer, text, 350, y - 5, 150, 35, '\u2694 FIGHT!', '#ff4444', fh), action: 'tournfight', round: i });
    }
  }
  if (ts.eliminated) {
    text.drawText('ELIMINATED!', W / 2, 422, 16, '#ff4444', 'center');
    text.drawText('Better luck next time.', W / 2, 444, 10, '#888888', 'center');
    const bh2 = mouseX >= W / 2 - 50 && mouseX <= W / 2 + 50 && mouseY >= 455 && mouseY <= 483;
    menuButtons.push({ ...drawBtn(renderer, text, W / 2 - 50, 455, 100, 28, 'BACK', '#888888', bh2), action: 'menu' });
  } else if (ts.round > ts.maxRounds) {
    renderer.setGlow(GOLD, 1.0);
    text.drawText('CHAMPION!', W / 2, 422, 20, GOLD, 'center');
    renderer.setGlow(null);
    const bh2 = mouseX >= W / 2 - 50 && mouseX <= W / 2 + 50 && mouseY >= 455 && mouseY <= 483;
    menuButtons.push({ ...drawBtn(renderer, text, W / 2 - 50, 455, 100, 28, 'BACK', GOLD, bh2), action: 'menu' });
  }
  const bh3 = mouseX >= 10 && mouseX <= 80 && mouseY >= 458 && mouseY <= 483;
  menuButtons.push({ ...drawBtn(renderer, text, 10, 458, 70, 25, 'BACK', '#666666', bh3), action: 'menu' });
}

function drawTrade(renderer, text) {
  renderer.fillRect(0, 0, W, H, BG);
  text.drawText('\u2660 TRADE WITH AI', 20, 8, 14, '#aa44ff', 'left');
  menuButtons = [];
  const bh2 = mouseX >= 520 && mouseX <= 590 && mouseY >= 5 && mouseY <= 30;
  menuButtons.push({ ...drawBtn(renderer, text, 520, 5, 70, 25, 'BACK', '#888888', bh2), action: 'menu' });

  if (tradePhase === 'select') {
    text.drawText('YOUR CARDS (click to offer):', 10, 38, 9, PINK, 'left');
    const pc = playerCollection.filter(c => !tradeOfferPlayer.some(o => o.uid === c.uid));
    const sorted = pc.sort((a, b) => cardValue(b) - cardValue(a));
    for (let i = 0; i < Math.min(sorted.length, 18); i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const cx = 8 + col * 97, cy = 48 + row * 48;
      const rc = RARITY_COLORS[sorted[i].rarity];
      const hov = mouseX >= cx && mouseX <= cx + 92 && mouseY >= cy && mouseY <= cy + 43;
      drawRoundRectFill(renderer, cx, cy, 92, 43, hov ? '#2a2a4e' : '#1e1e38');
      drawRoundRectStroke(renderer, cx, cy, 92, 43, rc, 1.5);
      text.drawText(sorted[i].name, cx + 3, cy + 4, 8, rc, 'left');
      text.drawText(sorted[i].cost + '\u2666 Val:' + cardValue(sorted[i]), cx + 3, cy + 16, 7, '#44aaff', 'left');
      text.drawText(sorted[i].type, cx + 3, cy + 28, 7, '#888888', 'left');
    }

    renderer.fillRect(0, 202, W, 1, '#333333');

    const offerVal = tradeOfferPlayer.reduce((s, c) => s + cardValue(c), 0);
    text.drawText('YOUR OFFER (val: ' + offerVal + '):', 10, 216, 9, '#55ff55', 'left');
    for (let i = 0; i < tradeOfferPlayer.length; i++) {
      const cx = 10 + i * 97;
      drawRoundRectFill(renderer, cx, 226, 92, 32, '#1a2a1a');
      drawRoundRectStroke(renderer, cx, 226, 92, 32, RARITY_COLORS[tradeOfferPlayer[i].rarity], 1.5);
      text.drawText(tradeOfferPlayer[i].name, cx + 3, 230, 8, RARITY_COLORS[tradeOfferPlayer[i].rarity], 'left');
      text.drawText('X', cx + 80, 240, 8, '#ff4444', 'left');
    }

    renderer.fillRect(0, 272, W, 1, '#333333');

    const aiOfferVal = tradeOfferAI.reduce((s, c) => s + cardValue(c), 0);
    text.drawText('AI OFFERS (val: ' + aiOfferVal + '):', 10, 287, 9, '#ffaa44', 'left');

    if (tradeOfferPlayer.length > 0 && tradeOfferAI.length === 0) generateAITradeOffer();

    for (let i = 0; i < tradeOfferAI.length; i++) {
      const cx = 10 + i * 97;
      drawRoundRectFill(renderer, cx, 296, 92, 43, '#1a1a2a');
      drawRoundRectStroke(renderer, cx, 296, 92, 43, RARITY_COLORS[tradeOfferAI[i].rarity], 1.5);
      text.drawText(tradeOfferAI[i].name, cx + 3, 300, 8, RARITY_COLORS[tradeOfferAI[i].rarity], 'left');
      text.drawText('Val:' + cardValue(tradeOfferAI[i]), cx + 3, 326, 7, '#44aaff', 'left');
    }

    if (tradeOfferPlayer.length > 0 && tradeOfferAI.length > 0) {
      const ah = mouseX >= 160 && mouseX <= 290 && mouseY >= 372 && mouseY <= 407;
      menuButtons.push({ ...drawBtn(renderer, text, 160, 372, 130, 35, 'ACCEPT', '#55ff55', ah), action: 'tradeaccept' });
      const dh = mouseX >= 310 && mouseX <= 440 && mouseY >= 372 && mouseY <= 407;
      menuButtons.push({ ...drawBtn(renderer, text, 310, 372, 130, 35, 'DECLINE', '#ff4444', dh), action: 'tradedecline' });
    }
    text.drawText('Select cards to trade. AI will counter-offer.', 10, 462, 8, '#555555', 'left');
  } else if (tradePhase === 'done') {
    text.drawText('Trade Complete!', W / 2, H / 2 - 12, 18, '#55ff55', 'center');
    text.drawText('Click to continue', W / 2, H / 2 + 14, 11, '#aaaaaa', 'center');
  }
}

// ── createGame export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0; wins = 0; gold = 100;
    playerCollection = makeStarterDeck();
    playerDeck = playerCollection.slice(0, 20);
    aiCollection = makeAICollection();
    aiDeck = aiBuildDeck(aiCollection);
    view = 'menu';
    battleState = null;
    tournamentState = null;
    packCards = [];
    tradeOfferPlayer = [];
    tradeOfferAI = [];
    tradePhase = 'select';
    menuButtons = [];
    battleLog = [];
    updateUI();
    game.showOverlay('TRADING CARD MMO', 'Click anywhere to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse tracking — direct canvas listener per engine pattern
  game.canvas.addEventListener('mousemove', e => {
    const r = game.canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) * (W / r.width);
    mouseY = (e.clientY - r.top) * (H / r.height);
  });

  game.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (view === 'collection') { collScrollY -= e.deltaY * 0.5; collScrollY = Math.min(0, collScrollY); }
    else if (view === 'deckbuilder') { deckScrollY -= e.deltaY * 0.5; deckScrollY = Math.min(0, deckScrollY); }
  }, { passive: false });

  game.canvas.addEventListener('click', e => {
    const r = game.canvas.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (W / r.width);
    const cy = (e.clientY - r.top) * (H / r.height);

    if (game.state === 'waiting') {
      score = 0; wins = 0; gold = 100;
      playerCollection = makeStarterDeck();
      playerDeck = playerCollection.slice(0, 20);
      aiCollection = makeAICollection();
      aiDeck = aiBuildDeck(aiCollection);
      view = 'menu';
      battleState = null;
      tournamentState = null;
      packCards = [];
      tradeOfferPlayer = [];
      tradeOfferAI = [];
      tradePhase = 'select';
      battleLog = [];
      updateUI();
      game.setState('playing');
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    for (const btn of menuButtons) {
      if (inRect(cx, cy, btn)) { handleAction(btn.action, btn, game); return; }
    }
    if (view === 'battle') handleBattleClick(cx, cy);
    else if (view === 'deckbuilder') handleDeckBuilderClick(cx, cy);
    else if (view === 'trade') handleTradeClick(cx, cy);
    else if (view === 'packopen' && tradePhase === 'done') { tradePhase = 'select'; view = 'menu'; }
  });

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;
    if (view === 'battle' && battleState) {
      if (battleState.aiThinking) {
        battleState.aiThinkTimer--;
        if (battleState.aiThinkTimer <= 0) { battleState.aiThinking = false; aiTurn(); }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state !== 'playing') return;
    switch (view) {
      case 'menu': drawMenu(renderer, text); break;
      case 'collection': drawCollection(renderer, text); break;
      case 'deckbuilder': drawDeckBuilder(renderer, text); break;
      case 'battle': drawBattle(renderer, text); break;
      case 'packopen': drawPackOpen(renderer, text); break;
      case 'tournament': drawTournament(renderer, text); break;
      case 'trade': drawTrade(renderer, text); break;
    }
  };

  game.start();
  return game;
}
