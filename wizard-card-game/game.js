// wizard-card-game/game.js — WebGL 2 port of Wizard Card Game
import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 450;

  // DOM refs for score display (outside canvas)
  const scoreEl = document.getElementById('score');
  const aiScoreEl = document.getElementById('aiScore');
  const roundInfoEl = document.getElementById('roundInfo');

  // ── Constants ──
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
  // Colors as #rrggbb strings (renderer parses these)
  const SUIT_COLORS_HEX = { spades: '#ffffff', hearts: '#ff4444', diamonds: '#ff4444', clubs: '#ffffff' };
  const RANK_NAMES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  const MAX_ROUNDS = 10;
  const CARD_W = 50, CARD_H = 70;

  // Theme color
  const PINK = '#ff66aa';

  // ── Game State ──
  let score = 0;
  let aiScore = 0;
  let round = 1;
  let dealer = 'ai';
  let playerHand = [];
  let aiHand = [];
  let trumpSuit = null;
  let trumpCard = null;
  let playerBid = -1;
  let aiBid = -1;
  let playerTricks = 0;
  let aiTricks = 0;
  let trickCards = [];
  let leadPlayer = 'player';
  let cardsPlayed = [];
  let phase = 'idle';
  let bidOptions = [];
  let hoverCard = -1;
  let hoverBid = -1;
  let message = '';
  let trickResultTimer = 0;
  let animFrame = 0;
  let trumpPickSuit = -1;
  let mouseX = 0, mouseY = 0;

  // ── Deck ──
  function buildDeck() {
    let deck = [];
    for (let s of SUITS) {
      for (let r of RANK_NAMES) {
        deck.push({ type: 'normal', suit: s, rank: r, value: RANK_VALUES[r] });
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ type: 'wizard', suit: null, rank: 'W', value: 100 + i });
      deck.push({ type: 'jester', suit: null, rank: 'J', value: -100 - i });
    }
    return deck;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cardName(c) {
    if (c.type === 'wizard') return 'Wizard';
    if (c.type === 'jester') return 'Jester';
    return c.rank + SUIT_SYMBOLS[c.suit];
  }

  // ── Deal ──
  function dealRound() {
    let deck = shuffle(buildDeck());
    playerHand = deck.splice(0, round);
    aiHand = deck.splice(0, round);
    trumpCard = null;
    trumpSuit = null;

    if (deck.length > 0) {
      trumpCard = deck[0];
      if (trumpCard.type === 'wizard') {
        if (dealer === 'player') {
          phase = 'pick-trump';
          return;
        } else {
          trumpSuit = aiPickTrumpSuit();
        }
      } else if (trumpCard.type === 'jester') {
        trumpSuit = null;
      } else {
        trumpSuit = trumpCard.suit;
      }
    }
    startBidding();
  }

  function aiPickTrumpSuit() {
    let counts = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    for (let c of aiHand) {
      if (c.type === 'normal') counts[c.suit]++;
    }
    let best = 'spades', bestN = -1;
    for (let s of SUITS) {
      if (counts[s] > bestN) { bestN = counts[s]; best = s; }
    }
    return best;
  }

  // ── Bidding ──
  function startBidding() {
    playerBid = -1;
    aiBid = -1;
    playerTricks = 0;
    aiTricks = 0;
    trickCards = [];
    cardsPlayed = [];
    phase = 'bidding';

    if (dealer === 'ai') {
      bidOptions = [];
      for (let i = 0; i <= round; i++) bidOptions.push(i);
    } else {
      aiBid = aiMakeBid();
      bidOptions = [];
      for (let i = 0; i <= round; i++) bidOptions.push(i);
    }
  }

  function aiMakeBid() {
    let tricks = 0;
    for (let c of aiHand) {
      if (c.type === 'wizard') { tricks++; continue; }
      if (c.type === 'jester') continue;
      if (trumpSuit && c.suit === trumpSuit && c.value >= 10) tricks += 0.7;
      else if (trumpSuit && c.suit === trumpSuit) tricks += 0.3;
      if (c.value >= 13) tricks += 0.5;
      if (c.value === 14) tricks += 0.3;
    }
    return Math.max(0, Math.min(round, Math.round(tricks)));
  }

  function playerMakeBid(bid) {
    playerBid = bid;
    if (aiBid === -1) {
      aiBid = aiMakeBid();
    }
    phase = 'playing';
    leadPlayer = (dealer === 'ai') ? 'player' : 'ai';
    if (leadPlayer === 'ai') {
      setTimeout(aiPlayCard, 600);
    }
  }

  // ── Card Legality ──
  function getLegalCards(hand, ledSuit) {
    if (ledSuit === null) return hand.map((_, i) => i);
    let following = [];
    for (let i = 0; i < hand.length; i++) {
      let c = hand[i];
      if (c.type === 'wizard' || c.type === 'jester') {
        following.push(i);
      } else if (c.suit === ledSuit) {
        following.push(i);
      }
    }
    let hasLedSuit = hand.some(c => c.type === 'normal' && c.suit === ledSuit);
    if (hasLedSuit) return following;
    return hand.map((_, i) => i);
  }

  function getLedSuit() {
    if (trickCards.length === 0) return null;
    let first = trickCards[0].card;
    if (first.type === 'wizard' || first.type === 'jester') {
      for (let tc of trickCards) {
        if (tc.card.type === 'normal') return tc.card.suit;
      }
      return null;
    }
    return first.suit;
  }

  // ── Trick Winner ──
  function determineTrickWinner() {
    let c1 = trickCards[0];
    let c2 = trickCards[1];
    if (c1.card.type === 'wizard') return c1.player;
    if (c2.card.type === 'wizard') return c2.player;
    if (c1.card.type === 'jester' && c2.card.type === 'jester') return c1.player;
    if (c1.card.type === 'jester') return c2.player;
    if (c2.card.type === 'jester') return c1.player;
    let ledSuit = c1.card.suit;
    let c1Trump = trumpSuit && c1.card.suit === trumpSuit;
    let c2Trump = trumpSuit && c2.card.suit === trumpSuit;
    if (c1Trump && !c2Trump) return c1.player;
    if (!c1Trump && c2Trump) return c2.player;
    if (c1Trump && c2Trump) return c1.card.value > c2.card.value ? c1.player : c2.player;
    if (c2.card.suit === ledSuit) {
      return c1.card.value > c2.card.value ? c1.player : c2.player;
    }
    return c1.player;
  }

  // ── Play Card ──
  function playerPlayCard(idx) {
    if (phase !== 'playing') return;
    let ledSuit = getLedSuit();
    let legal = getLegalCards(playerHand, ledSuit);
    if (!legal.includes(idx)) return;
    let card = playerHand.splice(idx, 1)[0];
    trickCards.push({ card, player: 'player' });
    cardsPlayed.push(card);
    if (trickCards.length === 2) {
      resolveTrick();
    } else {
      setTimeout(aiPlayCard, 500);
    }
  }

  function aiPlayCard() {
    if (phase !== 'playing') return;
    let ledSuit = getLedSuit();
    let legal = getLegalCards(aiHand, ledSuit);
    if (legal.length === 0) return;
    let idx = aiChooseCard(legal, ledSuit);
    let card = aiHand.splice(idx, 1)[0];
    trickCards.push({ card, player: 'ai' });
    cardsPlayed.push(card);
    if (trickCards.length === 2) {
      resolveTrick();
    }
  }

  // ── AI Card Selection ──
  function aiChooseCard(legal, ledSuit) {
    let tricksNeeded = aiBid - aiTricks;
    let wantToWin = tricksNeeded > 0;

    if (trickCards.length === 0) {
      return wantToWin ? pickStrongest(legal) : pickWeakest(legal);
    } else {
      let leadCard = trickCards[0].card;
      if (wantToWin) {
        let winning = findWinningCards(legal, leadCard);
        if (winning.length > 0) return pickWeakestFrom(winning);
        return pickWeakest(legal);
      } else {
        let losing = findLosingCards(legal, leadCard);
        if (losing.length > 0) return pickWeakestFrom(losing);
        return pickWeakest(legal);
      }
    }
  }

  function cardStrength(c) {
    if (c.type === 'wizard') return 1000;
    if (c.type === 'jester') return -1000;
    let str = c.value;
    if (trumpSuit && c.suit === trumpSuit) str += 100;
    return str;
  }

  function pickStrongest(indices) {
    let best = indices[0], bestStr = -Infinity;
    for (let i of indices) {
      let s = cardStrength(aiHand[i]);
      if (s > bestStr) { bestStr = s; best = i; }
    }
    return best;
  }

  function pickWeakest(indices) {
    let best = indices[0], bestStr = Infinity;
    for (let i of indices) {
      let s = cardStrength(aiHand[i]);
      if (s < bestStr) { bestStr = s; best = i; }
    }
    return best;
  }

  function pickWeakestFrom(indices) {
    let best = indices[0], bestStr = Infinity;
    for (let i of indices) {
      let s = cardStrength(aiHand[i]);
      if (s < bestStr) { bestStr = s; best = i; }
    }
    return best;
  }

  function findWinningCards(legal, leadCard) {
    let winning = [];
    for (let i of legal) {
      let c = aiHand[i];
      let testTrick = [{ card: leadCard, player: 'player' }, { card: c, player: 'ai' }];
      let oldTrick = trickCards;
      trickCards = testTrick;
      let winner = determineTrickWinner();
      trickCards = oldTrick;
      if (winner === 'ai') winning.push(i);
    }
    return winning;
  }

  function findLosingCards(legal, leadCard) {
    let losing = [];
    for (let i of legal) {
      let c = aiHand[i];
      let testTrick = [{ card: leadCard, player: 'player' }, { card: c, player: 'ai' }];
      let oldTrick = trickCards;
      trickCards = testTrick;
      let winner = determineTrickWinner();
      trickCards = oldTrick;
      if (winner === 'player') losing.push(i);
    }
    return losing;
  }

  // ── Trick / Round Resolution ──
  function resolveTrick() {
    let winner = determineTrickWinner();
    if (winner === 'player') playerTricks++;
    else aiTricks++;
    phase = 'trick-result';
    message = winner === 'player' ? 'You win the trick!' : 'AI wins the trick!';
    trickResultTimer = 80;
    leadPlayer = winner;
  }

  function afterTrickResult() {
    trickCards = [];
    if (playerHand.length === 0 && aiHand.length === 0) {
      let pScore = calcScore(playerBid, playerTricks);
      let aScore = calcScore(aiBid, aiTricks);
      score += pScore;
      aiScore += aScore;
      if (scoreEl) scoreEl.textContent = score;
      if (aiScoreEl) aiScoreEl.textContent = aiScore;
      let pSign = pScore >= 0 ? '+' : '';
      let aSign = aScore >= 0 ? '+' : '';
      message = `Round ${round}: You bid ${playerBid}, won ${playerTricks} (${pSign}${pScore}) | AI bid ${aiBid}, won ${aiTricks} (${aSign}${aScore})`;
      phase = 'round-result';
      trickResultTimer = 180;
      return;
    }
    phase = 'playing';
    if (leadPlayer === 'ai') {
      setTimeout(aiPlayCard, 500);
    }
  }

  function afterRoundResult() {
    if (round >= MAX_ROUNDS) {
      game.setState('over');
      let result = score > aiScore ? 'You Win!' : (score < aiScore ? 'AI Wins!' : 'Tie Game!');
      game.showOverlay(result, `Final Score: You ${score} - AI ${aiScore}  |  Click to Play Again`);
      const overlayEl = document.getElementById('overlay');
      if (overlayEl) overlayEl.style.pointerEvents = 'auto';
      return;
    }
    round++;
    dealer = (dealer === 'player') ? 'ai' : 'player';
    if (roundInfoEl) roundInfoEl.textContent = `Round ${round}/${MAX_ROUNDS}`;
    dealRound();
  }

  function calcScore(bid, tricks) {
    if (bid === tricks) return 20 + 10 * tricks;
    return -10 * Math.abs(bid - tricks);
  }

  function startGame() {
    score = 0;
    aiScore = 0;
    round = 1;
    dealer = 'ai';
    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    if (roundInfoEl) roundInfoEl.textContent = 'Round 1/10';
    const overlayEl = document.getElementById('overlay');
    if (overlayEl) overlayEl.style.pointerEvents = 'none';
    game.setState('playing');
    dealRound();
  }

  // ── Helper: get hand x ──
  function getHandX(handSize, index) {
    let totalW = handSize * (CARD_W + 6) - 6;
    let startX = (W - totalW) / 2;
    return startX + index * (CARD_W + 6);
  }

  // ── Drawing helpers ──
  // All drawing uses renderer (r) and text (t)

  // Draw a full-size card face-up or face-down using WebGL primitives
  function drawCard(r, t, x, y, card, faceDown, highlight, grayed) {
    if (faceDown) {
      r.fillRect(x, y, CARD_W, CARD_H, '#333366');
      // Simple cross-hatch lines on card back
      r.drawLine(x, y, x + CARD_W, y + CARD_H, '#445588', 0.5);
      r.drawLine(x + CARD_W, y, x, y + CARD_H, '#445588', 0.5);
      r.strokePoly([
        { x, y }, { x: x + CARD_W, y }, { x: x + CARD_W, y: y + CARD_H }, { x, y: y + CARD_H }
      ], '#5555aa', 1.5);
      return;
    }

    // Face-up
    let bgColor;
    if (card.type === 'wizard') bgColor = '#ddc0ff';
    else if (card.type === 'jester') bgColor = '#c0ffd8';
    else if (grayed) bgColor = '#555555';
    else bgColor = '#f8f4e8';

    r.fillRect(x, y, CARD_W, CARD_H, bgColor);

    // Border
    let borderColor = highlight ? '#ffff66' : '#888888';
    let borderWidth = highlight ? 2 : 1;
    if (highlight) r.setGlow('#ffff66', 0.8);
    r.strokePoly([
      { x, y }, { x: x + CARD_W, y }, { x: x + CARD_W, y: y + CARD_H }, { x, y: y + CARD_H }
    ], borderColor, borderWidth);
    if (highlight) r.setGlow(null);

    // Card content
    if (card.type === 'wizard') {
      t.drawText('W', x + CARD_W / 2, y + 4, 14, '#8800ff', 'center');
      t.drawText('\u2605', x + CARD_W / 2, y + CARD_H / 2 - 10, 20, '#8800ff', 'center');
      t.drawText('WIZARD', x + CARD_W / 2, y + CARD_H - 14, 9, '#8800ff', 'center');
    } else if (card.type === 'jester') {
      t.drawText('J', x + CARD_W / 2, y + 4, 14, '#00aa00', 'center');
      t.drawText('\u2662', x + CARD_W / 2, y + CARD_H / 2 - 8, 18, '#00aa00', 'center');
      t.drawText('JESTER', x + CARD_W / 2, y + CARD_H - 14, 9, '#00aa00', 'center');
    } else {
      let col = grayed ? '#999999' : SUIT_COLORS_HEX[card.suit];
      // For red suits on light background, use a slightly darker red
      if (!grayed && (card.suit === 'hearts' || card.suit === 'diamonds')) col = '#cc2222';
      t.drawText(card.rank, x + 4, y + 2, 12, col, 'left');
      t.drawText(card.rank, x + CARD_W - 4, y + CARD_H - 14, 12, col, 'right');
      t.drawText(SUIT_SYMBOLS[card.suit], x + CARD_W / 2, y + CARD_H / 2 - 8, 20, col, 'center');
    }
  }

  // Draw a small trump card indicator
  function drawCardSmall(r, t, x, y, card) {
    const sw = 30, sh = 42;
    let bgColor;
    if (card.type === 'wizard') bgColor = '#ddc0ff';
    else if (card.type === 'jester') bgColor = '#c0ffd8';
    else bgColor = '#f8f4e8';

    r.fillRect(x, y, sw, sh, bgColor);
    r.strokePoly([
      { x, y }, { x: x + sw, y }, { x: x + sw, y: y + sh }, { x, y: y + sh }
    ], '#888888', 1);

    if (card.type === 'wizard') {
      t.drawText('W', x + sw / 2, y + 2, 10, '#8800ff', 'center');
      t.drawText('\u2605', x + sw / 2, y + 16, 14, '#8800ff', 'center');
    } else if (card.type === 'jester') {
      t.drawText('J', x + sw / 2, y + 2, 10, '#00aa00', 'center');
    } else {
      let col = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#cc2222' : '#222222';
      t.drawText(card.rank, x + sw / 2, y + 2, 9, col, 'center');
      t.drawText(SUIT_SYMBOLS[card.suit], x + sw / 2, y + 16, 14, col, 'center');
    }
  }

  // ── Hit Testing ──
  function updateHover() {
    hoverCard = -1;
    hoverBid = -1;
    trumpPickSuit = -1;

    if (game.state !== 'playing') return;

    if (phase === 'bidding' && playerBid === -1) {
      let bw = 36, bh = 32;
      let totalBW = bidOptions.length * (bw + 6) - 6;
      let startBX = (W - totalBW) / 2;
      for (let i = 0; i < bidOptions.length; i++) {
        let bx = startBX + i * (bw + 6);
        let by = H / 2 - 16;
        if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
          hoverBid = i;
        }
      }
    }

    if (phase === 'pick-trump') {
      let sw = 50, sh = 40;
      let totalSW = 4 * (sw + 10) - 10;
      let startSX = (W - totalSW) / 2;
      for (let i = 0; i < 4; i++) {
        let sx = startSX + i * (sw + 10);
        let sy = H / 2 - 10;
        if (mouseX >= sx && mouseX <= sx + sw && mouseY >= sy && mouseY <= sy + sh) {
          trumpPickSuit = i;
        }
      }
    }

    if (phase === 'playing' && trickCards.length < 2) {
      let ledSuit = getLedSuit();
      let legal = getLegalCards(playerHand, ledSuit);
      let isPlayerTurn = (trickCards.length === 0 && leadPlayer === 'player') ||
                         (trickCards.length === 1 && trickCards[0].player === 'ai');
      if (isPlayerTurn) {
        for (let i = 0; i < playerHand.length; i++) {
          let x = getHandX(playerHand.length, i);
          let y = H - CARD_H - 20;
          if (mouseX >= x && mouseX <= x + CARD_W && mouseY >= y && mouseY <= y + CARD_H) {
            if (legal.includes(i)) hoverCard = i;
          }
        }
      }
    }
  }

  function handleClick() {
    if (game.state === 'waiting') {
      startGame();
      return;
    }
    if (game.state === 'over') {
      startGame();
      return;
    }

    if (phase === 'bidding' && playerBid === -1 && hoverBid >= 0) {
      playerMakeBid(bidOptions[hoverBid]);
      return;
    }

    if (phase === 'pick-trump' && trumpPickSuit >= 0) {
      trumpSuit = SUITS[trumpPickSuit];
      trumpPickSuit = -1;
      startBidding();
      return;
    }

    if (phase === 'playing' && hoverCard >= 0) {
      let isPlayerTurn = (trickCards.length === 0 && leadPlayer === 'player') ||
                         (trickCards.length === 1 && trickCards[0].player === 'ai');
      if (isPlayerTurn) {
        playerPlayCard(hoverCard);
      }
      return;
    }
  }

  // ── Mouse events on canvas ──
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    updateHover();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    handleClick();
  });

  // Overlay click
  const overlayEl = document.getElementById('overlay');
  if (overlayEl) {
    overlayEl.addEventListener('click', () => {
      if (game.state === 'waiting' || game.state === 'over') {
        handleClick();
      }
    });
  }

  // ── Engine Hooks ──

  game.onInit = () => {
    game.showOverlay('WIZARD', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    animFrame++;

    if (phase === 'trick-result') {
      trickResultTimer--;
      if (trickResultTimer <= 0) {
        afterTrickResult();
      }
    }

    if (phase === 'round-result') {
      trickResultTimer--;
      if (trickResultTimer <= 0) {
        afterRoundResult();
      }
    }
  };

  game.onDraw = (r, t) => {
    // Background already cleared by engine; just draw game content
    if (game.state === 'waiting') return;
    if (game.state === 'over') return;

    // ── Trump display ──
    if (trumpSuit) {
      t.drawText('Trump:', 10, 6, 12, '#aaaaaa', 'left');
      let sColor = (trumpSuit === 'hearts' || trumpSuit === 'diamonds') ? '#ff4444' : '#ffffff';
      t.drawText(SUIT_SYMBOLS[trumpSuit], 62, 5, 18, sColor, 'left');
    } else {
      t.drawText('Trump: None', 10, 6, 12, '#aaaaaa', 'left');
    }

    // ── Bids and tricks ──
    if (aiBid >= 0) {
      t.drawText(`AI bid: ${aiBid}  Tricks: ${aiTricks}`, W - 10, 4, 11, '#aaaaaa', 'right');
    }
    if (playerBid >= 0) {
      t.drawText(`Your bid: ${playerBid}  Tricks: ${playerTricks}`, W - 10, H - 14, 11, '#aaaaaa', 'right');
    }

    // ── AI hand (face down) ──
    for (let i = 0; i < aiHand.length; i++) {
      let x = getHandX(aiHand.length, i);
      drawCard(r, t, x, 30, null, true, false, false);
    }

    // ── Trump card indicator ──
    if (trumpCard && phase !== 'pick-trump') {
      t.drawText('Trump card:', 10, 40, 10, '#888888', 'left');
      drawCardSmall(r, t, 10, 50, trumpCard);
    }

    // ── Played cards in center trick area ──
    if (trickCards.length > 0) {
      let cx = W / 2;
      let cy = H / 2;
      for (let i = 0; i < trickCards.length; i++) {
        let tc = trickCards[i];
        let ox = (i === 0 ? -30 : 30);
        let oy = tc.player === 'player' ? 20 : -20;
        drawCard(r, t, cx + ox - CARD_W / 2, cy + oy - CARD_H / 2, tc.card, false, false, false);
        t.drawText(tc.player === 'player' ? 'You' : 'AI',
          cx + ox, cy + oy + CARD_H / 2 + 12, 10, '#aaaaaa', 'center');
      }
    }

    // ── Player hand (playing / trick-result / round-result) ──
    if (phase === 'playing' || phase === 'trick-result' || phase === 'round-result') {
      let ledSuit = getLedSuit();
      let legal = (phase === 'playing' && trickCards.length < 2)
        ? getLegalCards(playerHand, ledSuit)
        : [];
      for (let i = 0; i < playerHand.length; i++) {
        let x = getHandX(playerHand.length, i);
        let isLegal = legal.includes(i);
        let isHover = (hoverCard === i && isLegal && phase === 'playing' && trickCards.length < 2);
        let yOff = isHover ? -8 : 0;
        let isWaiting = (phase === 'playing' && leadPlayer === 'ai' && trickCards.length === 0);
        let grayed = (phase === 'playing' && !isLegal && !isWaiting);
        drawCard(r, t, x, H - CARD_H - 20 + yOff, playerHand[i], false, isHover, grayed);
      }
    }

    // ── Bidding UI ──
    if (phase === 'bidding' && playerBid === -1) {
      // Show hand
      for (let i = 0; i < playerHand.length; i++) {
        let x = getHandX(playerHand.length, i);
        drawCard(r, t, x, H - CARD_H - 20, playerHand[i], false, false, false);
      }

      t.drawText('Your Bid:', W / 2, H / 2 - 44, 16, PINK, 'center');

      if (aiBid >= 0) {
        t.drawText(`AI bid: ${aiBid}`, W / 2, H / 2 - 62, 12, '#aaaaaa', 'center');
      }

      // Bid buttons
      let bw = 36, bh = 32;
      let totalBW = bidOptions.length * (bw + 6) - 6;
      let startBX = (W - totalBW) / 2;
      for (let i = 0; i < bidOptions.length; i++) {
        let bx = startBX + i * (bw + 6);
        let by = H / 2 - 16;
        let isHov = (hoverBid === i);
        let fillCol = isHov ? '#ff66aa44' : '#ff66aa22';
        r.fillRect(bx, by, bw, bh, fillCol);
        r.strokePoly([
          { x: bx, y: by }, { x: bx + bw, y: by },
          { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }
        ], PINK, isHov ? 2 : 1);
        t.drawText(String(bidOptions[i]), bx + bw / 2, by + 8, 16, '#ffffff', 'center');
      }
    }

    // ── Pick Trump UI ──
    if (phase === 'pick-trump') {
      // Show hand
      for (let i = 0; i < playerHand.length; i++) {
        let x = getHandX(playerHand.length, i);
        drawCard(r, t, x, H - CARD_H - 20, playerHand[i], false, false, false);
      }

      t.drawText('Wizard flipped! Pick trump suit:', W / 2, H / 2 - 44, 16, PINK, 'center');

      let sw = 50, sh = 40;
      let totalSW = 4 * (sw + 10) - 10;
      let startSX = (W - totalSW) / 2;
      for (let i = 0; i < 4; i++) {
        let sx = startSX + i * (sw + 10);
        let sy = H / 2 - 10;
        let isHov = (trumpPickSuit === i);
        r.fillRect(sx, sy, sw, sh, isHov ? '#ff66aa44' : '#ff66aa22');
        r.strokePoly([
          { x: sx, y: sy }, { x: sx + sw, y: sy },
          { x: sx + sw, y: sy + sh }, { x: sx, y: sy + sh }
        ], PINK, isHov ? 2 : 1);
        let sColor = (SUITS[i] === 'hearts' || SUITS[i] === 'diamonds') ? '#cc2222' : '#222222';
        t.drawText(SUIT_SYMBOLS[SUITS[i]], sx + sw / 2, sy + 8, 20, sColor, 'center');
      }
    }

    // ── Message overlay (trick-result / round-result) ──
    if (phase === 'trick-result' || phase === 'round-result') {
      r.fillRect(W / 2 - 250, H / 2 - 18, 500, 36, '#1a1a2eb0');
      t.drawText(message, W / 2, H / 2 - 10, 14, PINK, 'center');
    }
  };

  game.start();
  return game;
}
