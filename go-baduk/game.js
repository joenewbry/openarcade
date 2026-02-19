// go-baduk/game.js — Go (Baduk) game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// --- Constants ---
const BOARD_SIZE = 9;
const MARGIN = 45;
const CELL_SIZE = (W - 2 * MARGIN) / (BOARD_SIZE - 1);
const STONE_RADIUS = CELL_SIZE * 0.44;
const KOMI = 6.5;
const BLACK = 1, WHITE = 2, EMPTY = 0;
const PASS_BTN = { x: W - 90, y: H - 35, w: 70, h: 28 };

// Star points for 9x9
const STAR_POINTS = [[2,2],[2,6],[6,2],[6,6],[4,4]];

// --- Game State ---
let score = 0;
let board = [];
let currentPlayer = BLACK;
let blackCaptures = 0;
let whiteCaptures = 0;
let koPoint = null;
let lastMove = null;
let consecutivePasses = 0;
let moveHistory = [];
let hoverPos = null;
let aiThinking = false;
let boardHistory = [];

// DOM refs
const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');

// Pending mouse events
let pendingClicks = [];
let pendingMoves = [];

// --- Board helpers ---
function initBoard() {
  board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      board[r][c] = EMPTY;
    }
  }
}

function copyBoard(b) {
  return b.map(row => row.slice());
}

function boardX(c) { return MARGIN + c * CELL_SIZE; }
function boardY(r) { return MARGIN + r * CELL_SIZE; }

// --- Liberty / Capture Logic ---
function getNeighbors(r, c) {
  const n = [];
  if (r > 0) n.push([r - 1, c]);
  if (r < BOARD_SIZE - 1) n.push([r + 1, c]);
  if (c > 0) n.push([r, c - 1]);
  if (c < BOARD_SIZE - 1) n.push([r, c + 1]);
  return n;
}

function getGroup(b, r, c) {
  const color = b[r][c];
  if (color === EMPTY) return { stones: [], liberties: new Set() };
  const visited = new Set();
  const stones = [];
  const liberties = new Set();
  const stack = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop();
    const key = cr * BOARD_SIZE + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    stones.push([cr, cc]);
    const neighbors = getNeighbors(cr, cc);
    for (const [nr, nc] of neighbors) {
      if (b[nr][nc] === EMPTY) {
        liberties.add(nr * BOARD_SIZE + nc);
      } else if (b[nr][nc] === color && !visited.has(nr * BOARD_SIZE + nc)) {
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, liberties };
}

function removeGroup(b, stones) {
  for (const [r, c] of stones) {
    b[r][c] = EMPTY;
  }
}

// Returns number of captures, or -1 if move is illegal
function tryPlace(b, r, c, color, checkKo, koP) {
  if (b[r][c] !== EMPTY) return -1;
  if (checkKo && koP && koP.r === r && koP.c === c) return -1;

  b[r][c] = color;
  const opponent = color === BLACK ? WHITE : BLACK;
  let captured = 0;
  let capturedStones = [];

  const neighbors = getNeighbors(r, c);
  const checkedGroups = new Set();
  for (const [nr, nc] of neighbors) {
    if (b[nr][nc] === opponent) {
      const gKey = nr * BOARD_SIZE + nc;
      if (checkedGroups.has(gKey)) continue;
      const group = getGroup(b, nr, nc);
      for (const [sr, sc] of group.stones) checkedGroups.add(sr * BOARD_SIZE + sc);
      if (group.liberties.size === 0) {
        captured += group.stones.length;
        capturedStones = capturedStones.concat(group.stones);
        removeGroup(b, group.stones);
      }
    }
  }

  // Check suicide
  const selfGroup = getGroup(b, r, c);
  if (selfGroup.liberties.size === 0) {
    b[r][c] = EMPTY;
    for (const [sr, sc] of capturedStones) {
      b[sr][sc] = opponent;
    }
    return -1;
  }

  return captured;
}

// Full move with ko update. Returns {captures, newKo} or null if illegal
function makeMove(b, r, c, color, koP) {
  const bCopy = copyBoard(b);
  const captures = tryPlace(bCopy, r, c, color, true, koP);
  if (captures < 0) return null;

  let newKo = null;
  if (captures === 1) {
    const selfGroup = getGroup(bCopy, r, c);
    if (selfGroup.stones.length === 1 && selfGroup.liberties.size === 1) {
      const libKey = [...selfGroup.liberties][0];
      newKo = { r: Math.floor(libKey / BOARD_SIZE), c: libKey % BOARD_SIZE };
    }
  }

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      b[i][j] = bCopy[i][j];
    }
  }

  return { captures, newKo };
}

// --- Scoring (Chinese rules / area scoring) ---
function scoreBoard(b) {
  const territory = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  const visited = new Set();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b[r][c] !== EMPTY || visited.has(r * BOARD_SIZE + c)) continue;

      const region = [];
      const stack = [[r, c]];
      let touchesBlack = false, touchesWhite = false;
      const regionVisited = new Set();

      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        const key = cr * BOARD_SIZE + cc;
        if (regionVisited.has(key)) continue;
        regionVisited.add(key);
        visited.add(key);

        if (b[cr][cc] === EMPTY) {
          region.push([cr, cc]);
          for (const [nr, nc] of getNeighbors(cr, cc)) {
            if (!regionVisited.has(nr * BOARD_SIZE + nc)) {
              stack.push([nr, nc]);
            }
          }
        } else if (b[cr][cc] === BLACK) {
          touchesBlack = true;
        } else {
          touchesWhite = true;
        }
      }

      if (touchesBlack && !touchesWhite) {
        for (const [er, ec] of region) territory[er][ec] = BLACK;
      } else if (touchesWhite && !touchesBlack) {
        for (const [er, ec] of region) territory[er][ec] = WHITE;
      }
    }
  }

  let blackScore = 0, whiteScore = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b[r][c] === BLACK || territory[r][c] === BLACK) blackScore++;
      if (b[r][c] === WHITE || territory[r][c] === WHITE) whiteScore++;
    }
  }

  whiteScore += KOMI;
  return { blackScore, whiteScore, territory };
}

// --- Legal moves ---
function isLikelyLegal(b, r, c, color, koP) {
  if (b[r][c] !== EMPTY) return false;
  if (koP && koP.r === r && koP.c === c) return false;
  const opponent = color === BLACK ? WHITE : BLACK;
  const neighbors = getNeighbors(r, c);
  for (const [nr, nc] of neighbors) {
    if (b[nr][nc] === EMPTY) return true;
  }
  for (const [nr, nc] of neighbors) {
    if (b[nr][nc] === opponent) {
      const group = getGroup(b, nr, nc);
      if (group.liberties.size === 1) return true;
    }
  }
  for (const [nr, nc] of neighbors) {
    if (b[nr][nc] === color) {
      const group = getGroup(b, nr, nc);
      if (group.liberties.size > 1) return true;
    }
  }
  return false;
}

function getLegalMoves(b, color, koP) {
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b[r][c] !== EMPTY) continue;
      if (koP && koP.r === r && koP.c === c) continue;
      if (isLikelyLegal(b, r, c, color, koP)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

function getLegalMovesStrict(b, color, koP) {
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (b[r][c] !== EMPTY) continue;
      if (koP && koP.r === r && koP.c === c) continue;
      const testBoard = copyBoard(b);
      const result = tryPlace(testBoard, r, c, color, true, koP);
      if (result >= 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

// Check if position is an eye for the given color
function isEye(b, r, c, color) {
  if (b[r][c] !== EMPTY) return false;
  const neighbors = getNeighbors(r, c);
  for (const [nr, nc] of neighbors) {
    if (b[nr][nc] !== color) return false;
  }
  const diags = [];
  if (r > 0 && c > 0) diags.push([r-1, c-1]);
  if (r > 0 && c < BOARD_SIZE-1) diags.push([r-1, c+1]);
  if (r < BOARD_SIZE-1 && c > 0) diags.push([r+1, c-1]);
  if (r < BOARD_SIZE-1 && c < BOARD_SIZE-1) diags.push([r+1, c+1]);

  let sameColor = 0;
  for (const [dr, dc] of diags) {
    if (b[dr][dc] === color) sameColor++;
  }
  const needed = diags.length <= 2 ? diags.length : diags.length - 1;
  return sameColor >= needed;
}

// --- MCTS AI ---
class MCTSNode {
  constructor(board, color, koP, parent, move) {
    this.board = board;
    this.color = color;
    this.koPoint = koP;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = null;
    this.consecutivePasses = 0;
  }

  getUntriedMoves() {
    if (this.untriedMoves === null) {
      this.untriedMoves = getLegalMovesStrict(this.board, this.color, this.koPoint);
      this.untriedMoves.push('pass');
    }
    return this.untriedMoves;
  }

  ucb1(explorationParam = 1.41) {
    if (this.visits === 0) return Infinity;
    return (this.wins / this.visits) + explorationParam * Math.sqrt(Math.log(this.parent.visits) / this.visits);
  }

  bestChild() {
    let best = null, bestScore = -Infinity;
    for (const child of this.children) {
      const s = child.ucb1();
      if (s > bestScore) {
        bestScore = s;
        best = child;
      }
    }
    return best;
  }
}

function mctsAI(b, color, koP, simulations) {
  const root = new MCTSNode(copyBoard(b), color, koP, null, null);

  for (let i = 0; i < simulations; i++) {
    // 1. Selection
    let node = root;
    while (node.getUntriedMoves().length === 0 && node.children.length > 0) {
      node = node.bestChild();
    }

    // 2. Expansion
    const untried = node.getUntriedMoves();
    if (untried.length > 0 && node.consecutivePasses < 2) {
      const moveIdx = Math.floor(Math.random() * untried.length);
      const move = untried.splice(moveIdx, 1)[0];

      const newBoard = copyBoard(node.board);
      let newKo = null;
      let newConsecutivePasses = 0;

      if (move === 'pass') {
        newConsecutivePasses = node.consecutivePasses + 1;
      } else {
        const result = makeMove(newBoard, move[0], move[1], node.color, node.koPoint);
        if (result) {
          newKo = result.newKo;
        }
        newConsecutivePasses = 0;
      }

      const nextColor = node.color === BLACK ? WHITE : BLACK;
      const child = new MCTSNode(newBoard, nextColor, newKo, node, move);
      child.consecutivePasses = newConsecutivePasses;
      node.children.push(child);
      node = child;
    }

    // 3. Simulation (random playout)
    const simBoard = copyBoard(node.board);
    let simColor = node.color;
    let simKo = node.koPoint;
    let simPasses = node.consecutivePasses;
    let movesLeft = 81 * 2;

    while (simPasses < 2 && movesLeft > 0) {
      movesLeft--;
      const legal = getLegalMoves(simBoard, simColor, simKo);

      if (legal.length === 0 || Math.random() < 0.1) {
        simPasses++;
        simColor = simColor === BLACK ? WHITE : BLACK;
        simKo = null;
        continue;
      }

      let move = null;
      let attempts = 0;
      while (attempts < 5) {
        const candidate = legal[Math.floor(Math.random() * legal.length)];
        if (!isEye(simBoard, candidate[0], candidate[1], simColor)) {
          move = candidate;
          break;
        }
        attempts++;
      }
      if (!move) {
        simPasses++;
        simColor = simColor === BLACK ? WHITE : BLACK;
        simKo = null;
        continue;
      }

      simPasses = 0;
      const result = makeMove(simBoard, move[0], move[1], simColor, simKo);
      simKo = result ? result.newKo : null;
      simColor = simColor === BLACK ? WHITE : BLACK;
    }

    // 4. Score and backpropagate
    const finalScore = scoreBoard(simBoard);
    const aiWins = color === WHITE ?
      (finalScore.whiteScore > finalScore.blackScore ? 1 : 0) :
      (finalScore.blackScore > finalScore.whiteScore ? 1 : 0);

    while (node !== null) {
      node.visits++;
      if (node.parent) {
        if (node.parent.color === color) {
          node.wins += aiWins;
        } else {
          node.wins += (1 - aiWins);
        }
      } else {
        node.wins += aiWins;
      }
      node = node.parent;
    }
  }

  let bestChild = null, bestVisits = -1;
  for (const child of root.children) {
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      bestChild = child;
    }
  }

  if (!bestChild) return 'pass';
  return bestChild.move;
}

// --- Input helpers ---
function getIntersection(mx, my) {
  const c = Math.round((mx - MARGIN) / CELL_SIZE);
  const r = Math.round((my - MARGIN) / CELL_SIZE);
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
  const dx = mx - boardX(c);
  const dy = my - boardY(r);
  if (Math.sqrt(dx * dx + dy * dy) > CELL_SIZE * 0.5) return null;
  return { r, c };
}

function isInPassButton(mx, my) {
  const { x, y, w, h } = PASS_BTN;
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

// --- Score display ---
function updateScoreDisplay() {
  const scoring = scoreBoard(board);
  scoreEl.textContent = scoring.blackScore;
  aiScoreEl.textContent = scoring.whiteScore.toFixed(1);
  score = scoring.blackScore;
}

// --- Drawing ---
function drawBoard(renderer) {
  const boardLeft = MARGIN - CELL_SIZE * 0.55;
  const boardTop = MARGIN - CELL_SIZE * 0.55;
  const boardW = (BOARD_SIZE - 1) * CELL_SIZE + CELL_SIZE * 1.1;
  const boardH = boardW;

  // Wood background - approximated as a flat warm color since WebGL doesn't support gradients
  // Use a warm gold/amber color to simulate the wood look
  renderer.fillRect(boardLeft, boardTop, boardW, boardH, '#d4a843');

  // Subtle wood grain lines (darker horizontal stripes)
  for (let i = 0; i < 30; i++) {
    const y = boardTop + (boardH / 30) * i + Math.sin(i * 0.7) * 3;
    renderer.drawLine(boardLeft + 2, y, boardLeft + boardW - 2, y, 'rgba(0,0,0,0.04)', 1);
  }

  // Grid lines
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Horizontal
    renderer.drawLine(boardX(0), boardY(i), boardX(BOARD_SIZE - 1), boardY(i), '#333', 1);
    // Vertical
    renderer.drawLine(boardX(i), boardY(0), boardX(i), boardY(BOARD_SIZE - 1), '#333', 1);
  }
}

function drawStarPoints(renderer) {
  for (const [r, c] of STAR_POINTS) {
    renderer.fillCircle(boardX(c), boardY(r), 3.5, '#333');
  }
}

function drawCoordinateLabels(text) {
  const letters = 'ABCDEFGHJ'; // I is traditionally skipped in Go
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Top labels
    text.drawText(letters[i], boardX(i), MARGIN - CELL_SIZE * 0.55 - 18, 11, '#888', 'center');
    // Left labels
    text.drawText(String(BOARD_SIZE - i), MARGIN - CELL_SIZE * 0.55 - 20, boardY(i) - 6, 11, '#888', 'right');
  }
}

function drawStone(renderer, x, y, color, alpha) {
  const alphaHex = alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0') : '';

  if (color === BLACK) {
    // Black stone: dark circle with subtle highlight
    const stoneColor = alpha < 1 ? `rgba(34,34,34,${alpha})` : '#222222';
    const highlightColor = alpha < 1 ? `rgba(85,85,85,${alpha})` : '#555555';
    renderer.fillCircle(x, y, STONE_RADIUS, stoneColor);
    // Subtle highlight in upper-left quadrant
    renderer.fillCircle(x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, STONE_RADIUS * 0.35, highlightColor);
  } else {
    // White stone: light circle with shadow and highlight
    if (alpha >= 1) {
      // Shadow
      renderer.fillCircle(x + 2, y + 2, STONE_RADIUS, 'rgba(0,0,0,0.25)');
    }
    const stoneColor = alpha < 1 ? `rgba(232,232,232,${alpha})` : '#e8e8e8';
    const highlightColor = alpha < 1 ? `rgba(255,255,255,${alpha * 0.8})` : 'rgba(255,255,255,0.8)';
    renderer.fillCircle(x, y, STONE_RADIUS, stoneColor);
    // Highlight
    renderer.fillCircle(x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, STONE_RADIUS * 0.35, highlightColor);
  }
}

function drawLastMoveIndicator(renderer) {
  if (lastMove && lastMove !== 'pass' && board[lastMove.r] && board[lastMove.r][lastMove.c] !== EMPTY) {
    const lx = boardX(lastMove.c), ly = boardY(lastMove.r);
    renderer.fillCircle(lx, ly, STONE_RADIUS * 0.3, '#ff0000');
  }
}

function drawPassButton(renderer, text, hover) {
  const { x, y, w, h } = PASS_BTN;
  const bgColor = hover ? 'rgba(232,208,160,0.3)' : 'rgba(232,208,160,0.15)';
  renderer.fillRect(x, y, w, h, bgColor);
  renderer.strokePoly([
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x, y: y + h }
  ], '#e8d0a0', 1.5, true);
  text.drawText('PASS', x + w / 2, y + h / 2 - 7, 13, '#e8d0a0', 'center');
}

function drawTerritoryMarkers(renderer) {
  const scoring = scoreBoard(board);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) {
        if (scoring.territory[r][c] === BLACK) {
          renderer.fillRect(boardX(c) - 6, boardY(r) - 6, 12, 12, 'rgba(17,17,17,0.5)');
        } else if (scoring.territory[r][c] === WHITE) {
          renderer.fillRect(boardX(c) - 6, boardY(r) - 6, 12, 12, 'rgba(240,240,240,0.5)');
        }
      }
    }
  }
}

// --- Game actions ---
function doPlayerPass(game) {
  consecutivePasses++;
  lastMove = 'pass';
  koPoint = null;
  moveHistory.push({ color: BLACK, pass: true });
  currentPlayer = WHITE;

  if (consecutivePasses >= 2) {
    endGame(game);
    return;
  }

  updateScoreDisplay();
  triggerAIMove(game);
}

function triggerAIMove(game) {
  aiThinking = true;
  // Use setTimeout so the draw call has a chance to show "AI is thinking..."
  setTimeout(() => doAIMove(game), 50);
}

function doAIMove(game) {
  const stoneCount = board.flat().filter(x => x !== EMPTY).length;
  const sims = stoneCount < 10 ? 400 : (stoneCount < 30 ? 500 : 600);

  const move = mctsAI(board, WHITE, koPoint, sims);

  if (move === 'pass') {
    consecutivePasses++;
    lastMove = 'pass';
    koPoint = null;
    moveHistory.push({ color: WHITE, pass: true });

    if (consecutivePasses >= 2) {
      aiThinking = false;
      endGame(game);
      return;
    }
  } else {
    const [r, c] = move;
    const result = makeMove(board, r, c, WHITE, koPoint);
    if (result) {
      whiteCaptures += result.captures;
      koPoint = result.newKo;
      lastMove = { r, c };
      consecutivePasses = 0;
      moveHistory.push({ color: WHITE, r, c });
    } else {
      consecutivePasses++;
      lastMove = 'pass';
      koPoint = null;
      moveHistory.push({ color: WHITE, pass: true });

      if (consecutivePasses >= 2) {
        aiThinking = false;
        endGame(game);
        return;
      }
    }
  }

  currentPlayer = BLACK;
  aiThinking = false;
  updateScoreDisplay();
}

function endGame(game) {
  const scoring = scoreBoard(board);
  const blackFinal = scoring.blackScore;
  const whiteFinal = scoring.whiteScore;

  scoreEl.textContent = blackFinal;
  aiScoreEl.textContent = whiteFinal.toFixed(1);
  score = blackFinal;

  let winner, msg;
  if (blackFinal > whiteFinal) {
    winner = 'Black Wins!';
    msg = `B ${blackFinal} - W ${whiteFinal.toFixed(1)}\nClick to play again`;
  } else {
    winner = 'White Wins!';
    msg = `W ${whiteFinal.toFixed(1)} - B ${blackFinal}\nClick to play again`;
  }

  game.showOverlay(winner, msg);
  game.setState('over');
}

// --- Export ---
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Mouse event handlers — direct listeners on canvas
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    pendingMoves.push({ mx, my });
  });

  canvasEl.addEventListener('mouseleave', () => {
    hoverPos = null;
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ mx, my });
  });

  game.onInit = () => {
    initBoard();
    currentPlayer = BLACK;
    blackCaptures = 0;
    whiteCaptures = 0;
    koPoint = null;
    lastMove = null;
    consecutivePasses = 0;
    moveHistory = [];
    boardHistory = [];
    hoverPos = null;
    aiThinking = false;
    score = 0;
    pendingClicks = [];
    pendingMoves = [];

    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = KOMI.toFixed(1);

    game.showOverlay('GO (BADUK)', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // Process pending mouse moves (update hover)
    while (pendingMoves.length > 0) {
      const { mx, my } = pendingMoves.pop(); // only need the latest
      pendingMoves = [];
      hoverPos = getIntersection(mx, my);
    }

    // Waiting state
    if (game.state === 'waiting') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        // Start game
        initBoard();
        currentPlayer = BLACK;
        blackCaptures = 0;
        whiteCaptures = 0;
        koPoint = null;
        lastMove = null;
        consecutivePasses = 0;
        moveHistory = [];
        boardHistory = [];
        hoverPos = null;
        aiThinking = false;
        score = 0;
        if (scoreEl) scoreEl.textContent = '0';
        if (aiScoreEl) aiScoreEl.textContent = KOMI.toFixed(1);
        game.setState('playing');
      }
      return;
    }

    // Game over state
    if (game.state === 'over') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // Playing state — process clicks
    if (pendingClicks.length === 0) return;
    if (aiThinking) {
      pendingClicks = [];
      return;
    }
    if (currentPlayer !== BLACK) {
      pendingClicks = [];
      return;
    }

    const { mx, my } = pendingClicks.shift();
    pendingClicks = [];

    // Check pass button
    if (isInPassButton(mx, my)) {
      doPlayerPass(game);
      return;
    }

    // Place stone
    const pos = getIntersection(mx, my);
    if (!pos) return;

    const { r, c } = pos;
    if (board[r][c] !== EMPTY) return;

    const result = makeMove(board, r, c, BLACK, koPoint);
    if (!result) return; // Illegal move

    blackCaptures += result.captures;
    koPoint = result.newKo;
    lastMove = { r, c };
    consecutivePasses = 0;
    moveHistory.push({ color: BLACK, r, c });

    currentPlayer = WHITE;
    updateScoreDisplay();
    triggerAIMove(game);
  };

  game.onDraw = (renderer, text) => {
    // Board background and grid
    drawBoard(renderer);
    drawStarPoints(renderer);
    drawCoordinateLabels(text);

    // Stones
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== EMPTY) {
          drawStone(renderer, boardX(c), boardY(r), board[r][c], 1.0);
        }
      }
    }

    // Last move indicator
    drawLastMoveIndicator(renderer);

    // Ghost stone on hover
    if (game.state === 'playing' && currentPlayer === BLACK && hoverPos && !aiThinking) {
      const { r, c } = hoverPos;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === EMPTY) {
        if (isLikelyLegal(board, r, c, BLACK, koPoint)) {
          drawStone(renderer, boardX(c), boardY(r), BLACK, 0.4);
        }
      }
    }

    // Territory markers during game over
    if (game.state === 'over') {
      drawTerritoryMarkers(renderer);
    }

    // Pass button
    if (game.state === 'playing' && currentPlayer === BLACK && !aiThinking) {
      drawPassButton(renderer, text, false);
    }

    // AI thinking indicator
    if (aiThinking) {
      text.drawText('AI is thinking...', W / 2, H - 18, 14, '#e8d0a0', 'center');
    }

    // Captures display
    text.drawText('Captures: ' + blackCaptures, 10, H - 18, 12, '#aaa', 'left');
    text.drawText('Captures: ' + whiteCaptures, W - 10, H - 18, 12, '#aaa', 'right');
  };

  game.start();
  return game;
}
