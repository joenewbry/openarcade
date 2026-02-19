// stratego-digital/game.js — Stratego Digital ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 500, H = 600;
const COLS = 10, ROWS = 10;
const CELL = 46;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = Math.floor((W - BOARD_W) / 2);
const BOARD_Y = 54;
const PANEL_Y = BOARD_Y + BOARD_H + 4;

// Lake cells
const LAKE_CELLS = new Set();
for (let r = 4; r <= 5; r++) {
  for (const c of [2, 3, 6, 7]) LAKE_CELLS.add(r * 10 + c);
}
function isLake(r, c) { return LAKE_CELLS.has(r * 10 + c); }

// Piece definitions
const PIECE_DEFS = [
  { name: 'Marshal',    rank: 1,  count: 1, abbr: 'Ma' },
  { name: 'General',    rank: 2,  count: 1, abbr: 'Ge' },
  { name: 'Colonel',    rank: 3,  count: 2, abbr: 'Co' },
  { name: 'Major',      rank: 4,  count: 3, abbr: 'Mj' },
  { name: 'Captain',    rank: 5,  count: 4, abbr: 'Ca' },
  { name: 'Lieutenant', rank: 6,  count: 4, abbr: 'Lt' },
  { name: 'Sergeant',   rank: 7,  count: 4, abbr: 'Sg' },
  { name: 'Miner',      rank: 8,  count: 5, abbr: 'Mi' },
  { name: 'Scout',      rank: 9,  count: 8, abbr: 'Sc' },
  { name: 'Spy',        rank: 10, count: 1, abbr: 'Sp' },
  { name: 'Bomb',       rank: 0,  count: 6, abbr: 'Bo' },
  { name: 'Flag',       rank: 99, count: 1, abbr: 'Fl' },
];

// Colors
const C_PLAYER      = '#4488ff';
const C_PLAYER_DIM  = '#1a3366';
const C_PLAYER_LITE = '#6699ff';
const C_AI          = '#ee4444';
const C_AI_DIM      = '#661a1a';
const C_AI_LITE     = '#ff6666';
const C_LAKE        = '#0d2844';
const C_BOARD       = '#141e30';
const C_GRID        = '#1e3050';
const THEME         = '#dd44aa';

// ── Module-scope state ──
let score;
let board, phase, selectedPiece, validMoves;
let setupPieces, setupIndex;
let turn, lastBattle, battleTimer;
let message, messageTimer;
let aiCaptured, playerCaptured;
let aiKnownMovable;

// Pending mouse events from canvas listeners, consumed in onUpdate
let pendingClicks = [];
let pendingRightClicks = [];

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const infoBar = document.getElementById('infoBar');

// ── Helpers ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createPieceSet() {
  const pieces = [];
  for (const def of PIECE_DEFS) {
    for (let i = 0; i < def.count; i++) {
      pieces.push({ name: def.name, rank: def.rank, abbr: def.abbr });
    }
  }
  return pieces;
}

function initBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) board[r] = new Array(COLS).fill(null);
}

// ── AI setup ──
function placeAIPieces() {
  let pieces = shuffle(createPieceSet());
  const flagIdx = pieces.findIndex(p => p.rank === 99);
  const flag = pieces.splice(flagIdx, 1)[0];
  const flagCol = 1 + Math.floor(Math.random() * 8);
  board[0][flagCol] = { owner: 1, ...flag, revealed: false };

  const bombIdxs = [];
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (pieces[i].rank === 0 && bombIdxs.length < 3) bombIdxs.push(i);
  }
  const bombs = bombIdxs.map(i => pieces[i]);
  bombIdxs.sort((a, b) => b - a).forEach(i => pieces.splice(i, 1));

  const adjSlots = [
    { r: 0, c: flagCol - 1 }, { r: 0, c: flagCol + 1 }, { r: 1, c: flagCol }
  ].filter(p => p.c >= 0 && p.c < COLS && !board[p.r][p.c]);

  for (let i = 0; i < Math.min(bombs.length, adjSlots.length); i++) {
    board[adjSlots[i].r][adjSlots[i].c] = { owner: 1, ...bombs[i], revealed: false };
  }
  pieces.push(...bombs.slice(adjSlots.length));
  shuffle(pieces);

  let pi = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] && pi < pieces.length) {
        board[r][c] = { owner: 1, ...pieces[pi++], revealed: false };
      }
    }
  }
}

function getSetupOrder() {
  const pieces = [];
  const order = [99, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const rank of order) {
    const def = PIECE_DEFS.find(d => d.rank === rank);
    for (let i = 0; i < def.count; i++) {
      pieces.push({ name: def.name, rank: def.rank, abbr: def.abbr });
    }
  }
  return pieces;
}

function autoPlacePlayerPieces() {
  let pieces = shuffle(createPieceSet());
  const flagIdx = pieces.findIndex(p => p.rank === 99);
  const flag = pieces.splice(flagIdx, 1)[0];
  const flagCol = 1 + Math.floor(Math.random() * 8);
  board[9][flagCol] = { owner: 0, ...flag, revealed: false };

  const bombIdxs = [];
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (pieces[i].rank === 0 && bombIdxs.length < 3) bombIdxs.push(i);
  }
  const bombs = bombIdxs.map(i => pieces[i]);
  bombIdxs.sort((a, b) => b - a).forEach(i => pieces.splice(i, 1));
  const adj = [
    { r: 9, c: flagCol - 1 }, { r: 9, c: flagCol + 1 }, { r: 8, c: flagCol }
  ].filter(p => p.c >= 0 && p.c < COLS && !board[p.r][p.c]);
  for (let i = 0; i < Math.min(bombs.length, adj.length); i++) {
    board[adj[i].r][adj[i].c] = { owner: 0, ...bombs[i], revealed: false };
  }
  pieces.push(...bombs.slice(adj.length));
  shuffle(pieces);

  let pi = 0;
  for (let r = 6; r < 10; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] && pi < pieces.length) {
        board[r][c] = { owner: 0, ...pieces[pi++], revealed: false };
      }
    }
  }
}

// ── Movement ──
function canMove(piece) { return piece.rank !== 0 && piece.rank !== 99; }

function getValidMoves(r, c) {
  const piece = board[r][c];
  if (!piece || !canMove(piece)) return [];
  const moves = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  if (piece.rank === 9) {
    for (const [dr, dc] of dirs) {
      for (let d = 1; d < 10; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || isLake(nr, nc)) break;
        if (board[nr][nc]) {
          if (board[nr][nc].owner !== piece.owner) moves.push({ r: nr, c: nc, attack: true });
          break;
        }
        moves.push({ r: nr, c: nc, attack: false });
      }
    }
  } else {
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || isLake(nr, nc)) continue;
      if (board[nr][nc]) {
        if (board[nr][nc].owner !== piece.owner) moves.push({ r: nr, c: nc, attack: true });
      } else {
        moves.push({ r: nr, c: nc, attack: false });
      }
    }
  }
  return moves;
}

// ── Combat ──
function resolveBattle(ar, ac, dr, dc) {
  const atk = board[ar][ac];
  const def = board[dr][dc];
  atk.revealed = true;
  def.revealed = true;

  let result;
  if (atk.rank === 10 && def.rank === 1)    result = 'attacker';
  else if (atk.rank === 8 && def.rank === 0) result = 'attacker';
  else if (def.rank === 0)                   result = 'defender';
  else if (def.rank === 99)                  result = 'attacker';
  else if (atk.rank < def.rank)              result = 'attacker';
  else if (atk.rank > def.rank)              result = 'defender';
  else                                       result = 'both';

  lastBattle = { attacker: { ...atk }, defender: { ...def }, result, ar, ac, dr, dc };
  battleTimer = 100;

  if (result === 'attacker') {
    if (def.owner === 1) { aiCaptured.push(def); score++; if (scoreEl) scoreEl.textContent = score; }
    else playerCaptured.push(def);
    board[dr][dc] = atk;
    board[ar][ac] = null;
    if (def.rank === 99) endGame(atk.owner === 0 ? 'win' : 'lose');
  } else if (result === 'defender') {
    if (atk.owner === 1) aiCaptured.push(atk);
    else playerCaptured.push(atk);
    board[ar][ac] = null;
  } else {
    if (atk.owner === 1) aiCaptured.push(atk); else playerCaptured.push(atk);
    if (def.owner === 1) { aiCaptured.push(def); score++; if (scoreEl) scoreEl.textContent = score; }
    else playerCaptured.push(def);
    board[ar][ac] = null;
    board[dr][dc] = null;
  }
  return result;
}

function doMove(fr, fc, tr, tc) {
  const piece = board[fr][fc];
  if (piece.owner === 0) aiKnownMovable.add(tr * 10 + tc);
  if (board[tr][tc] && board[tr][tc].owner !== piece.owner) {
    return resolveBattle(fr, fc, tr, tc);
  }
  board[tr][tc] = board[fr][fc];
  board[fr][fc] = null;
  return null;
}

function endGame(result, g) {
  phase = 'gameover';
  g.setState('over');
  const bestScore = parseInt(localStorage.getItem('stratego-best') || '0');
  if (score > bestScore) {
    localStorage.setItem('stratego-best', score);
    if (bestEl) bestEl.textContent = score;
  }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c]) board[r][c].revealed = true;

  setTimeout(() => {
    g.showOverlay(result === 'win' ? 'VICTORY!' : 'DEFEAT', 'Captures: ' + score + ' | Click to play again');
    g.setState('waiting');
  }, 1500);
}

function hasMovesLeft(owner) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c].owner === owner && canMove(board[r][c]))
        if (getValidMoves(r, c).length > 0) return true;
  return false;
}

// ── AI ──
function getRemainingCounts(owner) {
  const counts = {};
  for (const d of PIECE_DEFS) counts[d.rank] = d.count;
  const captured = owner === 0 ? playerCaptured : aiCaptured;
  for (const p of captured) counts[p.rank]--;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.owner === owner && p.revealed) counts[p.rank]--;
    }
  return counts;
}

function estimatePlayerPiece(r, c) {
  const p = board[r][c];
  if (!p || p.owner !== 0) return null;
  if (p.revealed) return { rank: p.rank, confidence: 1.0 };

  const remaining = getRemainingCounts(0);
  const hasMoved = aiKnownMovable.has(r * 10 + c);

  let totalWeight = 0, weightedRank = 0, bombProb = 0, flagProb = 0;
  for (const [rk, cnt] of Object.entries(remaining)) {
    const rank = parseInt(rk);
    if (cnt <= 0) continue;
    if (hasMoved && (rank === 0 || rank === 99)) continue;
    totalWeight += cnt;
    weightedRank += rank * cnt;
    if (rank === 0) bombProb += cnt;
    if (rank === 99) flagProb += cnt;
  }
  if (totalWeight === 0) return { rank: 5, confidence: 0 };
  return {
    rank: weightedRank / totalWeight,
    confidence: 0.3,
    bombChance: bombProb / totalWeight,
    flagChance: flagProb / totalWeight,
    hasMoved
  };
}

function aiAttackScore(aiPiece, tr, tc) {
  const target = board[tr][tc];
  if (!target || target.owner !== 0) return 0;

  if (target.revealed) {
    if (target.rank === 99) return 10000;
    if (target.rank === 0) return aiPiece.rank === 8 ? 60 : -200;
    if (aiPiece.rank === 10 && target.rank === 1) return 90;
    if (aiPiece.rank < target.rank) return 40 + (target.rank - aiPiece.rank) * 8;
    if (aiPiece.rank === target.rank) return -15;
    return -40 - (aiPiece.rank - target.rank) * 12;
  }

  const est = estimatePlayerPiece(tr, tc);
  if (!est) return 0;
  if (aiPiece.rank === 8 && !est.hasMoved && est.bombChance > 0.15) return 35;
  if (aiPiece.rank === 9) return 12;
  if (aiPiece.rank <= 2) return -20;
  if (aiPiece.rank <= 4) return -5;
  const estWinChance = est.rank > aiPiece.rank ? 0.6 : 0.3;
  return estWinChance * 20 - (1 - estWinChance) * 15;
}

function aiScoreMove(r, c, move) {
  const piece = board[r][c];
  let s = 0;
  if (move.attack) {
    s += aiAttackScore(piece, move.r, move.c);
  } else {
    const adv = move.r - r;
    s += adv * 3;
    s += (5 - Math.abs(move.c - 4.5)) * 0.6;
    if (piece.rank === 9) s += adv * 3;
    if (piece.rank <= 3) s += adv * 1.5;
    if (adv < 0 && r > 5) s -= 3;
  }
  s += (Math.random() - 0.3) * 4;
  return s;
}

function aiTakeTurn(g) {
  let bestMove = null, bestS = -Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.owner !== 1 || !canMove(p)) continue;
      for (const move of getValidMoves(r, c)) {
        const s = aiScoreMove(r, c, move);
        if (s > bestS) { bestS = s; bestMove = { fr: r, fc: c, tr: move.r, tc: move.c }; }
      }
    }
  }
  if (bestMove) doMove(bestMove.fr, bestMove.fc, bestMove.tr, bestMove.tc);
  if (phase !== 'gameover') {
    if (!hasMovesLeft(0)) { endGame('lose', g); return; }
    turn = 0;
    phase = 'play';
    message = 'Your turn';
  }
}

// ── Setup ──
function handleSetupClick(r, c) {
  if (r < 6 || r > 9 || isLake(r, c) || board[r][c]) return;
  const piece = setupPieces[setupIndex];
  board[r][c] = { owner: 0, ...piece, revealed: false };
  setupIndex++;
  if (setupIndex >= setupPieces.length) finishSetup();
}

function autoPlaceRemaining() {
  const empties = [];
  for (let r = 6; r < 10; r++)
    for (let c = 0; c < COLS; c++)
      if (!board[r][c] && !isLake(r, c)) empties.push({ r, c });
  shuffle(empties);
  while (setupIndex < setupPieces.length && empties.length > 0) {
    const cell = empties.shift();
    board[cell.r][cell.c] = { owner: 0, ...setupPieces[setupIndex], revealed: false };
    setupIndex++;
  }
  if (setupIndex >= setupPieces.length) finishSetup();
}

function finishSetup() {
  phase = 'play';
  turn = 0;
  aiKnownMovable = new Set();
  message = 'Your turn - select a piece';
}

function handlePlayClick(r, c, g) {
  if (selectedPiece) {
    const vm = validMoves.find(m => m.r === r && m.c === c);
    if (vm) {
      doMove(selectedPiece.r, selectedPiece.c, r, c);
      selectedPiece = null;
      validMoves = [];
      if (phase !== 'gameover') {
        turn = 1;
        phase = 'aiTurn';
        message = '';
        setTimeout(() => { if (phase === 'aiTurn') aiTakeTurn(g); }, 650);
      }
      return;
    }
  }
  if (board[r][c] && board[r][c].owner === 0) {
    if (canMove(board[r][c])) {
      const moves = getValidMoves(r, c);
      if (moves.length > 0) {
        selectedPiece = { r, c };
        validMoves = moves;
        message = board[r][c].name + ' selected';
      } else {
        message = 'No moves available';
        messageTimer = 60;
        selectedPiece = null;
        validMoves = [];
      }
    } else {
      message = board[r][c].name + ' cannot move';
      messageTimer = 60;
      selectedPiece = null;
      validMoves = [];
    }
  } else {
    selectedPiece = null;
    validMoves = [];
  }
}

function getCellFromMouse(e) {
  const canvas = document.getElementById('game');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  const c = Math.floor((mx - BOARD_X) / CELL);
  const r = Math.floor((my - BOARD_Y) / CELL);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
  return null;
}

function startGame(g) {
  initBoard();
  placeAIPieces();
  setupPieces = getSetupOrder();
  setupIndex = 0;
  phase = 'setup';
  selectedPiece = null;
  validMoves = [];
  score = 0;
  if (scoreEl) scoreEl.textContent = '0';
  turn = 0;
  lastBattle = null;
  battleTimer = 0;
  aiCaptured = [];
  playerCaptured = [];
  aiKnownMovable = new Set();
  message = 'Place your pieces on rows 7-10';
  messageTimer = 0;
  g.setState('playing');
}

// ── Draw helpers ──
function hexAlpha(hex, alpha) {
  // Convert e.g. '#4488ff' + alpha 0.25 → '#4488ff40'
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + a;
}


function drawPiece(renderer, text, r, c, piece) {
  const x = BOARD_X + c * CELL;
  const y = BOARD_Y + r * CELL;
  const pad = 3;
  const isPlayer = piece.owner === 0;
  const showInfo = isPlayer || piece.revealed || phase === 'gameover';

  const baseColor = isPlayer
    ? (showInfo ? C_PLAYER : C_PLAYER_DIM)
    : (showInfo ? C_AI : C_AI_DIM);

  if (showInfo) {
    renderer.setGlow(isPlayer ? C_PLAYER : C_AI, 0.6);
  }
  renderer.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, baseColor);
  renderer.setGlow(null);

  // Border (thin inset rect drawn as four lines)
  const borderColor = isPlayer ? C_PLAYER_LITE : C_AI_LITE;
  const bx = x + pad, by = y + pad, bw = CELL - pad * 2, bh = CELL - pad * 2;
  renderer.drawLine(bx, by, bx + bw, by, borderColor, 1);
  renderer.drawLine(bx + bw, by, bx + bw, by + bh, borderColor, 1);
  renderer.drawLine(bx + bw, by + bh, bx, by + bh, borderColor, 1);
  renderer.drawLine(bx, by + bh, bx, by, borderColor, 1);

  if (showInfo) {
    if (piece.rank === 0) {
      text.drawText('*', x + CELL / 2, y + CELL / 2 - 12, 20, '#ffffff', 'center');
      text.drawText('BOMB', x + CELL / 2, y + CELL / 2 + 8, 9, '#aaaaaa', 'center');
    } else if (piece.rank === 99) {
      text.drawText('F', x + CELL / 2, y + CELL / 2 - 12, 18, '#ffdd44', 'center');
      text.drawText('FLAG', x + CELL / 2, y + CELL / 2 + 8, 9, '#aaaaaa', 'center');
    } else {
      text.drawText('' + piece.rank, x + CELL / 2, y + CELL / 2 - 14, 17, '#ffffff', 'center');
      text.drawText(piece.abbr, x + CELL / 2, y + CELL / 2 + 8, 9, '#cccccc', 'center');
    }
  } else {
    text.drawText('?', x + CELL / 2, y + CELL / 2 - 10, 20, '#444466', 'center');
  }
}

function drawBattlePopup(renderer, text) {
  if (!lastBattle || battleTimer <= 0) return;
  const b = lastBattle;
  const alpha = Math.min(1.0, battleTimer / 25);

  const px = W / 2, py = BOARD_Y + BOARD_H / 2;
  const pw = 240, ph = 80;
  const bx = px - pw / 2, by = py - ph / 2;

  // Background
  renderer.fillRect(bx, by, pw, ph, hexAlpha('#080810', 0.94 * alpha));

  // Border with glow
  renderer.setGlow(THEME, 0.7 * alpha);
  renderer.drawLine(bx, by, bx + pw, by, THEME, 2);
  renderer.drawLine(bx + pw, by, bx + pw, by + ph, THEME, 2);
  renderer.drawLine(bx + pw, by + ph, bx, by + ph, THEME, 2);
  renderer.drawLine(bx, by + ph, bx, by, THEME, 2);
  renderer.setGlow(null);

  // Attacker label
  const atkColor = b.attacker.owner === 0 ? C_PLAYER : C_AI;
  const atkLabel = b.attacker.name + ' (' + (b.attacker.rank === 0 ? 'B' : b.attacker.rank === 99 ? 'F' : b.attacker.rank) + ')';
  text.drawText(atkLabel, px - 60, by + 12, 11, atkColor, 'center');

  // VS
  text.drawText('vs', px, by + 12, 13, '#888888', 'center');

  // Defender label
  const defColor = b.defender.owner === 0 ? C_PLAYER : C_AI;
  const defLabel = b.defender.name + ' (' + (b.defender.rank === 0 ? 'B' : b.defender.rank === 99 ? 'F' : b.defender.rank) + ')';
  text.drawText(defLabel, px + 60, by + 12, 11, defColor, 'center');

  // Result
  let resultStr, resultColor;
  if (b.result === 'attacker') {
    const won = b.attacker.owner === 0;
    resultStr = won ? 'You win the battle!' : 'AI wins the battle!';
    resultColor = won ? '#44ff88' : '#ff4444';
  } else if (b.result === 'defender') {
    const won = b.defender.owner === 0;
    resultStr = won ? 'Your piece holds!' : 'AI piece holds!';
    resultColor = won ? '#44ff88' : '#ff4444';
  } else {
    resultStr = 'Both destroyed!';
    resultColor = '#ffcc44';
  }
  text.drawText(resultStr, px, by + 50, 13, resultColor, 'center');
}

function drawCapturedPanel(renderer, text) {
  renderer.fillRect(0, PANEL_Y, W, H - PANEL_Y, '#0a0a14');

  const y0 = PANEL_Y + 4;
  text.drawText('Your captures:', BOARD_X, y0, 10, C_PLAYER, 'left');

  for (let i = 0; i < Math.min(aiCaptured.length, 20); i++) {
    const p = aiCaptured[i];
    const bx = BOARD_X + i * 22, by = y0 + 14;
    renderer.fillRect(bx, by, 20, 16, hexAlpha('#ff4444', 0.25));
    const label = p.rank === 0 ? 'B' : p.rank === 99 ? 'F' : '' + p.rank;
    text.drawText(label, bx + 10, by + 2, 9, '#ff8888', 'center');
  }

  text.drawText('AI captures:', BOARD_X + 260, y0, 10, C_AI, 'left');
  for (let i = 0; i < Math.min(playerCaptured.length, 10); i++) {
    const p = playerCaptured[i];
    const bx = BOARD_X + 260 + i * 22, by = y0 + 14;
    renderer.fillRect(bx, by, 20, 16, hexAlpha('#4488ff', 0.25));
    const label = p.rank === 0 ? 'B' : p.rank === 99 ? 'F' : '' + p.rank;
    text.drawText(label, bx + 10, by + 2, 9, '#88aaff', 'center');
  }
}

function drawStatusBar(renderer, text) {
  renderer.fillRect(0, 0, W, BOARD_Y - 2, '#111122');

  if (phase === 'setup') {
    const p = setupPieces[setupIndex];
    renderer.setGlow(THEME, 0.5);
    text.drawText('SETUP: Place ' + p.name + ' (' + (setupIndex + 1) + '/' + setupPieces.length + ')', W / 2, 8, 13, THEME, 'center');
    renderer.setGlow(null);
    text.drawText('Click rows 7-10  |  Right-click: auto-place all', W / 2, 30, 10, '#777777', 'center');
  } else if (phase === 'play') {
    renderer.setGlow(C_PLAYER, 0.5);
    text.drawText('YOUR TURN', W / 2, 8, 13, C_PLAYER, 'center');
    renderer.setGlow(null);
    if (message) {
      text.drawText(message, W / 2, 30, 10, '#777777', 'center');
    }
  } else if (phase === 'aiTurn') {
    renderer.setGlow(C_AI, 0.5);
    text.drawText('AI THINKING...', W / 2, 18, 13, C_AI, 'center');
    renderer.setGlow(null);
  } else if (phase === 'gameover') {
    renderer.setGlow(THEME, 0.5);
    text.drawText('GAME OVER', W / 2, 18, 14, THEME, 'center');
    renderer.setGlow(null);
  }
}

// ── Entry point ──
export function createGame() {
  const g = new Game('game');

  // Initialise state
  score = 0;
  board = [];
  phase = 'waiting';
  selectedPiece = null;
  validMoves = [];
  setupPieces = [];
  setupIndex = 0;
  turn = 0;
  lastBattle = null;
  battleTimer = 0;
  message = '';
  messageTimer = 0;
  aiCaptured = [];
  playerCaptured = [];
  aiKnownMovable = new Set();

  // Load best score
  const bestScore = parseInt(localStorage.getItem('stratego-best') || '0');
  if (bestEl) bestEl.textContent = bestScore;

  // Canvas mouse events
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.addEventListener('click', (e) => {
      pendingClicks.push(getCellFromMouse(e));
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      pendingRightClicks.push(true);
    });
  }

  g.onInit = () => {
    g.showOverlay('STRATEGO DIGITAL', 'Click to Start');
    g.setState('waiting');
  };

  g.setScoreFn(() => score);

  g.onUpdate = () => {
    if (battleTimer > 0) battleTimer--;
    if (messageTimer > 0) {
      messageTimer--;
      if (messageTimer === 0 && phase === 'play') message = 'Your turn';
    }

    // Process right-clicks (auto-place)
    while (pendingRightClicks.length > 0) {
      pendingRightClicks.shift();
      if (g.state === 'playing' && phase === 'setup') autoPlaceRemaining();
    }

    // Process left-clicks
    while (pendingClicks.length > 0) {
      const cell = pendingClicks.shift();

      if (g.state === 'waiting') {
        startGame(g);
        break;
      }
      if (g.state === 'over') {
        // waiting state is set by endGame's timeout; ignore clicks until then
        break;
      }

      if (!cell) continue;
      if (g.state === 'playing') {
        if (phase === 'setup') handleSetupClick(cell.r, cell.c);
        else if (phase === 'play') handlePlayClick(cell.r, cell.c, g);
      }
    }
  };

  g.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0d0d18');

    // Status bar
    drawStatusBar(renderer, text);

    // Board background
    renderer.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, C_BOARD);

    // Grid lines
    for (let r = 0; r <= ROWS; r++) {
      renderer.drawLine(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL, C_GRID, 1);
    }
    for (let c = 0; c <= COLS; c++) {
      renderer.drawLine(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H, C_GRID, 1);
    }

    // Lakes
    for (let r = 4; r <= 5; r++) {
      for (const c of [2, 3, 6, 7]) {
        const lx = BOARD_X + c * CELL + 1, ly = BOARD_Y + r * CELL + 1;
        renderer.fillRect(lx, ly, CELL - 2, CELL - 2, C_LAKE);
        // Water wave lines
        for (let i = 0; i < 3; i++) {
          const wy = ly + 10 + i * 11;
          renderer.drawLine(lx + 5, wy, lx + CELL - 7, wy, '#1a4a6e', 1);
        }
      }
    }

    // Setup zone highlight
    if (phase === 'setup') {
      for (let r = 6; r < 10; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c] && !isLake(r, c)) {
            renderer.fillRect(BOARD_X + c * CELL + 1, BOARD_Y + r * CELL + 1, CELL - 2, CELL - 2, hexAlpha('#4488ff', 0.06));
          }
        }
      }
    }

    // Valid move highlights
    for (const m of validMoves) {
      const mx = BOARD_X + m.c * CELL, my = BOARD_Y + m.r * CELL;
      if (m.attack) {
        renderer.fillRect(mx + 1, my + 1, CELL - 2, CELL - 2, hexAlpha('#ff3c3c', 0.25));
        renderer.drawLine(mx + 3, my + 3, mx + CELL - 3, my + 3, hexAlpha('#ff3c3c', 0.6), 2);
        renderer.drawLine(mx + CELL - 3, my + 3, mx + CELL - 3, my + CELL - 3, hexAlpha('#ff3c3c', 0.6), 2);
        renderer.drawLine(mx + CELL - 3, my + CELL - 3, mx + 3, my + CELL - 3, hexAlpha('#ff3c3c', 0.6), 2);
        renderer.drawLine(mx + 3, my + CELL - 3, mx + 3, my + 3, hexAlpha('#ff3c3c', 0.6), 2);
      } else {
        renderer.fillRect(mx + 1, my + 1, CELL - 2, CELL - 2, hexAlpha('#64ff64', 0.15));
        renderer.fillCircle(mx + CELL / 2, my + CELL / 2, 5, hexAlpha('#64ff64', 0.4));
      }
    }

    // Pieces
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) drawPiece(renderer, text, r, c, board[r][c]);

    // Selected highlight
    if (selectedPiece) {
      const sx = BOARD_X + selectedPiece.c * CELL;
      const sy = BOARD_Y + selectedPiece.r * CELL;
      renderer.setGlow(THEME, 0.7);
      renderer.drawLine(sx + 2, sy + 2, sx + CELL - 2, sy + 2, THEME, 3);
      renderer.drawLine(sx + CELL - 2, sy + 2, sx + CELL - 2, sy + CELL - 2, THEME, 3);
      renderer.drawLine(sx + CELL - 2, sy + CELL - 2, sx + 2, sy + CELL - 2, THEME, 3);
      renderer.drawLine(sx + 2, sy + CELL - 2, sx + 2, sy + 2, THEME, 3);
      renderer.setGlow(null);
    }

    // Battle popup
    drawBattlePopup(renderer, text);

    // Captured panel
    drawCapturedPanel(renderer, text);
  };

  g.start();
  return g;
}
