// hex-empire/game.js — Hex Empire as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// ---- Constants ----
const GRID_ROWS = 9;
const GRID_COLS = 9;
const HEX_SIZE = 28; // radius of hex (center to vertex)
const OWNER_NONE = 0;
const OWNER_PLAYER = 1;
const OWNER_AI = 2;

const COLOR_BG = '#1a1a2e';
const COLOR_NEUTRAL = '#333333';
const COLOR_NEUTRAL_BORDER = '#444444';
const COLOR_PLAYER = '#4488ff';
const COLOR_PLAYER_BORDER = '#3366cc';
const COLOR_AI = '#ff9900';
const COLOR_AI_BORDER = '#cc7700';

const HEX_W = 2 * HEX_SIZE;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

// ---- Game State ----
let hexGrid = [];
let selectedHex = null;
let currentTurn = 'player';
let turnNumber = 0;
let playerCapital = null;
let aiCapital = null;
let validMoves = [];
let aiThinking = false;
let hoverHex = null;
let score = 0;
let aiScore = 0;

// ---- DOM refs ----
const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');
const turnIndicatorEl = document.getElementById('turnIndicator');

// ---- Pending mouse events ----
let pendingClicks = [];
let pendingMoves = [];

// ---- Hex Grid Geometry (flat-top hexagons) ----
function getGridOffset() {
  const totalW = (GRID_COLS - 1) * 1.5 * HEX_SIZE + HEX_W;
  const totalH = GRID_ROWS * HEX_H + HEX_H * 0.5;
  const ox = (W - totalW) / 2 + HEX_SIZE;
  const oy = (H - totalH) / 2 + HEX_H / 2;
  return { ox, oy };
}

function hexCenter(row, col) {
  const { ox, oy } = getGridOffset();
  const x = ox + col * 1.5 * HEX_SIZE;
  const y = oy + row * HEX_H + (col % 2 === 1 ? HEX_H / 2 : 0);
  return { x, y };
}

function hexVertices(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i);
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return pts;
}

function getNeighbors(row, col) {
  const neighbors = [];
  const even = col % 2 === 0;
  const dirs = even ? [
    [-1, 0], [1, 0],
    [-1, -1], [0, -1],
    [-1, 1], [0, 1]
  ] : [
    [-1, 0], [1, 0],
    [0, -1], [1, -1],
    [0, 1], [1, 1]
  ];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
      neighbors.push({ row: nr, col: nc });
    }
  }
  return neighbors;
}

// ---- Game Initialization ----
function createGrid() {
  hexGrid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    hexGrid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      hexGrid[r][c] = { owner: OWNER_NONE, armies: 0, isCapital: false };
    }
  }
}

function resetState() {
  createGrid();
  selectedHex = null;
  validMoves = [];
  currentTurn = 'player';
  turnNumber = 0;
  aiThinking = false;
  hoverHex = null;
  score = 0;
  aiScore = 0;
  pendingClicks = [];
  pendingMoves = [];

  playerCapital = { row: Math.floor(GRID_ROWS / 2), col: 0 };
  aiCapital = { row: Math.floor(GRID_ROWS / 2), col: GRID_COLS - 1 };

  const pH = hexGrid[playerCapital.row][playerCapital.col];
  pH.owner = OWNER_PLAYER;
  pH.armies = 5;
  pH.isCapital = true;

  const pNeighbors = getNeighbors(playerCapital.row, playerCapital.col);
  for (let i = 0; i < Math.min(2, pNeighbors.length); i++) {
    const n = pNeighbors[i];
    hexGrid[n.row][n.col].owner = OWNER_PLAYER;
    hexGrid[n.row][n.col].armies = 2;
  }

  const aH = hexGrid[aiCapital.row][aiCapital.col];
  aH.owner = OWNER_AI;
  aH.armies = 5;
  aH.isCapital = true;

  const aNeighbors = getNeighbors(aiCapital.row, aiCapital.col);
  for (let i = 0; i < Math.min(2, aNeighbors.length); i++) {
    const n = aNeighbors[i];
    hexGrid[n.row][n.col].owner = OWNER_AI;
    hexGrid[n.row][n.col].armies = 2;
  }

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (hexGrid[r][c].owner === OWNER_NONE) {
        hexGrid[r][c].armies = 1 + Math.floor(Math.random() * 2);
      }
    }
  }

  if (scoreEl) scoreEl.textContent = '0';
  if (aiScoreEl) aiScoreEl.textContent = '0';
  if (turnIndicatorEl) {
    turnIndicatorEl.textContent = '';
    turnIndicatorEl.className = 'turn-indicator';
  }
  updateScores();
}

// ---- Army Generation ----
function generateArmies(owner) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (hexGrid[r][c].owner === owner) {
        hexGrid[r][c].armies += 1;
        if (hexGrid[r][c].isCapital) {
          hexGrid[r][c].armies += 1;
        }
      }
    }
  }
}

// ---- Combat ----
function resolveAttack(fromRow, fromCol, toRow, toCol) {
  const attacker = hexGrid[fromRow][fromCol];
  const defender = hexGrid[toRow][toCol];

  if (attacker.armies <= 1) return false;

  const attackForce = attacker.armies - 1;
  const defendForce = defender.armies;

  const atkRoll = attackForce + Math.random() * 1.5 - 0.75;
  const defRoll = defendForce + Math.random() * 1.5 - 0.75;

  if (atkRoll > defRoll) {
    const survivingArmies = Math.max(1, Math.ceil(attackForce - defendForce * 0.6));
    const wasCapital = defender.isCapital;
    defender.owner = attacker.owner;
    defender.armies = survivingArmies;
    if (wasCapital) {
      defender.isCapital = false;
    }
    attacker.armies = 1;
    return true;
  } else {
    attacker.armies = 1;
    defender.armies = Math.max(1, defender.armies - Math.floor((attackForce * 0.5) * 0.3));
    return false;
  }
}

function expandInto(fromRow, fromCol, toRow, toCol) {
  return resolveAttack(fromRow, fromCol, toRow, toCol);
}

function reinforce(fromRow, fromCol, toRow, toCol) {
  const source = hexGrid[fromRow][fromCol];
  const target = hexGrid[toRow][toCol];
  if (source.owner === target.owner && source.armies > 1) {
    const transfer = source.armies - 1;
    target.armies += transfer;
    source.armies = 1;
    return true;
  }
  return false;
}

// ---- Score Tracking ----
function updateScores() {
  let playerCount = 0;
  let aiCount = 0;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (hexGrid[r][c].owner === OWNER_PLAYER) playerCount++;
      else if (hexGrid[r][c].owner === OWNER_AI) aiCount++;
    }
  }
  score = playerCount;
  aiScore = aiCount;
  if (scoreEl) scoreEl.textContent = playerCount;
  if (aiScoreEl) aiScoreEl.textContent = aiCount;
  return { playerCount, aiCount };
}

function updateTurnIndicator() {
  if (!turnIndicatorEl) return;
  if (currentTurn === 'player') {
    turnIndicatorEl.textContent = 'Your Turn';
    turnIndicatorEl.className = 'turn-indicator player-turn';
  } else {
    turnIndicatorEl.textContent = 'AI Thinking...';
    turnIndicatorEl.className = 'turn-indicator ai-turn';
  }
}

// ---- Victory Check ----
function checkVictory(game) {
  const totalHexes = GRID_ROWS * GRID_COLS;
  const { playerCount, aiCount } = updateScores();

  if (hexGrid[playerCapital.row][playerCapital.col].owner === OWNER_AI) {
    endGame(game, false, 'Capital captured!');
    return true;
  }
  if (hexGrid[aiCapital.row][aiCapital.col].owner === OWNER_PLAYER) {
    endGame(game, true, 'Enemy capital captured!');
    return true;
  }
  if (playerCount >= Math.ceil(totalHexes * 0.6)) {
    endGame(game, true, 'Territory domination!');
    return true;
  }
  if (aiCount >= Math.ceil(totalHexes * 0.6)) {
    endGame(game, false, 'AI achieved domination!');
    return true;
  }
  if (playerCount === 0) {
    endGame(game, false, 'All territory lost!');
    return true;
  }
  if (aiCount === 0) {
    endGame(game, true, 'AI eliminated!');
    return true;
  }
  return false;
}

function endGame(game, playerWon, reason) {
  if (turnIndicatorEl) turnIndicatorEl.textContent = '';
  if (playerWon) {
    game.showOverlay('VICTORY', reason + ' — Click to play again');
  } else {
    game.showOverlay('DEFEAT', reason + ' — Click to play again');
  }
  game.setState('over');
}

// ---- Player Input Helpers ----
function getHexAtPixel(px, py) {
  let closestDist = Infinity;
  let closestHex = null;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const { x, y } = hexCenter(r, c);
      const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
      if (dist < HEX_SIZE * 0.9 && dist < closestDist) {
        closestDist = dist;
        closestHex = { row: r, col: c };
      }
    }
  }
  return closestHex;
}

function getValidTargets(row, col) {
  const hex = hexGrid[row][col];
  if (hex.owner !== OWNER_PLAYER || hex.armies <= 1) return [];
  const neighbors = getNeighbors(row, col);
  return neighbors.filter(n => hexGrid[n.row][n.col].owner !== OWNER_PLAYER);
}

function getValidReinforceTargets(row, col) {
  const hex = hexGrid[row][col];
  if (hex.owner !== OWNER_PLAYER || hex.armies <= 1) return [];
  const neighbors = getNeighbors(row, col);
  return neighbors.filter(n => hexGrid[n.row][n.col].owner === OWNER_PLAYER);
}

// ---- Turn Management ----
// AI turn is scheduled via a simple frame-counter delay
let aiTurnFrameDelay = -1;

function endPlayerTurn(game) {
  currentTurn = 'ai';
  updateTurnIndicator();
  aiThinking = true;
  // Schedule AI turn after ~24 frames (~400ms at 60fps)
  aiTurnFrameDelay = 24;
}

// ---- AI System ----
function runAITurn(game) {
  generateArmies(OWNER_AI);

  for (let action = 0; action < 3; action++) {
    if (game.state === 'over') return;
    const bestMove = findBestAIMove();
    if (!bestMove) break;

    if (bestMove.type === 'attack') {
      expandInto(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
    } else if (bestMove.type === 'reinforce') {
      reinforce(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
    }

    updateScores();
    if (checkVictory(game)) return;
  }

  if (game.state !== 'over') {
    turnNumber++;
    currentTurn = 'player';
    generateArmies(OWNER_PLAYER);
    updateTurnIndicator();
    updateScores();
    aiThinking = false;
  }
}

function findBestAIMove() {
  let bestScore = -Infinity;
  let bestMove = null;

  const aiHexes = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (hexGrid[r][c].owner === OWNER_AI && hexGrid[r][c].armies > 1) {
        aiHexes.push({ row: r, col: c });
      }
    }
  }

  for (const hex of aiHexes) {
    const neighbors = getNeighbors(hex.row, hex.col);
    for (const n of neighbors) {
      const target = hexGrid[n.row][n.col];
      if (target.owner === OWNER_AI) {
        const s = evaluateReinforce(hex, n);
        if (s > bestScore) { bestScore = s; bestMove = { type: 'reinforce', from: hex, to: n }; }
      } else {
        const s = evaluateAttack(hex, n);
        if (s > bestScore) { bestScore = s; bestMove = { type: 'attack', from: hex, to: n }; }
      }
    }
  }

  return bestMove;
}

function evaluateAttack(from, to) {
  const attacker = hexGrid[from.row][from.col];
  const defender = hexGrid[to.row][to.col];
  const attackForce = attacker.armies - 1;
  const defendForce = defender.armies;

  if (attackForce <= defendForce * 0.6) return -100;

  let s = (attackForce - defendForce) * 5;

  if (to.row === playerCapital.row && to.col === playerCapital.col) s += 200;
  if (defender.owner === OWNER_PLAYER) s += 30; else s += 10;

  const distToPlayerCap = hexDistance(to.row, to.col, playerCapital.row, playerCapital.col);
  s += (GRID_COLS - distToPlayerCap) * 8;

  const neighbors = getNeighbors(to.row, to.col);
  const enemyNeighborCount = neighbors.filter(n => hexGrid[n.row][n.col].owner === OWNER_PLAYER).length;
  s += enemyNeighborCount * 5;

  const ratio = attackForce / Math.max(1, defendForce);
  if (ratio < 1.3) s -= 20;
  if (ratio > 2) s += 15;

  const distFromAICap = hexDistance(from.row, from.col, aiCapital.row, aiCapital.col);
  if (distFromAICap <= 2 && attacker.armies <= 3) s -= 30;

  return s;
}

function evaluateReinforce(from, to) {
  const source = hexGrid[from.row][from.col];
  const target = hexGrid[to.row][to.col];
  const neighbors = getNeighbors(to.row, to.col);
  const frontLine = neighbors.some(n => hexGrid[n.row][n.col].owner !== OWNER_AI);

  if (!frontLine) return -50;

  let s = 0;
  const fromDist = hexDistance(from.row, from.col, playerCapital.row, playerCapital.col);
  const toDist = hexDistance(to.row, to.col, playerCapital.row, playerCapital.col);
  if (toDist < fromDist) s += 15;

  const enemyAdjacent = neighbors.filter(n => hexGrid[n.row][n.col].owner === OWNER_PLAYER).length;
  s += enemyAdjacent * 10;
  if (target.armies < 3 && frontLine) s += 10;

  const targetDistToCap = hexDistance(to.row, to.col, aiCapital.row, aiCapital.col);
  if (targetDistToCap <= 2) {
    const playerNear = neighbors.some(n => hexGrid[n.row][n.col].owner === OWNER_PLAYER);
    if (playerNear) s += 25;
  }

  if (source.armies <= 2) s -= 15;
  return s;
}

function hexDistance(r1, c1, r2, c2) {
  const cube1 = offsetToCube(r1, c1);
  const cube2 = offsetToCube(r2, c2);
  return Math.max(
    Math.abs(cube1.x - cube2.x),
    Math.abs(cube1.y - cube2.y),
    Math.abs(cube1.z - cube2.z)
  );
}

function offsetToCube(row, col) {
  const x = col;
  const z = row - Math.floor(col / 2);
  const y = -x - z;
  return { x, y, z };
}

// ---- Rendering Helpers ----
function drawHexFilled(renderer, cx, cy, size, color) {
  const pts = hexVertices(cx, cy, size);
  renderer.fillPoly(pts, color);
}

function drawHexStroked(renderer, cx, cy, size, color, width) {
  const pts = hexVertices(cx, cy, size);
  renderer.strokePoly(pts, color, width, true);
}

function drawStarPoints(cx, cy, spikes, outerR, innerR) {
  const pts = [];
  const rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    const oAngle = rot + (i * 2 * Math.PI / spikes);
    const iAngle = oAngle + Math.PI / spikes;
    pts.push({ x: cx + Math.cos(oAngle) * outerR, y: cy + Math.sin(oAngle) * outerR });
    pts.push({ x: cx + Math.cos(iAngle) * innerR, y: cy + Math.sin(iAngle) * innerR });
  }
  return pts;
}

function drawHex(renderer, text, row, col, now) {
  const hex = hexGrid[row][col];
  const { x, y } = hexCenter(row, col);

  let fillColor, borderColor, glowColor;
  switch (hex.owner) {
    case OWNER_PLAYER:
      fillColor = COLOR_PLAYER;
      borderColor = COLOR_PLAYER_BORDER;
      glowColor = COLOR_PLAYER;
      break;
    case OWNER_AI:
      fillColor = COLOR_AI;
      borderColor = COLOR_AI_BORDER;
      glowColor = COLOR_AI;
      break;
    default:
      fillColor = COLOR_NEUTRAL;
      borderColor = COLOR_NEUTRAL_BORDER;
      glowColor = null;
  }

  // Glow for owned hexes
  if (glowColor) {
    renderer.setGlow(glowColor, 0.5);
  }

  drawHexFilled(renderer, x, y, HEX_SIZE - 2, fillColor);
  renderer.setGlow(null);

  drawHexStroked(renderer, x, y, HEX_SIZE - 2, borderColor, 1.5);

  // Inner shine for owned hexes (lighter cap highlight)
  if (hex.owner !== OWNER_NONE) {
    drawHexFilled(renderer, x - 3, y - 3, (HEX_SIZE - 3) * 0.6, 'rgba(255,255,255,0.07)');
  }

  // Capital star
  if (hex.isCapital) {
    const starColor = hex.owner === OWNER_PLAYER ? COLOR_PLAYER : COLOR_AI;
    renderer.setGlow(starColor, 0.8);
    const starPts = drawStarPoints(x, y - 2, 5, 10, 4);
    renderer.fillPoly(starPts, '#ffffff');
    renderer.setGlow(null);
  }

  // Army count text
  if (hex.armies > 0) {
    let textColor, shadowColor;
    if (hex.owner === OWNER_NONE) {
      textColor = '#999999';
      shadowColor = null;
    } else if (hex.owner === OWNER_PLAYER) {
      textColor = '#ffffff';
      shadowColor = COLOR_PLAYER;
    } else {
      textColor = '#ffffff';
      shadowColor = COLOR_AI;
    }

    const textY = hex.isCapital ? y + 10 : y;
    if (shadowColor) {
      renderer.setGlow(shadowColor, 0.4);
    }
    text.drawText(String(hex.armies), x, textY - 7, 14, textColor, 'center');
    renderer.setGlow(null);
  }
}

// ---- Handle click ----
function handleClick(game, px, py, button) {
  if (game.state === 'waiting') {
    game.hideOverlay();
    game.setState('playing');
    currentTurn = 'player';
    updateTurnIndicator();
    generateArmies(OWNER_PLAYER);
    return;
  }

  if (game.state === 'over') {
    resetState();
    game.showOverlay('HEX EMPIRE', 'Click anywhere to start');
    game.setState('waiting');
    return;
  }

  if (game.state !== 'playing' || currentTurn !== 'player' || aiThinking) return;

  if (button === 2) {
    selectedHex = null;
    validMoves = [];
    return;
  }

  const clicked = getHexAtPixel(px, py);
  if (!clicked) {
    selectedHex = null;
    validMoves = [];
    return;
  }

  const clickedHex = hexGrid[clicked.row][clicked.col];

  if (selectedHex) {
    const isInMoveList = validMoves.some(m => m.row === clicked.row && m.col === clicked.col);
    const isNeighbor = getNeighbors(selectedHex.row, selectedHex.col).some(n => n.row === clicked.row && n.col === clicked.col);

    if (isInMoveList && isNeighbor && clickedHex.owner === OWNER_PLAYER) {
      reinforce(selectedHex.row, selectedHex.col, clicked.row, clicked.col);
      selectedHex = null;
      validMoves = [];
      updateScores();
      if (!checkVictory(game)) {
        endPlayerTurn(game);
      }
    } else if (isInMoveList && isNeighbor && clickedHex.owner !== OWNER_PLAYER) {
      expandInto(selectedHex.row, selectedHex.col, clicked.row, clicked.col);
      selectedHex = null;
      validMoves = [];
      updateScores();
      if (!checkVictory(game)) {
        endPlayerTurn(game);
      }
    } else if (clickedHex.owner === OWNER_PLAYER && clickedHex.armies > 1) {
      selectedHex = { row: clicked.row, col: clicked.col };
      validMoves = getValidTargets(clicked.row, clicked.col)
        .concat(getValidReinforceTargets(clicked.row, clicked.col));
    } else {
      selectedHex = null;
      validMoves = [];
    }
  } else {
    if (clickedHex.owner === OWNER_PLAYER && clickedHex.armies > 1) {
      selectedHex = { row: clicked.row, col: clicked.col };
      validMoves = getValidTargets(clicked.row, clicked.col)
        .concat(getValidReinforceTargets(clicked.row, clicked.col));
    }
  }
}

// ---- createGame ----
export function createGame() {
  const game = new Game('game');

  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x: px, y: py, button: e.button });
  });

  canvasEl.addEventListener('mousemove', (e) => {
    if (game.state !== 'playing' || currentTurn !== 'player') return;
    const rect = canvasEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    pendingMoves.push({ x: px, y: py });
  });

  game.onInit = () => {
    resetState();
    game.showOverlay('HEX EMPIRE', 'Click anywhere to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  let frameCounter = 0;

  game.onUpdate = () => {
    frameCounter++;

    // Process mouse moves (hover — use latest only)
    if (pendingMoves.length > 0) {
      const { x, y } = pendingMoves[pendingMoves.length - 1];
      pendingMoves = [];
      const newHover = (game.state === 'playing' && currentTurn === 'player' && !aiThinking)
        ? getHexAtPixel(x, y)
        : null;
      hoverHex = newHover;
    }

    // Process clicks
    while (pendingClicks.length > 0) {
      const { x, y, button } = pendingClicks.shift();
      handleClick(game, x, y, button);
    }

    // AI turn delay
    if (aiThinking && aiTurnFrameDelay > 0) {
      aiTurnFrameDelay--;
      if (aiTurnFrameDelay === 0) {
        aiTurnFrameDelay = -1;
        runAITurn(game);
      }
    }
  };

  game.onDraw = (renderer, text, alpha) => {
    const now = performance.now();

    // Background
    renderer.fillRect(0, 0, W, H, COLOR_BG);

    // Draw all hexes
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        drawHex(renderer, text, r, c, now);
      }
    }

    // Selection highlight
    if (selectedHex && game.state === 'playing') {
      const { x, y } = hexCenter(selectedHex.row, selectedHex.col);
      renderer.setGlow('#ffffff', 0.8);
      drawHexStroked(renderer, x, y, HEX_SIZE - 1, '#ffffff', 3);
      renderer.setGlow(null);
    }

    // Valid move highlights
    if (validMoves.length > 0 && game.state === 'playing') {
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      for (const m of validMoves) {
        const { x, y } = hexCenter(m.row, m.col);
        const target = hexGrid[m.row][m.col];
        if (target.owner === OWNER_PLAYER) {
          // Reinforce target — green overlay
          drawHexFilled(renderer, x, y, HEX_SIZE - 2, `rgba(100,255,100,0.15)`);
          const alpha2 = Math.round((0.3 + pulse * 0.4) * 255).toString(16).padStart(2, '0');
          drawHexStroked(renderer, x, y, HEX_SIZE - 2, `#64ff64${alpha2}`, 2);
        } else {
          // Attack target — red overlay
          drawHexFilled(renderer, x, y, HEX_SIZE - 2, `rgba(255,80,80,0.35)`);
          const alpha2 = Math.round((0.3 + pulse * 0.4) * 255).toString(16).padStart(2, '0');
          drawHexStroked(renderer, x, y, HEX_SIZE - 2, `#ff5050${alpha2}`, 2);
        }
      }
    }

    // Hover highlight
    if (hoverHex && game.state === 'playing' && currentTurn === 'player') {
      const hex = hexGrid[hoverHex.row][hoverHex.col];
      const isSelectable = hex.owner === OWNER_PLAYER && hex.armies > 1;
      const isValidTarget = validMoves.some(m => m.row === hoverHex.row && m.col === hoverHex.col);
      if (isSelectable || isValidTarget) {
        const { x, y } = hexCenter(hoverHex.row, hoverHex.col);
        drawHexFilled(renderer, x, y, HEX_SIZE - 2, 'rgba(255,255,255,0.18)');
      }
    }

    // Turn info on canvas
    if (game.state === 'playing') {
      text.drawText('Turn ' + (turnNumber + 1), 10, 10, 12, '#555555', 'left');
    }
  };

  game.start();
  return game;
}
