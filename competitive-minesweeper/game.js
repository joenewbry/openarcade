// competitive-minesweeper/game.js — Competitive Minesweeper (Player vs AI) WebGL 2 engine port

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// Board config
const COLS = 10, ROWS = 10, MINES = 15;
const CELL = 18;
const GAP = 2;
const BOARD_W = COLS * (CELL + GAP) + GAP;
const BOARD_H = ROWS * (CELL + GAP) + GAP;
const BOARD_LEFT_X = 14;
const BOARD_RIGHT_X = W - BOARD_W - 14;
const BOARD_Y = 62;

// Timer
const TOTAL_TIME = 120;

// Number colors (standard minesweeper, indices 1-8)
const NUM_COLORS = [
  '',
  '#4488ff', '#44aa44', '#ee4444', '#8844aa',
  '#aa4422', '#44aaaa', '#888888', '#888888'
];

// ── Module-scope state ──
let score, best;
let gameActive; // true while game is in 'playing' and not in countdown
let timeLeft, lastUpdateTime;
let countdown, countdownStartTime;

let playerBoard, aiBoard;
let playerCellsLeft, aiCellsLeft;
let playerMineHits, aiMineHits;
let playerFlags, aiFlags;
let playerFirstMove, aiFirstMove;

let aiTimer, aiDelay;

// Mouse click queue (left + right clicks)
let pendingClicks;

// ── DOM refs ──
let scoreEl, bestEl;

// ── Board helpers ──

function createBoard() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = {
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
        exploded: false
      };
    }
  }
  return board;
}

function placeMines(board, excludeR, excludeC) {
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (board[r][c].mine) continue;
    if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }
  // Calculate adjacency
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

function countUnrevealed(board) {
  let count = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!board[r][c].revealed && !board[r][c].mine) count++;
  return count;
}

function countFlags(board) {
  let count = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c].flagged) count++;
  return count;
}

// Returns number of safe cells revealed, or -1 if mine hit
function revealCell(board, r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
  const cell = board[r][c];
  if (cell.revealed || cell.flagged) return 0;

  cell.revealed = true;

  if (cell.mine) {
    cell.exploded = true;
    return -1;
  }

  let cleared = 1;
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const result = revealCell(board, r + dr, c + dc);
        if (result > 0) cleared += result;
      }
    }
  }
  return cleared;
}

function revealAllMines(board) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c].mine && !board[r][c].revealed)
        board[r][c].revealed = true;
}

// ── AI ──

function aiThink() {
  if (aiCellsLeft <= 0) return;

  // Build probability map
  const prob = [];
  for (let r = 0; r < ROWS; r++) {
    prob[r] = new Array(COLS).fill(-1);
  }

  let totalUnrevealed = 0;
  const totalUnflaggedMines = MINES - countFlags(aiBoard);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!aiBoard[r][c].revealed && !aiBoard[r][c].flagged)
        totalUnrevealed++;

  const baseProbability = totalUnflaggedMines / Math.max(1, totalUnrevealed);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!aiBoard[r][c].revealed && !aiBoard[r][c].flagged)
        prob[r][c] = baseProbability;

  // Constraint-based reasoning from revealed numbers
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!aiBoard[r][c].revealed || aiBoard[r][c].adjacent === 0) continue;

      const adj = aiBoard[r][c].adjacent;
      let flaggedNeighbors = 0;
      const unrevealedNeighbors = [];

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          if (aiBoard[nr][nc].flagged) flaggedNeighbors++;
          else if (!aiBoard[nr][nc].revealed) unrevealedNeighbors.push({ r: nr, c: nc });
        }
      }

      const remainingMines = adj - flaggedNeighbors;
      if (unrevealedNeighbors.length === 0) continue;

      if (remainingMines === unrevealedNeighbors.length && remainingMines > 0) {
        for (const n of unrevealedNeighbors) prob[n.r][n.c] = 1.0;
      } else if (remainingMines <= 0) {
        for (const n of unrevealedNeighbors) prob[n.r][n.c] = 0;
      } else {
        const localProb = remainingMines / unrevealedNeighbors.length;
        for (const n of unrevealedNeighbors)
          if (prob[n.r][n.c] < localProb) prob[n.r][n.c] = localProb;
      }
    }
  }

  // Flag cells with probability 1.0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (prob[r][c] === 1.0 && !aiBoard[r][c].flagged) {
        aiBoard[r][c].flagged = true;
        aiFlags = countFlags(aiBoard);
        return;
      }
    }
  }

  // Find safest cell
  let safest = null;
  let safestProb = 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (prob[r][c] >= 0 && prob[r][c] < 1.0 && !aiBoard[r][c].revealed && !aiBoard[r][c].flagged) {
        if (prob[r][c] < safestProb) {
          safestProb = prob[r][c];
          safest = { r, c };
        }
      }
    }
  }

  if (!safest) {
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!aiBoard[r][c].revealed && !aiBoard[r][c].flagged) {
          safest = { r, c };
          break outer;
        }
      }
    }
  }

  if (safest) {
    if (aiFirstMove) {
      placeMines(aiBoard, safest.r, safest.c);
      aiFirstMove = false;
    }
    const result = revealCell(aiBoard, safest.r, safest.c);
    if (result === -1) {
      aiMineHits++;
      timeLeft += 5; // penalty to AI: player gains 5 seconds
    }
    aiCellsLeft = countUnrevealed(aiBoard);
    aiFlags = countFlags(aiBoard);
  }
}

// ── Draw helpers ──

// Draw a raised unrevealed cell using fillRect calls
function drawRaisedCell(renderer, cx, cy, dimColor) {
  renderer.fillRect(cx, cy, CELL, CELL, '#2a2a4e');
  renderer.fillRect(cx, cy, CELL, 2, '#3a3a6e');           // top highlight
  renderer.fillRect(cx, cy, 2, CELL, '#3a3a6e');           // left highlight
  renderer.fillRect(cx, cy + CELL - 2, CELL, 2, '#1a1a2e'); // bottom shadow
  renderer.fillRect(cx + CELL - 2, cy, 2, CELL, '#1a1a2e'); // right shadow
  renderer.fillRect(cx + 2, cy + 2, CELL - 4, CELL - 4, dimColor); // face
}

function drawBoard(renderer, text, board, bx, by, label, cellsLeft, flags, mineHits, isPlayer) {
  const themeColor = isPlayer ? '#ff8844' : '#e66666';
  const dimColor   = isPlayer ? 'rgba(255,136,68,0.25)' : 'rgba(230,102,102,0.25)';

  // Label (14px bold, centered above board)
  renderer.setGlow(themeColor, 0.5);
  text.drawText(label, bx + BOARD_W / 2, by - 28, 14, themeColor, 'center');
  renderer.setGlow(null);

  // Stats line
  const statsStr = 'Left:' + cellsLeft + ' Flags:' + flags + '/' + MINES + ' Hits:' + mineHits;
  text.drawText(statsStr, bx + BOARD_W / 2, by - 14, 10, '#aaaaaa', 'center');

  // Board background
  renderer.fillRect(bx - 1, by - 1, BOARD_W + 2, BOARD_H + 2, '#0d0d1a');

  // Cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      const cx = bx + GAP + c * (CELL + GAP);
      const cy = by + GAP + r * (CELL + GAP);

      if (cell.revealed) {
        if (cell.exploded) {
          // Red exploded cell
          renderer.fillRect(cx, cy, CELL, CELL, '#ff2222');
          // Mine glyph — draw as a dark circle
          renderer.fillCircle(cx + CELL / 2, cy + CELL / 2, 5, '#111111');
          renderer.fillCircle(cx + CELL / 2, cy + CELL / 2, 2, '#ff6666');
        } else if (cell.mine) {
          // Revealed mine (end-of-game, not exploded)
          renderer.fillRect(cx, cy, CELL, CELL, '#333333');
          renderer.fillCircle(cx + CELL / 2, cy + CELL / 2, 4, '#999999');
          renderer.fillCircle(cx + CELL / 2, cy + CELL / 2, 1.5, '#cccccc');
        } else {
          // Revealed safe cell
          renderer.fillRect(cx, cy, CELL, CELL, '#1a1a2e');
          renderer.drawLine(cx, cy, cx + CELL, cy, '#2a2a4e', 1);
          renderer.drawLine(cx, cy, cx, cy + CELL, '#2a2a4e', 1);

          if (cell.adjacent > 0) {
            const numColor = NUM_COLORS[cell.adjacent] || '#888888';
            renderer.setGlow(numColor, 0.3);
            text.drawText(String(cell.adjacent), cx + CELL / 2, cy + CELL / 2 - 6, 12, numColor, 'center');
            renderer.setGlow(null);
          }
        }
      } else if (cell.flagged) {
        drawRaisedCell(renderer, cx, cy, dimColor);
        // Flag: red rect pole + triangle
        renderer.fillRect(cx + CELL / 2 - 1, cy + 3, 2, CELL - 6, '#888888');
        renderer.fillPoly([
          { x: cx + CELL / 2 + 1, y: cy + 3 },
          { x: cx + CELL / 2 + 1, y: cy + 3 + 6 },
          { x: cx + CELL / 2 + 7, y: cy + 3 + 3 }
        ], '#ff4444');
      } else {
        drawRaisedCell(renderer, cx, cy, dimColor);
      }
    }
  }
}

function drawTimer(renderer, text) {
  const centerX = W / 2;
  const timerY = 20; // y is TOP of text; label "TIME" at y=4, time at y=20

  let timerColor = '#ff8844';
  if (timeLeft <= 10) timerColor = '#ff2222';
  else if (timeLeft <= 30) timerColor = '#ffaa22';

  // "TIME" label
  text.drawText('TIME', centerX, 4, 10, '#666666', 'center');

  // Time string
  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.floor(Math.max(0, timeLeft) % 60);
  const timeStr = String(mins) + ':' + String(secs).padStart(2, '0');

  renderer.setGlow(timerColor, 0.5);
  text.drawText(timeStr, centerX, timerY, 24, timerColor, 'center');
  renderer.setGlow(null);
}

function drawMiddleDivider(renderer) {
  const cx = W / 2;
  // Dashed vertical line (simulate with short fillRect segments)
  const dashH = 4, gapH = 4;
  let y = BOARD_Y - 35;
  const endY = BOARD_Y + BOARD_H + 5;
  while (y < endY) {
    renderer.fillRect(cx - 0.5, y, 1, Math.min(dashH, endY - y), '#333333');
    y += dashH + gapH;
  }
}

function drawVsLabel(text) {
  text.drawText('VS', W / 2, BOARD_Y + BOARD_H + 8, 12, '#555555', 'center');
}

function drawCountdownOverlay(renderer, text) {
  const elapsed = (Date.now() - countdownStartTime) / 1000;
  const num = 3 - Math.floor(elapsed);
  if (num <= 0) return;

  // Semi-transparent overlay
  renderer.fillRect(0, 0, W, H, 'rgba(26,26,46,0.7)');

  renderer.setGlow('#ff8844', 0.8);
  text.drawText(String(num), W / 2, H / 2 - 32, 80, '#ff8844', 'center');
  renderer.setGlow(null);
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  scoreEl = document.getElementById('score');
  bestEl = document.getElementById('best');
  best = parseInt(localStorage.getItem('compMinesweeper_best') || '0');
  if (bestEl) bestEl.textContent = best;

  const canvasEl = document.getElementById('game');

  // Prevent context menu on canvas
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  // Queue mouse events for processing in onUpdate
  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    pendingClicks.push({ x, y, button: e.button });
  });

  game.onInit = () => {
    score = 0;
    if (scoreEl) scoreEl.textContent = '0';

    timeLeft = TOTAL_TIME;
    lastUpdateTime = 0;

    playerMineHits = 0;
    aiMineHits = 0;
    playerFlags = 0;
    aiFlags = 0;
    playerFirstMove = true;
    aiFirstMove = true;

    playerBoard = createBoard();
    aiBoard = createBoard();

    playerCellsLeft = ROWS * COLS - MINES;
    aiCellsLeft = ROWS * COLS - MINES;

    countdown = 3;
    countdownStartTime = 0;
    gameActive = false;

    aiTimer = 0;
    aiDelay = 400 + Math.random() * 200;

    pendingClicks = [];

    game.showOverlay('COMPETITIVE MINESWEEPER', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        // Start game: show countdown
        game.setState('playing');
        countdown = 3;
        countdownStartTime = Date.now();
        lastUpdateTime = Date.now();
        gameActive = false;
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Handle countdown
    if (countdown > 0) {
      const elapsed = (Date.now() - countdownStartTime) / 1000;
      if (elapsed >= 3) {
        countdown = 0;
        gameActive = true;
        lastUpdateTime = Date.now();
      }
      // Discard clicks during countdown
      pendingClicks = [];
      return;
    }

    // Tick time
    const now = Date.now();
    if (lastUpdateTime === 0) lastUpdateTime = now;
    const dtSec = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    timeLeft -= dtSec;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame(game, false, 'time');
      return;
    }

    // AI move
    aiTimer += dtSec * 1000;
    if (aiTimer >= aiDelay) {
      aiTimer -= aiDelay;
      aiDelay = 300 + Math.random() * 300;
      aiThink();
      if (aiCellsLeft <= 0) {
        endGame(game, false, 'ai');
        return;
      }
    }

    // Process player clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const mx = click.x, my = click.y;

      const relX = mx - BOARD_LEFT_X - GAP;
      const relY = my - BOARD_Y - GAP;
      if (relX < 0 || relY < 0) continue;

      const c = Math.floor(relX / (CELL + GAP));
      const r = Math.floor(relY / (CELL + GAP));
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;

      // Validate click landed inside a cell (not in the gap)
      const cellLocalX = relX - c * (CELL + GAP);
      const cellLocalY = relY - r * (CELL + GAP);
      if (cellLocalX > CELL || cellLocalY > CELL) continue;

      const cell = playerBoard[r][c];
      if (cell.revealed) continue;

      if (click.button === 2) {
        // Right click — flag toggle
        cell.flagged = !cell.flagged;
        playerFlags = countFlags(playerBoard);
      } else if (click.button === 0) {
        // Left click — reveal
        if (cell.flagged) continue;

        if (playerFirstMove) {
          placeMines(playerBoard, r, c);
          playerFirstMove = false;
        }

        const result = revealCell(playerBoard, r, c);
        if (result === -1) {
          playerMineHits++;
          timeLeft -= 5;
          if (timeLeft <= 0) {
            timeLeft = 0;
            endGame(game, false, 'time');
            return;
          }
        }
        playerCellsLeft = countUnrevealed(playerBoard);
        playerFlags = countFlags(playerBoard);

        if (playerCellsLeft <= 0) {
          endGame(game, true, 'player');
          return;
        }
      }
    }

    // Update score DOM
    const cellsCleared = (ROWS * COLS - MINES) - playerCellsLeft;
    const currentScore = Math.max(0, cellsCleared * 5 - playerMineHits * 10);
    if (scoreEl) scoreEl.textContent = currentScore;
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') return;

    drawBoard(renderer, text, playerBoard, BOARD_LEFT_X, BOARD_Y, 'PLAYER', playerCellsLeft, playerFlags, playerMineHits, true);
    drawBoard(renderer, text, aiBoard, BOARD_RIGHT_X, BOARD_Y, 'AI', aiCellsLeft, aiFlags, aiMineHits, false);
    drawMiddleDivider(renderer);
    drawTimer(renderer, text);
    drawVsLabel(text);

    if (countdown > 0) {
      drawCountdownOverlay(renderer, text);
    }
  };

  game.start();
  return game;
}

// ── End game ──

function endGame(game, playerWon, reason) {
  const cellsCleared = (ROWS * COLS - MINES) - playerCellsLeft;
  const timeBonus = Math.max(0, Math.floor(timeLeft));
  const penaltyLoss = playerMineHits * 10;

  let score_calc;
  if (playerWon) {
    score_calc = cellsCleared * 10 + timeBonus * 5 - penaltyLoss;
  } else {
    score_calc = cellsCleared * 5 - penaltyLoss;
  }
  score = Math.max(0, score_calc);

  if (scoreEl) scoreEl.textContent = score;

  if (score > best) {
    best = score;
    if (bestEl) bestEl.textContent = best;
    localStorage.setItem('compMinesweeper_best', String(best));
  }

  revealAllMines(playerBoard);
  revealAllMines(aiBoard);

  let titleStr;
  if (playerWon) {
    titleStr = 'YOU WIN!';
  } else if (reason === 'ai') {
    titleStr = 'AI WINS!';
  } else {
    titleStr = 'TIME UP!';
  }

  game.setState('over');
  game.showOverlay(titleStr, 'Score: ' + score + ' | Click to Play Again');
}
