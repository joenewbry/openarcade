// mahjong-competitive/game.js — Mahjong Competitive for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// Tile dimensions
const TW = 30, TH = 40;
const TSW = 20, TSH = 28;

// ========== TILE SYSTEM ==========
const SUITS = ['m', 'p', 's'];
const WIND_KANJI = ['\u6771', '\u5357', '\u897F', '\u5317'];
const DRAGON_KANJI = ['\u767D', '\u767C', '\u4E2D'];
const WIND_NAMES = ['East', 'South', 'West', 'North'];

function parseTile(t) {
  if (t[0] === 'w') return { type: 'wind', num: parseInt(t[1]), suit: 'z' };
  if (t[0] === 'd') return { type: 'dragon', num: parseInt(t[1]), suit: 'z' };
  return { type: 'suit', suit: t[0], num: parseInt(t[1]) };
}

function tileSort(a, b) {
  const pa = parseTile(a), pb = parseTile(b);
  const order = { m: 0, p: 1, s: 2, z: 3 };
  const sa = pa.suit || 'z', sb = pb.suit || 'z';
  if (order[sa] !== order[sb]) return order[sa] - order[sb];
  const typeOrd = { suit: 0, wind: 1, dragon: 2 };
  if (pa.type !== pb.type) return typeOrd[pa.type] - typeOrd[pb.type];
  return pa.num - pb.num;
}

function buildWall() {
  let wall = [];
  for (let s of SUITS) for (let n = 1; n <= 9; n++) for (let c = 0; c < 4; c++) wall.push(s + n);
  for (let n = 1; n <= 4; n++) for (let c = 0; c < 4; c++) wall.push('w' + n);
  for (let n = 1; n <= 3; n++) for (let c = 0; c < 4; c++) wall.push('d' + n);
  for (let i = wall.length - 1; i > 0; i--) {
    let j = Math.random() * (i + 1) | 0;
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

// ========== GAME STATE ==========
let wall = [], deadWall = [];
let players = [];
let currentTurn = 0;
let roundWind = 0;
let handNum = 0;
let turnPhase = '';
let callOptions = [];
let callButtons = [];
let pendingAiCall = null;
let discardSeat = -1;
let selectedTile = -1;
let hoveredTile = -1;
let message = '';
let messageTimer = 0;
let riichiSticks = 0;
let doraIndicators = [];
let pendingRiichi = false;
let score = 25000;

// DOM refs
const scoreEl = document.getElementById('score');
const roundInfoEl = document.getElementById('roundInfo');
const wallCountEl = document.getElementById('wallCount');

const SEAT_NAMES = ['You', 'West AI', 'North AI', 'East AI'];
const SEAT_WIND = (seat) => (seat + (4 - handNum)) % 4;

function initPlayer(seat) {
  return {
    seat, hand: [], discards: [], melds: [],
    riichi: false, riichiTurn: -1, points: 25000
  };
}

function updateUI() {
  score = players[0].points;
  if (scoreEl) scoreEl.textContent = score;
  if (roundInfoEl) roundInfoEl.textContent = (roundWind === 0 ? 'E' : 'S') + (handNum + 1);
  if (wallCountEl) wallCountEl.textContent = wall.length;
}

function showMessage(msg) { message = msg; messageTimer = 150; }

// ========== HAND EVALUATION ==========
function countTiles(hand) {
  let c = {};
  for (let t of hand) c[t] = (c[t] || 0) + 1;
  return c;
}

function canWin(hand) {
  if (hand.length < 14) return false;
  let counts = countTiles(hand);
  // Seven pairs
  if (hand.length === 14) {
    let allPairs = Object.values(counts).every(v => v === 2 || v === 4);
    if (allPairs && Object.keys(counts).length + Object.values(counts).filter(v => v === 4).length >= 7) {
      return true;
    }
  }
  // Standard form
  let tiles = Object.keys(counts);
  for (let pair of tiles) {
    if (counts[pair] < 2) continue;
    let rem = { ...counts };
    rem[pair] -= 2;
    if (rem[pair] === 0) delete rem[pair];
    if (canFormSets(rem)) return true;
  }
  return false;
}

function canFormSets(counts) {
  let keys = Object.keys(counts).filter(k => counts[k] > 0).sort(tileSort);
  if (keys.length === 0) return true;
  let first = keys[0];
  let p = parseTile(first);
  if (counts[first] >= 3) {
    let rem = { ...counts };
    rem[first] -= 3;
    if (rem[first] === 0) delete rem[first];
    if (canFormSets(rem)) return true;
  }
  if (p.type === 'suit' && p.num <= 7) {
    let t2 = p.suit + (p.num + 1), t3 = p.suit + (p.num + 2);
    if (counts[t2] > 0 && counts[t3] > 0) {
      let rem = { ...counts };
      rem[first]--; if (rem[first] === 0) delete rem[first];
      rem[t2]--; if (rem[t2] === 0) delete rem[t2];
      rem[t3]--; if (rem[t3] === 0) delete rem[t3];
      if (canFormSets(rem)) return true;
    }
  }
  return false;
}

function getWaits(hand) {
  let waits = [];
  let allTileTypes = [];
  for (let s of SUITS) for (let n = 1; n <= 9; n++) allTileTypes.push(s + n);
  for (let n = 1; n <= 4; n++) allTileTypes.push('w' + n);
  for (let n = 1; n <= 3; n++) allTileTypes.push('d' + n);
  for (let t of allTileTypes) {
    let test = [...hand, t];
    if (canWin(test)) waits.push(t);
  }
  return waits;
}

function isTenpai(hand) {
  return getWaits(hand).length > 0;
}

function getShantenSimple(hand) {
  let counts = countTiles(hand);
  let groups = 0, partials = 0, pairs = 0;
  let used = {};
  for (let t of Object.keys(counts)) {
    let avail = counts[t] - (used[t] || 0);
    if (avail >= 3) { groups++; used[t] = (used[t] || 0) + 3; }
  }
  for (let s of SUITS) {
    for (let n = 1; n <= 7; n++) {
      let t1 = s + n, t2 = s + (n + 1), t3 = s + (n + 2);
      let a1 = (counts[t1] || 0) - (used[t1] || 0);
      let a2 = (counts[t2] || 0) - (used[t2] || 0);
      let a3 = (counts[t3] || 0) - (used[t3] || 0);
      if (a1 > 0 && a2 > 0 && a3 > 0) {
        groups++;
        used[t1] = (used[t1] || 0) + 1;
        used[t2] = (used[t2] || 0) + 1;
        used[t3] = (used[t3] || 0) + 1;
      }
    }
  }
  for (let t of Object.keys(counts)) {
    let rem = (counts[t] || 0) - (used[t] || 0);
    if (rem >= 2) pairs++;
  }
  for (let s of SUITS) {
    for (let n = 1; n <= 8; n++) {
      let t1 = s + n, t2 = s + (n + 1);
      let a1 = (counts[t1] || 0) - (used[t1] || 0);
      let a2 = (counts[t2] || 0) - (used[t2] || 0);
      if (a1 > 0 && a2 > 0) partials++;
    }
  }
  let needed = 4;
  let sh = (needed - groups) * 2 - Math.min(partials + pairs, needed - groups) - (pairs > 0 ? 1 : 0);
  return Math.max(sh, -1);
}

// ========== SCORING ==========
function countFan(hand, melds, winTile, isTsumo, seatWind, rndWind, isRiichi) {
  let fan = 0;
  let allTiles = [...hand];
  for (let m of melds) allTiles.push(...m.tiles);
  let counts = countTiles(allTiles);
  let isConcealed = melds.every(m => !m.open);

  if (isRiichi) fan += 1;
  if (isTsumo && isConcealed && melds.length === 0) fan += 1;

  if (allTiles.every(t => {
    let p = parseTile(t);
    return p.type === 'suit' && p.num >= 2 && p.num <= 8;
  })) fan += 1;

  let swt = 'w' + (seatWind + 1);
  let rwt = 'w' + (rndWind + 1);
  if ((counts[swt] || 0) >= 3) fan += 1;
  if ((counts[rwt] || 0) >= 3) fan += 1;
  for (let d = 1; d <= 3; d++) if ((counts['d' + d] || 0) >= 3) fan += 1;

  let spCheck = Object.values(counts);
  if (hand.length === 14 && isConcealed && spCheck.every(v => v === 2 || v === 4) &&
    Object.keys(counts).length + spCheck.filter(v => v === 4).length >= 7) {
    fan += 2;
  }

  let suits = new Set(), hasHonor = false;
  for (let t of allTiles) {
    let p = parseTile(t);
    if (p.type === 'suit') suits.add(p.suit); else hasHonor = true;
  }
  if (suits.size === 1 && hasHonor) fan += (isConcealed ? 3 : 2);
  if (suits.size === 1 && !hasHonor) fan += (isConcealed ? 6 : 5);
  if (suits.size === 0) fan += 4;

  if (fan === 0) fan = 1;
  return fan;
}

function fanToPoints(fan, isDealer) {
  let base;
  if (fan >= 13) base = 8000;
  else if (fan >= 11) base = 6000;
  else if (fan >= 8) base = 4000;
  else if (fan >= 6) base = 3000;
  else if (fan >= 5) base = 2000;
  else if (fan >= 4) base = 2000;
  else if (fan === 3) base = 1000;
  else if (fan === 2) base = 700;
  else base = 400;
  return isDealer ? base * 6 : base * 4;
}

// ========== AI LOGIC ==========
function aiEvalDiscard(seat) {
  let p = players[seat];
  let hand = p.hand;
  if (p.riichi) return hand.length - 1;

  let bestIdx = 0, bestScore = -9999;
  for (let i = 0; i < hand.length; i++) {
    let test = hand.filter((_, j) => j !== i);
    let sc = 0;
    let waits = getWaits(test);
    sc += waits.length * 12;

    let tp = parseTile(hand[i]);
    let cnt = hand.filter(t => t === hand[i]).length;
    if (cnt >= 3) sc -= 30;
    if (cnt >= 2) sc -= 15;
    if (tp.type !== 'suit' && cnt === 1) sc += 5;
    if (tp.type === 'suit' && (tp.num === 1 || tp.num === 9) && cnt === 1) sc += 3;

    let discardedCount = 0;
    for (let pl of players) discardedCount += pl.discards.filter(t => t === hand[i]).length;
    sc += discardedCount * 2;
    sc -= getShantenSimple(test) * 8;

    if (sc > bestScore) { bestScore = sc; bestIdx = i; }
  }
  return bestIdx;
}

function aiShouldCall(seat, tile, fromSeat) {
  let p = players[seat];
  if (p.riichi) return null;
  let hand = p.hand;
  let counts = countTiles(hand);

  if (canWin([...hand, tile])) return { type: 'ron' };

  if ((counts[tile] || 0) >= 2) {
    let curSh = getShantenSimple(hand);
    let removed = 0;
    let nh = hand.filter(t => { if (t === tile && removed < 2) { removed++; return false; } return true; });
    let newSh = getShantenSimple(nh);
    if (newSh < curSh || (newSh <= 1 && Math.random() < 0.5)) {
      return { type: 'pon' };
    }
  }

  if (fromSeat === (seat + 3) % 4) {
    let tp = parseTile(tile);
    if (tp.type === 'suit') {
      let curSh = getShantenSimple(hand);
      let combos = [];
      if (tp.num >= 3 && (counts[tp.suit + (tp.num - 2)] || 0) > 0 && (counts[tp.suit + (tp.num - 1)] || 0) > 0) {
        combos.push([tp.suit + (tp.num - 2), tp.suit + (tp.num - 1), tile]);
      }
      if (tp.num >= 2 && tp.num <= 8 && (counts[tp.suit + (tp.num - 1)] || 0) > 0 && (counts[tp.suit + (tp.num + 1)] || 0) > 0) {
        combos.push([tp.suit + (tp.num - 1), tile, tp.suit + (tp.num + 1)]);
      }
      if (tp.num <= 7 && (counts[tp.suit + (tp.num + 1)] || 0) > 0 && (counts[tp.suit + (tp.num + 2)] || 0) > 0) {
        combos.push([tile, tp.suit + (tp.num + 1), tp.suit + (tp.num + 2)]);
      }
      for (let combo of combos) {
        let nh = [...hand];
        for (let ct of combo) {
          if (ct !== tile) {
            let idx = nh.indexOf(ct);
            if (idx >= 0) nh.splice(idx, 1);
          }
        }
        let newSh = getShantenSimple(nh);
        if (newSh < curSh) return { type: 'chi', combo: combo.sort(tileSort) };
      }
    }
  }
  return null;
}

// ========== GAME FLOW ==========
// gameRef is set in createGame so flow functions can call game methods
let gameRef = null;

function dealHand() {
  wall = buildWall();
  deadWall = wall.splice(0, 14);
  doraIndicators = [deadWall[0]];
  players = [initPlayer(0), initPlayer(1), initPlayer(2), initPlayer(3)];
  for (let i = 0; i < 4; i++) {
    players[i].hand = wall.splice(0, 13).sort(tileSort);
    players[i].points = (i === 0) ? score : players[i].points;
  }
  currentTurn = handNum;
  turnPhase = 'draw';
  callOptions = [];
  callButtons = [];
  pendingAiCall = null;
  discardSeat = -1;
  selectedTile = -1;
  hoveredTile = -1;
  riichiSticks = 0;
  pendingRiichi = false;
  message = '';
  messageTimer = 0;
  updateUI();
}

function drawTileFromWall() {
  if (wall.length === 0) { endHandDraw(); return; }
  let tile = wall.shift();
  let p = players[currentTurn];
  p.hand.push(tile);
  p.hand.sort(tileSort);

  if (canWin(p.hand)) {
    if (currentTurn === 0) {
      callOptions = [{ type: 'tsumo', seat: 0 }];
      callButtons = [
        { label: 'TSUMO', x: 220, y: 300, w: 80, h: 30, action: 'tsumo' },
        { label: 'PASS', x: 310, y: 300, w: 80, h: 30, action: 'pass_tsumo' }
      ];
      turnPhase = 'call';
      return;
    } else {
      declareTsumo(currentTurn);
      return;
    }
  }

  if (currentTurn !== 0) {
    let p2 = players[currentTurn];
    if (!p2.riichi && !p2.melds.some(m => m.open) && p2.points >= 1000) {
      for (let i = 0; i < p2.hand.length; i++) {
        let test = p2.hand.filter((_, j) => j !== i);
        if (isTenpai(test)) {
          p2.riichi = true;
          p2.riichiTurn = p2.discards.length;
          p2.points -= 1000;
          riichiSticks++;
          showMessage(SEAT_NAMES[currentTurn] + ' declares RIICHI!');
          break;
        }
      }
    }
  }

  if (currentTurn === 0) {
    turnPhase = 'discard';
  } else {
    setTimeout(() => {
      if (!gameRef || gameRef.state !== 'playing') return;
      let idx = aiEvalDiscard(currentTurn);
      doDiscard(currentTurn, idx);
    }, 400 + Math.random() * 400);
  }
  updateUI();
}

function doDiscard(seat, tileIdx) {
  let p = players[seat];
  if (tileIdx < 0 || tileIdx >= p.hand.length) return;
  let tile = p.hand.splice(tileIdx, 1)[0];
  p.discards.push(tile);
  discardSeat = seat;

  let calls = [];
  for (let i = 0; i < 4; i++) {
    if (i === seat) continue;
    if (players[i].riichi) {
      if (canWin([...players[i].hand, tile])) {
        calls.push({ type: 'ron', seat: i, tile, priority: 3 });
      }
      continue;
    }
    if (canWin([...players[i].hand, tile])) {
      calls.push({ type: 'ron', seat: i, tile, priority: 3 });
    }
    let cnt = players[i].hand.filter(t => t === tile).length;
    if (cnt >= 2) {
      calls.push({ type: 'pon', seat: i, tile, priority: 2 });
    }
    if (i === (seat + 1) % 4) {
      let tp = parseTile(tile);
      if (tp.type === 'suit') {
        let hc = countTiles(players[i].hand);
        if (tp.num >= 3 && (hc[tp.suit + (tp.num - 2)] || 0) > 0 && (hc[tp.suit + (tp.num - 1)] || 0) > 0)
          calls.push({ type: 'chi', seat: i, tile, priority: 1, combo: [tp.suit + (tp.num - 2), tp.suit + (tp.num - 1), tile] });
        if (tp.num >= 2 && tp.num <= 8 && (hc[tp.suit + (tp.num - 1)] || 0) > 0 && (hc[tp.suit + (tp.num + 1)] || 0) > 0)
          calls.push({ type: 'chi', seat: i, tile, priority: 1, combo: [tp.suit + (tp.num - 1), tile, tp.suit + (tp.num + 1)] });
        if (tp.num <= 7 && (hc[tp.suit + (tp.num + 1)] || 0) > 0 && (hc[tp.suit + (tp.num + 2)] || 0) > 0)
          calls.push({ type: 'chi', seat: i, tile, priority: 1, combo: [tile, tp.suit + (tp.num + 1), tp.suit + (tp.num + 2)] });
      }
    }
  }

  if (calls.length > 0) {
    calls.sort((a, b) => b.priority - a.priority);
    let humanCalls = calls.filter(c => c.seat === 0);
    let aiCalls = calls.filter(c => c.seat !== 0);

    let bestAi = null;
    for (let ac of aiCalls) {
      let decision = aiShouldCall(ac.seat, tile, seat);
      if (decision) {
        if (!bestAi || ac.priority > bestAi.priority) {
          bestAi = { ...ac, decision };
        }
      }
    }

    if (humanCalls.length > 0) {
      callOptions = humanCalls;
      callButtons = [];
      pendingAiCall = bestAi;
      let bx = 140;
      let seenTypes = new Set();
      for (let hc of humanCalls) {
        if (seenTypes.has(hc.type)) continue;
        seenTypes.add(hc.type);
        callButtons.push({ label: hc.type.toUpperCase(), x: bx, y: 300, w: 80, h: 30, action: hc.type, data: hc });
        bx += 90;
      }
      callButtons.push({ label: 'PASS', x: bx, y: 300, w: 80, h: 30, action: 'pass' });
      turnPhase = 'call';
      return;
    }

    if (bestAi) {
      setTimeout(() => {
        if (!gameRef || gameRef.state !== 'playing') return;
        executeCall(bestAi.seat, bestAi.decision || bestAi, tile, seat);
      }, 400);
      return;
    }
  }

  nextTurn();
}

function executeCall(seat, call, tile, fromSeat) {
  let p = players[seat];
  if (call.type === 'ron') {
    p.hand.push(tile);
    let dIdx = players[fromSeat].discards.lastIndexOf(tile);
    if (dIdx >= 0) players[fromSeat].discards.splice(dIdx, 1);
    declareWin(seat, fromSeat, false);
    return;
  }
  if (call.type === 'pon') {
    let dIdx = players[fromSeat].discards.lastIndexOf(tile);
    if (dIdx >= 0) players[fromSeat].discards.splice(dIdx, 1);
    let removed = 0;
    p.hand = p.hand.filter(t => { if (t === tile && removed < 2) { removed++; return false; } return true; });
    p.melds.push({ type: 'pon', tiles: [tile, tile, tile], open: true });
    currentTurn = seat;
    showMessage(SEAT_NAMES[seat] + ' calls PON!');
    if (seat === 0) {
      turnPhase = 'discard';
    } else {
      setTimeout(() => {
        if (!gameRef || gameRef.state !== 'playing') return;
        let idx = aiEvalDiscard(seat);
        doDiscard(seat, idx);
      }, 500);
    }
    updateUI();
    return;
  }
  if (call.type === 'chi') {
    let dIdx = players[fromSeat].discards.lastIndexOf(tile);
    if (dIdx >= 0) players[fromSeat].discards.splice(dIdx, 1);
    let combo = call.combo || call.tiles || [];
    for (let ct of combo) {
      if (ct !== tile) {
        let idx = p.hand.indexOf(ct);
        if (idx >= 0) p.hand.splice(idx, 1);
      }
    }
    p.melds.push({ type: 'chi', tiles: combo.sort(tileSort), open: true });
    currentTurn = seat;
    showMessage(SEAT_NAMES[seat] + ' calls CHI!');
    if (seat === 0) {
      turnPhase = 'discard';
    } else {
      setTimeout(() => {
        if (!gameRef || gameRef.state !== 'playing') return;
        let idx = aiEvalDiscard(seat);
        doDiscard(seat, idx);
      }, 500);
    }
    updateUI();
    return;
  }
}

function declareTsumo(seat) {
  declareWin(seat, seat, true);
}

function declareWin(seat, fromSeat, isTsumo) {
  let p = players[seat];
  let sw = SEAT_WIND(seat);
  let isDealer = (seat === handNum);
  let fan = countFan(p.hand, p.melds, null, isTsumo, sw, roundWind, p.riichi);
  let pts = fanToPoints(fan, isDealer) + riichiSticks * 1000;

  if (isTsumo) {
    showMessage(SEAT_NAMES[seat] + ' TSUMO! +' + pts + 'pts (' + fan + ' fan)');
    let eachPay = Math.ceil(pts / 3 / 100) * 100;
    for (let i = 0; i < 4; i++) {
      if (i === seat) continue;
      let pay = isDealer ? eachPay : (i === handNum ? Math.ceil(pts / 2 / 100) * 100 : Math.ceil(pts / 4 / 100) * 100);
      players[i].points -= pay;
    }
    p.points += pts;
  } else {
    showMessage(SEAT_NAMES[seat] + ' RON from ' + SEAT_NAMES[fromSeat] + '! +' + pts + 'pts (' + fan + ' fan)');
    players[fromSeat].points -= pts;
    p.points += pts;
  }

  score = players[0].points;
  turnPhase = 'done';
  riichiSticks = 0;
  updateUI();

  setTimeout(() => {
    if (!gameRef || gameRef.state !== 'playing') return;
    endHand(seat === handNum);
  }, 2500);
}

function endHandDraw() {
  showMessage('Exhaustive draw!');
  turnPhase = 'done';
  let tenpaiPlayers = [];
  for (let i = 0; i < 4; i++) {
    if (isTenpai(players[i].hand)) tenpaiPlayers.push(i);
  }
  if (tenpaiPlayers.length > 0 && tenpaiPlayers.length < 4) {
    let total = 3000;
    for (let i = 0; i < 4; i++) {
      if (tenpaiPlayers.includes(i)) {
        players[i].points += Math.floor(total / tenpaiPlayers.length);
      } else {
        players[i].points -= Math.floor(total / (4 - tenpaiPlayers.length));
      }
    }
  }
  score = players[0].points;
  updateUI();
  setTimeout(() => {
    if (!gameRef || gameRef.state !== 'playing') return;
    endHand(tenpaiPlayers.includes(handNum));
  }, 2000);
}

function endHand(dealerWon) {
  if (!dealerWon) {
    handNum = (handNum + 1) % 4;
    if (handNum === 0) {
      roundWind++;
      if (roundWind >= 2) { endGame(); return; }
    }
  }
  updateUI();
  dealHand();
  turnPhase = 'draw';
  drawTileFromWall();
}

function endGame() {
  let sorted = [...players].sort((a, b) => b.points - a.points);
  let winnerSeat = sorted[0].seat;
  let title = winnerSeat === 0 ? 'YOU WIN!' : SEAT_NAMES[winnerSeat] + ' WINS';
  let details = players.map((p, i) => SEAT_NAMES[i] + ': ' + p.points).join('  ');
  gameRef.showOverlay(title, details + '  Click to play again');
  gameRef.setState('over');
  score = players[0].points;
  if (scoreEl) scoreEl.textContent = score;
}

function nextTurn() {
  currentTurn = (currentTurn + 1) % 4;
  turnPhase = 'draw';
  drawTileFromWall();
}

function handleCallAction(btn) {
  let savedAiCall = pendingAiCall;
  if (btn.action === 'pass' || btn.action === 'pass_tsumo') {
    callOptions = [];
    callButtons = [];
    pendingAiCall = null;
    if (savedAiCall) {
      executeCall(savedAiCall.seat, savedAiCall.decision || savedAiCall, savedAiCall.tile, discardSeat);
    } else {
      nextTurn();
    }
    return;
  }

  callOptions = [];
  callButtons = [];
  pendingAiCall = null;

  if (btn.action === 'tsumo') { declareTsumo(0); return; }
  if (btn.action === 'ron') { executeCall(0, { type: 'ron' }, btn.data.tile, discardSeat); return; }
  if (btn.action === 'pon') { executeCall(0, { type: 'pon' }, btn.data.tile, discardSeat); return; }
  if (btn.action === 'chi') { executeCall(0, { type: 'chi', combo: btn.data.combo, tiles: btn.data.combo }, btn.data.tile, discardSeat); return; }
}

// ========== DRAWING ==========

// Draw a tile as filled rectangle + text — no ctx API
function drawTileGfx(renderer, text, x, y, tileId, w, h, highlight, faceDown) {
  // Tile body gradient approximation: two fillRects
  if (faceDown) {
    renderer.fillRect(x, y, w, h, '#2a5a4a');
    renderer.fillRect(x, y, w, h / 2, '#2f6650');  // lighter top half
  } else {
    renderer.fillRect(x, y, w, h, '#d8d0b8');
    renderer.fillRect(x, y, w, h / 2, '#f5f0e0');  // lighter top half
  }

  // Border
  if (highlight) {
    renderer.setGlow('#4a8', 0.5);
    renderer.strokePoly([
      { x: x, y: y }, { x: x + w, y: y },
      { x: x + w, y: y + h }, { x: x, y: y + h }
    ], '#4a8', 2, true);
    renderer.setGlow(null);
  } else {
    let borderColor = faceDown ? '#3a7a6a' : '#999999';
    renderer.strokePoly([
      { x: x, y: y }, { x: x + w, y: y },
      { x: x + w, y: y + h }, { x: x, y: y + h }
    ], borderColor, 1, true);
  }

  if (faceDown || !tileId) return;

  let p = parseTile(tileId);
  let cx = x + w / 2;

  if (p.type === 'suit') {
    let suitColor = { m: '#cc3333', p: '#2288cc', s: '#228822' }[p.suit];
    let suitLetter = { m: 'M', p: 'P', s: 'S' }[p.suit];
    // Number (top portion of tile)
    text.drawText(String(p.num), cx, y + h * 0.1, h * 0.42, suitColor, 'center');
    // Suit letter (bottom portion)
    text.drawText(suitLetter, cx, y + h * 0.58, h * 0.22, suitColor, 'center');
  } else if (p.type === 'wind') {
    text.drawText(WIND_KANJI[p.num - 1], cx, y + h * 0.15, h * 0.55, '#333333', 'center');
  } else if (p.type === 'dragon') {
    let dragColor = ['#777777', '#22aa22', '#cc2222'][p.num - 1];
    text.drawText(DRAGON_KANJI[p.num - 1], cx, y + h * 0.15, h * 0.55, dragColor, 'center');
  }
}

function drawScene(renderer, text, frameCounter) {
  // Background already cleared by engine
  // Table center
  renderer.fillRect(100, 80, 400, 280, '#1a3828');
  renderer.strokePoly([
    { x: 100, y: 80 }, { x: 500, y: 80 },
    { x: 500, y: 360 }, { x: 100, y: 360 }
  ], '#2a5a4a', 2, true);

  // Inner border
  renderer.strokePoly([
    { x: 115, y: 95 }, { x: 485, y: 95 },
    { x: 485, y: 345 }, { x: 115, y: 345 }
  ], '#4a8', 0.5, true);

  // Center info
  let windLabel = roundWind === 0 ? 'East' : 'South';
  text.drawText(windLabel + ' ' + (handNum + 1), 300, 183, 13, '#4a8', 'center');
  text.drawText('Wall: ' + wall.length, 300, 200, 11, '#66cc66', 'center');

  // Dora indicators
  if (doraIndicators.length > 0) {
    text.drawText('Dora Indicator', 300, 222, 9, '#888888', 'center');
    let dx = 300 - (doraIndicators.length * 10);
    for (let i = 0; i < doraIndicators.length; i++) {
      drawTileGfx(renderer, text, dx + i * 22, 230, doraIndicators[i], 18, 24, false, false);
    }
  }

  // Riichi sticks
  if (riichiSticks > 0) {
    text.drawText(riichiSticks + ' riichi stick' + (riichiSticks > 1 ? 's' : ''), 300, 265, 10, '#eeaa00', 'center');
    for (let i = 0; i < riichiSticks && i < 4; i++) {
      renderer.fillRect(270 + i * 20, 273, 16, 3, '#eeaa00');
      renderer.fillCircle(278 + i * 20, 274, 1.5, '#cc0000');
    }
  }

  // Turn indicator
  if (turnPhase !== 'done') {
    let turnNames = ['South(You)', 'West(AI)', 'North(AI)', 'East(AI)'];
    text.drawText('Turn: ' + turnNames[currentTurn], 300, 170, 10, '#4a8', 'center');
  }

  // Players
  drawPlayerSouth(renderer, text);
  drawPlayerWest(renderer, text);
  drawPlayerNorth(renderer, text);
  drawPlayerEast(renderer, text);

  // Discards
  drawDiscards(renderer, text);

  // Call buttons
  if (turnPhase === 'call' && callButtons.length > 0) {
    renderer.fillRect(120, 290, 360, 50, 'rgba(26,26,46,0.7)');
    for (let btn of callButtons) {
      renderer.fillRect(btn.x, btn.y, btn.w, btn.h, btn.hover ? '#3a8a6a' : '#2a5a4a');
      renderer.strokePoly([
        { x: btn.x, y: btn.y }, { x: btn.x + btn.w, y: btn.y },
        { x: btn.x + btn.w, y: btn.y + btn.h }, { x: btn.x, y: btn.y + btn.h }
      ], btn.hover ? '#66dd66' : '#4a8', 2, true);
      text.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 - 7, 13, '#ffffff', 'center');
    }
  }

  // Riichi button
  if (turnPhase === 'discard' && currentTurn === 0 && !players[0].riichi && players[0].points >= 1000) {
    let p0 = players[0];
    if (!p0.melds.some(m => m.open)) {
      let canR = false;
      for (let i = 0; i < p0.hand.length; i++) {
        let testH = p0.hand.filter((_, j) => j !== i);
        if (isTenpai(testH)) { canR = true; break; }
      }
      if (canR) {
        let rbx = 500, rby = 412, rbw = 80, rbh = 24;
        renderer.fillRect(rbx, rby, rbw, rbh, '#4a2a2a');
        renderer.strokePoly([
          { x: rbx, y: rby }, { x: rbx + rbw, y: rby },
          { x: rbx + rbw, y: rby + rbh }, { x: rbx, y: rby + rbh }
        ], '#ee4444', 2, true);
        text.drawText('RIICHI', rbx + rbw / 2, rby + rbh / 2 - 6, 11, '#ee4444', 'center');
      }
    }
  }

  // Message bar
  if (messageTimer > 0) {
    let alpha = Math.min(1, messageTimer / 30);
    let a = Math.round(alpha * 0xd9).toString(16).padStart(2, '0');
    renderer.fillRect(80, 145, 440, 35, `rgba(26,26,46,${alpha.toFixed(2)})`);
    renderer.strokePoly([
      { x: 80, y: 145 }, { x: 520, y: 145 },
      { x: 520, y: 180 }, { x: 80, y: 180 }
    ], `rgba(68,170,136,${alpha.toFixed(2)})`, 1, true);
    renderer.setGlow('#4a8', 0.4 * alpha);
    text.drawText(message, 300, 155, 13, `rgba(68,170,136,${alpha.toFixed(2)})`, 'center');
    renderer.setGlow(null);
  }

  // AI thinking indicator
  if (turnPhase === 'discard' && currentTurn !== 0) {
    let dotCount = 1 + (frameCounter / 30 | 0) % 3;
    let dots = '.'.repeat(dotCount);
    text.drawText('AI thinking' + dots, 300, 386, 11, '#666666', 'center');
  }
}

function drawPlayerSouth(renderer, text) {
  let p = players[0];
  let handLen = p.hand.length;
  let meldTileCount = p.melds.reduce((s, m) => s + m.tiles.length, 0);
  let totalW = handLen * (TW + 2);
  let startX = Math.max(10, (W - totalW) / 2 - meldTileCount * 12);
  let y = H - TH - 18;

  let windStr = WIND_NAMES[SEAT_WIND(0)];
  let label = 'You [' + windStr + '] ' + p.points + 'pts';
  if (p.riichi) label += ' RIICHI';
  text.drawText(label, 10, y - 16, 11, currentTurn === 0 ? '#4a8' : '#888888', 'left');

  for (let i = 0; i < handLen; i++) {
    let tx = startX + i * (TW + 2);
    let ty = y;
    let isHover = (i === hoveredTile && turnPhase === 'discard' && currentTurn === 0);
    if (isHover) ty -= 8;
    drawTileGfx(renderer, text, tx, ty, p.hand[i], TW, TH, isHover, false);
  }

  let mx = W - 8;
  for (let m of p.melds) {
    for (let i = m.tiles.length - 1; i >= 0; i--) {
      mx -= (TSW + 2);
      drawTileGfx(renderer, text, mx, y + 10, m.tiles[i], TSW, TSH, false, false);
    }
    mx -= 5;
  }
}

function drawPlayerWest(renderer, text) {
  let p = players[1];
  let y0 = 100;
  let label = 'W:' + p.points;
  if (p.riichi) label += ' R';
  text.drawText(label, 3, y0 - 14, 10, currentTurn === 1 ? '#4a8' : '#888888', 'left');

  let count = p.hand.length;
  let gap = Math.min(16, 230 / Math.max(count, 1));
  for (let i = 0; i < count; i++) {
    drawTileGfx(renderer, text, 8, y0 + i * gap, null, TSH, TSW - 2, false, true);
  }

  let my = y0 + count * gap + 8;
  for (let m of p.melds) {
    for (let t of m.tiles) {
      drawTileGfx(renderer, text, 3, my, t, 16, 20, false, false);
      my += 17;
    }
    my += 3;
  }
}

function drawPlayerNorth(renderer, text) {
  let p = players[2];
  let handLen = p.hand.length;
  let totalW = handLen * (TSW + 1);
  let startX = (W - totalW) / 2;
  let y = 8;

  let label = 'N:' + p.points;
  if (p.riichi) label += ' R';
  text.drawText(label, W / 2, y + TSH + 4, 10, currentTurn === 2 ? '#4a8' : '#888888', 'center');

  for (let i = 0; i < handLen; i++) {
    drawTileGfx(renderer, text, startX + i * (TSW + 1), y, null, TSW, TSH, false, true);
  }

  let mx = startX + handLen * (TSW + 1) + 8;
  for (let m of p.melds) {
    for (let t of m.tiles) {
      drawTileGfx(renderer, text, mx, y, t, 16, 20, false, false);
      mx += 17;
    }
    mx += 3;
  }
}

function drawPlayerEast(renderer, text) {
  let p = players[3];
  let y0 = 100;
  let label = 'E:' + p.points;
  if (p.riichi) label += ' R';
  text.drawText(label, W - 3, y0 - 14, 10, currentTurn === 3 ? '#4a8' : '#888888', 'right');

  let count = p.hand.length;
  let gap = Math.min(16, 230 / Math.max(count, 1));
  for (let i = 0; i < count; i++) {
    drawTileGfx(renderer, text, W - 8 - TSH, y0 + i * gap, null, TSH, TSW - 2, false, true);
  }

  let my = y0 + count * gap + 8;
  for (let m of p.melds) {
    for (let t of m.tiles) {
      drawTileGfx(renderer, text, W - 22, my, t, 16, 20, false, false);
      my += 17;
    }
    my += 3;
  }
}

function drawDiscards(renderer, text) {
  let tw = 15, th = 20;
  let pools = [
    { x: 200, y: 305, maxRow: 11, dx: 1 },
    { x: 120, y: 160, maxRow: 6, dx: 0 },
    { x: 200, y: 100, maxRow: 11, dx: 1 },
    { x: 455, y: 160, maxRow: 6, dx: 0 },
  ];

  for (let pi = 0; pi < 4; pi++) {
    let p = players[pi];
    let pool = pools[pi];
    for (let di = 0; di < p.discards.length; di++) {
      let row = Math.floor(di / pool.maxRow);
      let col = di % pool.maxRow;
      let tx, ty;
      if (pool.dx === 1) {
        tx = pool.x + col * (tw + 1);
        ty = pool.y + row * (th + 1);
      } else {
        tx = pool.x + row * (tw + 1);
        ty = pool.y + col * (th + 1);
      }
      drawTileGfx(renderer, text, tx, ty, p.discards[di], tw, th, false, false);
    }
  }
}

// ========== EXPORT ==========
export function createGame() {
  const game = new Game('game');
  gameRef = game;

  const canvasEl = document.getElementById('game');
  let mouseX = 0, mouseY = 0;
  let pendingClicks = [];
  let frameCounter = 0;

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);

    hoveredTile = -1;
    if (players[0] && turnPhase === 'discard' && currentTurn === 0) {
      let p = players[0];
      let handLen = p.hand.length;
      let meldTileCount = p.melds.reduce((s, m) => s + m.tiles.length, 0);
      let totalW = handLen * (TW + 2);
      let startX = Math.max(10, (W - totalW) / 2 - meldTileCount * 12);
      let y = H - TH - 18;
      for (let i = 0; i < handLen; i++) {
        let tx = startX + i * (TW + 2);
        if (mouseX >= tx && mouseX <= tx + TW && mouseY >= y - 10 && mouseY <= y + TH) {
          hoveredTile = i;
        }
      }
    }

    for (let btn of callButtons) {
      btn.hover = mouseX >= btn.x && mouseX <= btn.x + btn.w &&
        mouseY >= btn.y && mouseY <= btn.y + btn.h;
    }
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x: cx, y: cy });
  });

  game.onInit = () => {
    score = 25000;
    roundWind = 0;
    handNum = 0;
    riichiSticks = 0;
    players = [initPlayer(0), initPlayer(1), initPlayer(2), initPlayer(3)];
    for (let i = 0; i < 4; i++) players[i].points = 25000;
    frameCounter = 0;
    pendingClicks = [];
    hoveredTile = -1;
    callButtons = [];
    callOptions = [];
    pendingAiCall = null;
    turnPhase = '';
    message = '';
    messageTimer = 0;
    game.showOverlay('MAHJONG COMPETITIVE', 'Click to Start\n\nJapanese Riichi Mahjong\n4 players - Simplified scoring');
    game.setState('waiting');
    if (scoreEl) scoreEl.textContent = '25000';
    if (roundInfoEl) roundInfoEl.textContent = 'E1';
    if (wallCountEl) wallCountEl.textContent = '70';
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    if (game.state === 'waiting') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        // Start game
        score = 25000;
        roundWind = 0;
        handNum = 0;
        riichiSticks = 0;
        for (let i = 0; i < 4; i++) players[i].points = 25000;
        if (scoreEl) scoreEl.textContent = '25000';
        dealHand();
        game.setState('playing');
        drawTileFromWall();
      }
      return;
    }

    if (game.state === 'over') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // Playing state
    frameCounter++;
    if (messageTimer > 0) messageTimer--;

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const cx = click.x, cy = click.y;

      // Call buttons
      if (turnPhase === 'call') {
        for (let btn of callButtons) {
          if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
            handleCallAction(btn);
            break;
          }
        }
        continue;
      }

      // Riichi button
      if (turnPhase === 'discard' && currentTurn === 0 && !players[0].riichi && players[0].points >= 1000) {
        if (cx >= 500 && cx <= 580 && cy >= 412 && cy <= 436) {
          let p0 = players[0];
          if (!p0.melds.some(m => m.open)) {
            let validRiichi = false;
            for (let i = 0; i < p0.hand.length; i++) {
              let testH = p0.hand.filter((_, j) => j !== i);
              if (isTenpai(testH)) { validRiichi = true; break; }
            }
            if (validRiichi) {
              p0.riichi = true;
              p0.riichiTurn = p0.discards.length;
              p0.points -= 1000;
              riichiSticks++;
              showMessage('You declare RIICHI!');
              score = p0.points;
              if (scoreEl) scoreEl.textContent = score;
              for (let i = 0; i < p0.hand.length; i++) {
                let testH = p0.hand.filter((_, j) => j !== i);
                if (isTenpai(testH)) {
                  doDiscard(0, i);
                  break;
                }
              }
            }
          }
          continue;
        }
      }

      // Tile discard
      if (turnPhase === 'discard' && currentTurn === 0) {
        let p = players[0];
        let handLen = p.hand.length;
        let meldTileCount = p.melds.reduce((s, m) => s + m.tiles.length, 0);
        let totalW = handLen * (TW + 2);
        let startX = Math.max(10, (W - totalW) / 2 - meldTileCount * 12);
        let y = H - TH - 18;
        for (let i = 0; i < handLen; i++) {
          let tx = startX + i * (TW + 2);
          if (cx >= tx && cx <= tx + TW && cy >= y - 10 && cy <= y + TH) {
            if (p.riichi) {
              doDiscard(0, p.hand.length - 1);
            } else {
              doDiscard(0, i);
            }
            break;
          }
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    drawScene(renderer, text, frameCounter);
  };

  game.start();
  return game;
}
