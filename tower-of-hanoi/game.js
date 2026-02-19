// tower-of-hanoi/game.js — Tower of Hanoi game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 400;

const THEME = '#8da';

// Disk colors - neon palette
const DISK_COLORS = [
  '#f44', '#f80', '#ff0', '#0f0', '#0ff', '#48f', '#a4f', '#f08'
];

// Peg geometry
const PEG_WIDTH = 6;
const BASE_Y = H - 50;
const PEG_HEIGHT = 220;
const PEG_TOP = BASE_Y - PEG_HEIGHT;
const PEG_SPACING = W / 3;
const PEG_X = [PEG_SPACING / 2, PEG_SPACING * 1.5, PEG_SPACING * 2.5];

// Disk geometry
const MAX_DISK_WIDTH = 120;
const MIN_DISK_WIDTH = 30;
const DISK_HEIGHT = 24;
const DISK_GAP = 2;

// ── State ──
let score, best, level, numDisks;
let pegs; // pegs[0..2] — arrays of disk sizes (bottom to top)
let selectedPeg, heldDisk, cursorPeg;
let invalidFlash; // { peg, timer } or null
let optimalMoves;
let moveHistory;
let lastOverlayTitle; // track what kind of overlay is showing
let frameCount;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function getDiskWidth(size) {
  const range = MAX_DISK_WIDTH - MIN_DISK_WIDTH;
  return MIN_DISK_WIDTH + (size - 1) / Math.max(1, numDisks - 1) * range;
}

function getDiskColor(size) {
  return DISK_COLORS[(size - 1) % DISK_COLORS.length];
}

function resetPuzzle() {
  pegs = [[], [], []];
  for (let i = numDisks; i >= 1; i--) {
    pegs[0].push(i);
  }
  selectedPeg = -1;
  heldDisk = -1;
  cursorPeg = 0;
  invalidFlash = null;
  optimalMoves = Math.pow(2, numDisks) - 1;
  moveHistory = [];
  score = 0;
  scoreEl.textContent = '0';
}

function flashInvalid(pegIndex) {
  invalidFlash = { peg: pegIndex, timer: 20 };
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    level = 1;
    numDisks = 3;
    best = best || 0;
    score = 0;
    frameCount = 0;
    scoreEl.textContent = '0';
    resetPuzzle();
    lastOverlayTitle = 'TOWER OF HANOI';
    game.showOverlay('TOWER OF HANOI', 'Press SPACE to start\n3 disks - Arrow keys or 1/2/3');
    game.setState('waiting');
  };

  game.setScoreFn(() => {
    // Higher score = better. Use efficiency-based scoring like the original.
    if (score === 0) return 0;
    const efficiency = optimalMoves / score;
    return Math.max(10, Math.round(1000 * efficiency));
  });

  function tryPickUp(pegIndex) {
    if (pegs[pegIndex].length === 0) {
      flashInvalid(pegIndex);
      return;
    }
    selectedPeg = pegIndex;
    heldDisk = pegs[pegIndex][pegs[pegIndex].length - 1];
    cursorPeg = pegIndex;
  }

  function tryPlace(pegIndex) {
    if (selectedPeg === pegIndex) {
      // Put it back down
      selectedPeg = -1;
      heldDisk = -1;
      return;
    }

    const topDisk = pegs[pegIndex].length > 0
      ? pegs[pegIndex][pegs[pegIndex].length - 1]
      : Infinity;

    if (heldDisk > topDisk) {
      // Invalid move - can't place larger on smaller
      flashInvalid(pegIndex);
      return;
    }

    // Valid move
    pegs[selectedPeg].pop();
    pegs[pegIndex].push(heldDisk);
    score++;
    scoreEl.textContent = score;
    moveHistory.push({ from: selectedPeg, to: pegIndex });

    selectedPeg = -1;
    heldDisk = -1;
    cursorPeg = pegIndex;

    // Check win: all disks on peg 2 (rightmost)
    if (pegs[2].length === numDisks) {
      levelComplete();
    }
  }

  function handlePegAction(pegIndex) {
    if (game.state !== 'playing') return;
    if (heldDisk === -1) {
      tryPickUp(pegIndex);
    } else {
      tryPlace(pegIndex);
    }
  }

  function undoMove() {
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop();
    const disk = pegs[lastMove.to].pop();
    pegs[lastMove.from].push(disk);
    score--;
    scoreEl.textContent = score;
    selectedPeg = -1;
    heldDisk = -1;
  }

  function levelComplete() {
    const efficiency = optimalMoves / score;
    const levelScore = Math.max(10, Math.round(1000 * efficiency));

    if (levelScore > best) {
      best = levelScore;
      bestEl.textContent = best;
    }

    lastOverlayTitle = 'LEVEL COMPLETE!';
    const rating = score === optimalMoves ? 'PERFECT!'
      : score <= optimalMoves * 1.5 ? 'Great!' : 'Solved!';
    game.showOverlay('LEVEL COMPLETE!',
      `${rating} ${score} moves (optimal: ${optimalMoves})\nScore: ${levelScore} - Press SPACE for Level ${level + 1}`);
    game.setState('over');
  }

  function advanceLevel() {
    level++;
    numDisks = Math.min(numDisks + 1, 8);
    resetPuzzle();
    game.hideOverlay();
    game.setState('playing');
  }

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    // Tick invalid flash
    if (invalidFlash) {
      invalidFlash.timer--;
      if (invalidFlash.timer <= 0) {
        invalidFlash = null;
      }
    }

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.hideOverlay();
        game.setState('playing');
        resetPuzzle();
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter') ||
          input.wasPressed('1') || input.wasPressed('2') || input.wasPressed('3') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        if (lastOverlayTitle === 'LEVEL COMPLETE!') {
          advanceLevel();
        } else {
          game.onInit();
        }
      }
      return;
    }

    // ── Playing state ──
    if (input.wasPressed('1')) {
      cursorPeg = 0;
      handlePegAction(0);
    } else if (input.wasPressed('2')) {
      cursorPeg = 1;
      handlePegAction(1);
    } else if (input.wasPressed('3')) {
      cursorPeg = 2;
      handlePegAction(2);
    } else if (input.wasPressed('ArrowLeft')) {
      cursorPeg = Math.max(0, cursorPeg - 1);
    } else if (input.wasPressed('ArrowRight')) {
      cursorPeg = Math.min(2, cursorPeg + 1);
    } else if (input.wasPressed(' ') || input.wasPressed('Enter')) {
      handlePegAction(cursorPeg);
    } else if (input.wasPressed('u') || input.wasPressed('z')) {
      undoMove();
    }

    // Expose game data for potential ML extraction
    window.gameData = {
      pegs: pegs.map(p => [...p]),
      numDisks,
      level,
      moves: score,
      optimalMoves,
      heldDisk,
      selectedPeg,
      cursorPeg
    };
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Info bar at top
    text.drawText(
      `Level ${level}  |  Disks: ${numDisks}  |  Optimal: ${optimalMoves} moves`,
      W / 2, 8, 14, '#888888', 'center'
    );

    // Draw base platform
    const baseWidth = W - 40;
    const baseHeight = 8;
    renderer.setGlow(THEME, 0.4);
    renderer.fillRect((W - baseWidth) / 2, BASE_Y, baseWidth, baseHeight, '#0f3460');
    renderer.setGlow(null);

    // Draw pegs and disks
    for (let i = 0; i < 3; i++) {
      const px = PEG_X[i];

      // Peg label
      const labelColor = (cursorPeg === i && game.state === 'playing') ? THEME : '#555555';
      text.drawText((i + 1).toString(), px, BASE_Y + 14, 16, labelColor, 'center');

      // Peg pole
      const isFlashing = invalidFlash && invalidFlash.peg === i;
      const flashAlpha = isFlashing
        ? Math.sin(invalidFlash.timer * 0.8) * 0.5 + 0.5
        : 0;

      let pegColor;
      if (isFlashing) {
        // Red flash — encode alpha into hex
        const r = Math.round(77 + flashAlpha * 178); // 0x4d..0xff
        const g = Math.round(17 + flashAlpha * 51);  // dim
        const b = Math.round(17 + flashAlpha * 51);
        pegColor = `rgb(${r}, ${g}, ${b})`;
        renderer.setGlow('#f44', 0.6);
      } else if (cursorPeg === i && game.state === 'playing') {
        pegColor = '#2a4a3e';
        renderer.setGlow(THEME, 0.4);
      } else {
        pegColor = '#16213e';
      }

      renderer.fillRect(px - PEG_WIDTH / 2, PEG_TOP, PEG_WIDTH, PEG_HEIGHT, pegColor);
      renderer.setGlow(null);

      // Peg top cap (small circle)
      const capColor = (cursorPeg === i && game.state === 'playing') ? THEME : '#0f3460';
      renderer.fillCircle(px, PEG_TOP, PEG_WIDTH / 2 + 2, capColor);

      // Draw disks on this peg
      for (let j = 0; j < pegs[i].length; j++) {
        const diskSize = pegs[i][j];
        // Skip the held disk (top of selected peg)
        if (selectedPeg === i && j === pegs[i].length - 1) continue;

        const diskW = getDiskWidth(diskSize);
        const diskY = BASE_Y - (j + 1) * (DISK_HEIGHT + DISK_GAP);
        const diskX = px - diskW / 2;
        const color = getDiskColor(diskSize);

        drawDisk(renderer, diskX, diskY, diskW, DISK_HEIGHT, color, 0.5);
      }
    }

    // Draw held disk floating above cursor peg
    if (heldDisk !== -1) {
      const px = PEG_X[cursorPeg];
      const diskW = getDiskWidth(heldDisk);
      const diskY = PEG_TOP - DISK_HEIGHT - 15;
      const diskX = px - diskW / 2;
      const color = getDiskColor(heldDisk);

      drawDisk(renderer, diskX, diskY, diskW, DISK_HEIGHT, color, 0.8);

      // Draw down arrow indicator using fillPoly
      renderer.fillPoly([
        { x: px, y: PEG_TOP - 4 },
        { x: px - 6, y: PEG_TOP - 12 },
        { x: px + 6, y: PEG_TOP - 12 }
      ], THEME);
    }

    // Draw instructions at bottom
    if (game.state === 'playing') {
      const instrText = heldDisk === -1
        ? 'Press 1/2/3 or Arrow+Space to pick up a disk'
        : 'Press 1/2/3 or Arrow+Space to place the disk';
      text.drawText(instrText, W / 2, H - 18, 12, '#555555', 'center');
    }
  };

  game.start();
  return game;
}

// ── Disk drawing helper ──
// Draws a rounded-rect disk using fillRect for the body + highlight/shadow overlays
function drawDisk(renderer, x, y, w, h, color, glowIntensity) {
  // Main disk body with glow
  renderer.setGlow(color, glowIntensity);
  renderer.fillRect(x, y, w, h, color);

  // Highlight on top half (lighter overlay)
  renderer.setGlow(null);
  renderer.fillRect(x + 2, y + 2, w - 4, h / 2 - 2, 'rgba(255, 255, 255, 0.2)');

  // Inner darker bottom half for depth
  renderer.fillRect(x + 2, y + h / 2, w - 4, h / 2 - 2, 'rgba(0, 0, 0, 0.15)');
}
