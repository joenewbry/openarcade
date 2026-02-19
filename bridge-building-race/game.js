// bridge-building-race/game.js — WebGL 2 engine port

import { Game } from '../engine/core.js';

const W = 600, H = 400;
const SPLIT = 300;
const HALF_W = 300;
const GROUND_Y = 280;
const GRAVITY = 0.25;
const SUB_STEPS = 6;
const BEAM_STRENGTH = 3.5;

// Level definitions
const LEVELS = [
  { gap: 80,  budget: 400,  truckWeight: 8,  name: 'Easy Creek' },
  { gap: 110, budget: 520,  truckWeight: 10, name: 'River Crossing' },
  { gap: 140, budget: 660,  truckWeight: 12, name: 'Canyon Pass' },
  { gap: 170, budget: 820,  truckWeight: 14, name: 'Deep Gorge' },
  { gap: 200, budget: 1000, truckWeight: 16, name: 'Grand Chasm' },
];

const GAP_DEPTH = 85;

// ── Module-scope state ──
let gameState;  // 'waiting' | 'building' | 'testing' | 'levelComplete' | 'gameOver'
let score = 0;
let aiTotalScore = 0;
let playerTotalScore = 0;
let currentLevel = 0;

let playerNodes, playerBeams, playerBudgetUsed;
let aiNodes, aiBeams, aiBudgetUsed;
let selectedNode = null;
let hoverNode = null;
let mousePos = { x: 0, y: 0 };
let currentBudget = 0;
let gapLeft, gapRight;

let simPlayer, simAI;
let truckPlayer, truckAI;
let testPhase = '';
let testTimer = 0;

let particles = [];

// Mouse event queue (processed in onUpdate)
let pendingMouseDown = null;   // { x, y, button }
let pendingContextMenu = false;

// DOM references
let levelEl, budgetEl, playerScoreEl, aiScoreEl, overlayDetailEl;

// ──────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function createNode(x, y, fixed) {
  return { x, y, ox: x, oy: y, vx: 0, vy: 0, fixed: !!fixed };
}

function createBeam(n1, n2) {
  const len = dist(n1, n2);
  return { n1, n2, restLength: len, broken: false, stress: 0 };
}

function totalBeamCost(beams) {
  let total = 0;
  for (const b of beams) total += b.restLength;
  return Math.round(total);
}

function addParticle(x, y, color) {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: -Math.random() * 3 - 1,
    life: 30 + Math.random() * 20,
    color,
  });
}

// ──────────────────────────────────────────────────────────────
// LEVEL SETUP
// ──────────────────────────────────────────────────────────────
function initLevel(levelIdx) {
  currentLevel = levelIdx;
  const lvl = LEVELS[levelIdx];
  currentBudget = lvl.budget;
  gapLeft = Math.round((HALF_W - lvl.gap) / 2);
  gapRight = gapLeft + lvl.gap;

  playerNodes = [];
  playerBeams = [];
  playerBudgetUsed = 0;
  createAnchors(playerNodes, lvl.gap);

  aiNodes = [];
  aiBeams = [];
  aiBudgetUsed = 0;
  createAnchors(aiNodes, lvl.gap);

  selectedNode = null;
  hoverNode = null;
  testPhase = '';
  particles = [];

  if (levelEl) levelEl.textContent = levelIdx + 1;
  if (budgetEl) budgetEl.textContent = currentBudget;
}

function createAnchors(nodes, gap) {
  const spacing = 18;
  for (let i = 0; i <= 2; i++) {
    nodes.push(createNode(gapLeft - i * spacing, GROUND_Y, true));
  }
  nodes.push(createNode(gapLeft, GROUND_Y - 28, true));
  for (let i = 0; i <= 2; i++) {
    nodes.push(createNode(gapRight + i * spacing, GROUND_Y, true));
  }
  nodes.push(createNode(gapRight, GROUND_Y - 28, true));
}

// ──────────────────────────────────────────────────────────────
// AI BRIDGE BUILDER
// ──────────────────────────────────────────────────────────────
function aiBuild() {
  const lvl = LEVELS[currentLevel];
  const budget = lvl.budget;

  const numSeg = Math.max(3, Math.ceil(lvl.gap / 28));
  const segW = lvl.gap / numSeg;
  const trussH = Math.min(32, segW * 0.85);

  const bottom = [];
  const top = [];

  for (let i = 0; i <= numSeg; i++) {
    const x = gapLeft + i * segW;
    bottom.push(findOrAddAINode(x, GROUND_Y));
  }
  for (let i = 1; i < numSeg; i++) {
    const x = gapLeft + i * segW;
    top.push(findOrAddAINode(x, GROUND_Y - trussH));
  }

  let cost = 0;
  const maxB = budget * 0.93;

  function tryBeam(n1, n2) {
    if (!n1 || !n2) return;
    for (const b of aiBeams) {
      if ((b.n1 === n1 && b.n2 === n2) || (b.n1 === n2 && b.n2 === n1)) return;
    }
    const c = dist(n1, n2);
    if (cost + c <= maxB) {
      aiBeams.push(createBeam(n1, n2));
      cost += c;
    }
  }

  for (let i = 0; i < numSeg; i++) tryBeam(bottom[i], bottom[i + 1]);
  for (let i = 0; i < top.length - 1; i++) tryBeam(top[i], top[i + 1]);

  for (let i = 0; i < numSeg; i++) {
    if (i < top.length) {
      tryBeam(bottom[i], top[i]);
      tryBeam(top[i], bottom[i + 1]);
    }
  }

  const leftAnchors = aiNodes.filter(n => n.fixed && n.x <= gapLeft);
  const rightAnchors = aiNodes.filter(n => n.fixed && n.x >= gapRight);

  for (const a of leftAnchors) {
    tryBeam(a, bottom[0]);
    if (a.y < GROUND_Y && top.length > 0) tryBeam(a, top[0]);
  }
  for (const a of rightAnchors) {
    tryBeam(a, bottom[numSeg]);
    if (a.y < GROUND_Y && top.length > 0) tryBeam(a, top[top.length - 1]);
  }

  aiBudgetUsed = totalBeamCost(aiBeams);
}

function findOrAddAINode(x, y) {
  for (const n of aiNodes) {
    if (Math.abs(n.x - x) < 1 && Math.abs(n.y - y) < 1) return n;
  }
  const n = createNode(x, y, false);
  if (Math.abs(y - GROUND_Y) < 2 && (x <= gapLeft + 1 || x >= gapRight - 1)) {
    n.fixed = true;
  }
  aiNodes.push(n);
  return n;
}

// ──────────────────────────────────────────────────────────────
// PHYSICS SIMULATION
// ──────────────────────────────────────────────────────────────
function cloneForSim(nodes, beams) {
  const simNodes = nodes.map(n => ({
    x: n.x, y: n.y, ox: n.x, oy: n.y,
    vx: 0, vy: 0, fixed: n.fixed,
  }));
  const simBeams = beams.map(b => ({
    i1: nodes.indexOf(b.n1),
    i2: nodes.indexOf(b.n2),
    restLength: b.restLength,
    broken: false,
    stress: 0,
  }));
  return { nodes: simNodes, beams: simBeams };
}

function createTruck(startX) {
  return {
    x: startX,
    y: GROUND_Y - 14,
    width: 30,
    height: 14,
    vx: 0,
    vy: 0,
    weight: LEVELS[currentLevel].truckWeight,
    onBridge: false,
    fallen: false,
    crossed: false,
    maxX: startX,
  };
}

function simStep(sim, truck) {
  const nodes = sim.nodes;
  const beams = sim.beams;
  const dt = 1.0 / SUB_STEPS;

  for (let sub = 0; sub < SUB_STEPS; sub++) {
    for (const n of nodes) {
      if (!n.fixed) n.vy += GRAVITY * dt;
    }

    for (const b of beams) {
      if (b.broken) continue;
      const n1 = nodes[b.i1];
      const n2 = nodes[b.i2];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const stretch = (d - b.restLength) / b.restLength;
      b.stress = Math.abs(stretch);

      if (b.stress > BEAM_STRENGTH) {
        b.broken = true;
        const mx = (n1.x + n2.x) / 2;
        const my = (n1.y + n2.y) / 2;
        for (let p = 0; p < 5; p++) addParticle(mx, my, '#f94');
        continue;
      }

      const force = stretch * 0.5;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      if (!n1.fixed) { n1.vx += fx * dt; n1.vy += fy * dt; }
      if (!n2.fixed) { n2.vx -= fx * dt; n2.vy -= fy * dt; }
    }

    if (truck && !truck.fallen && !truck.crossed) {
      const cx = truck.x + truck.width / 2;
      let totalW = 0;
      const loadNodes = [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.fixed && n.y >= GROUND_Y) continue;
        const hd = Math.abs(n.x - cx);
        if (hd < truck.width * 0.8 && n.y <= GROUND_Y + 10) {
          const w = 1.0 / (hd + 5);
          loadNodes.push({ node: n, w });
          totalW += w;
        }
      }
      if (totalW > 0) {
        for (const ln of loadNodes) {
          if (!ln.node.fixed) {
            ln.node.vy += (truck.weight * dt * (ln.w / totalW)) * 0.03;
          }
        }
      }
    }

    for (const n of nodes) {
      if (n.fixed) continue;
      n.vx *= 0.97;
      n.vy *= 0.97;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.y > GROUND_Y && (n.x <= gapLeft || n.x >= gapRight)) {
        n.y = GROUND_Y;
        n.vy = 0;
        if (Math.abs(n.vx) < 0.1) n.vx = 0;
      }
      if (n.y > GROUND_Y + GAP_DEPTH + 20) {
        n.y = GROUND_Y + GAP_DEPTH + 20;
        n.vy = 0;
      }
    }
  }

  // Truck physics
  if (truck && !truck.fallen && !truck.crossed) {
    truck.vx = Math.min(truck.vx + 0.015, 1.0);
    truck.x += truck.vx;

    const frontX = truck.x + truck.width;
    const backX = truck.x;
    const midX = truck.x + truck.width / 2;

    if (frontX <= gapLeft || backX >= gapRight) {
      truck.y = GROUND_Y - truck.height;
      truck.vy = 0;
      truck.onBridge = false;
      if (backX >= gapRight + 20) {
        truck.crossed = true;
        truck.vx = 0;
      }
    } else {
      let bestY = GROUND_Y + GAP_DEPTH + 50;
      let foundSupport = false;

      for (const b of beams) {
        if (b.broken) continue;
        const n1 = nodes[b.i1];
        const n2 = nodes[b.i2];
        const minBX = Math.min(n1.x, n2.x);
        const maxBX = Math.max(n1.x, n2.x);

        for (const checkX of [backX + 4, midX, frontX - 4]) {
          if (checkX >= minBX - 2 && checkX <= maxBX + 2) {
            const span = n2.x - n1.x;
            if (Math.abs(span) < 1) continue;
            const t = Math.max(0, Math.min(1, (checkX - n1.x) / span));
            const beamY = n1.y + t * (n2.y - n1.y);
            if (beamY < bestY && beamY >= GROUND_Y - 60 && beamY <= GROUND_Y + 30) {
              bestY = beamY;
              foundSupport = true;
            }
          }
        }
      }

      if (backX < gapLeft) { bestY = Math.min(bestY, GROUND_Y); foundSupport = true; }
      if (frontX > gapRight) { bestY = Math.min(bestY, GROUND_Y); foundSupport = true; }

      if (foundSupport && bestY - truck.height <= truck.y + 5) {
        truck.y = bestY - truck.height;
        truck.vy = 0;
        truck.onBridge = true;
      } else {
        truck.vy += GRAVITY * 1.5;
        truck.y += truck.vy;
        truck.onBridge = false;
      }

      if (truck.y > GROUND_Y + GAP_DEPTH) {
        truck.fallen = true;
        for (let p = 0; p < 12; p++) addParticle(truck.x + truck.width / 2, truck.y, '#f44');
      }
    }

    truck.maxX = Math.max(truck.maxX, truck.x);
  }
}

// ──────────────────────────────────────────────────────────────
// PLAYER INPUT HELPERS
// ──────────────────────────────────────────────────────────────
function getNodeAt(x, y, nodes, radius) {
  radius = radius || 12;
  let best = null, bestD = radius;
  for (const n of nodes) {
    const d = dist({ x, y }, n);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function cleanOrphanNodes(nodes, beams) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].fixed) continue;
    let used = false;
    for (const b of beams) {
      if (b.n1 === nodes[i] || b.n2 === nodes[i]) { used = true; break; }
    }
    if (!used) nodes.splice(i, 1);
  }
}

function processMouseDown(pos, game) {
  if (gameState === 'waiting') {
    startGame(game);
    return;
  }
  if (gameState === 'levelComplete' || gameState === 'gameOver') {
    handleOverlayClick(game);
    return;
  }
  if (gameState !== 'building') return;

  // TEST button
  if (pos.x >= 110 && pos.x <= 200 && pos.y >= 360 && pos.y <= 388) {
    if (playerBeams.length > 0) startTest(game);
    return;
  }
  // UNDO button
  if (pos.x >= 210 && pos.x <= 280 && pos.y >= 360 && pos.y <= 388) {
    if (playerBeams.length > 0) {
      playerBeams.pop();
      playerBudgetUsed = totalBeamCost(playerBeams);
      cleanOrphanNodes(playerNodes, playerBeams);
      if (budgetEl) budgetEl.textContent = currentBudget - playerBudgetUsed;
    }
    return;
  }
  // CLEAR button
  if (pos.x >= 15 && pos.x <= 95 && pos.y >= 360 && pos.y <= 388) {
    playerBeams = [];
    playerBudgetUsed = 0;
    cleanOrphanNodes(playerNodes, playerBeams);
    if (budgetEl) budgetEl.textContent = currentBudget;
    selectedNode = null;
    return;
  }

  if (pos.x >= SPLIT) return;

  const clicked = getNodeAt(pos.x, pos.y, playerNodes, 14);
  if (clicked) {
    if (selectedNode && selectedNode !== clicked) {
      let exists = false;
      for (const b of playerBeams) {
        if ((b.n1 === selectedNode && b.n2 === clicked) ||
            (b.n1 === clicked && b.n2 === selectedNode)) {
          exists = true; break;
        }
      }
      if (!exists) {
        const len = dist(selectedNode, clicked);
        if (playerBudgetUsed + len <= currentBudget) {
          playerBeams.push(createBeam(selectedNode, clicked));
          playerBudgetUsed = totalBeamCost(playerBeams);
          if (budgetEl) budgetEl.textContent = currentBudget - Math.round(playerBudgetUsed);
        }
      }
      selectedNode = null;
    } else if (selectedNode === clicked) {
      selectedNode = null;
    } else {
      selectedNode = clicked;
    }
  } else {
    const buildMinX = gapLeft - 5;
    const buildMaxX = gapRight + 5;
    const buildMinY = GROUND_Y - 65;
    const buildMaxY = GROUND_Y + 8;
    if (pos.x >= buildMinX && pos.x <= buildMaxX &&
        pos.y >= buildMinY && pos.y <= buildMaxY) {
      const newNode = createNode(pos.x, pos.y, false);
      if (Math.abs(pos.y - GROUND_Y) < 8 && (pos.x <= gapLeft + 2 || pos.x >= gapRight - 2)) {
        newNode.y = GROUND_Y;
        newNode.fixed = true;
      }
      playerNodes.push(newNode);
      if (selectedNode) {
        const len = dist(selectedNode, newNode);
        if (playerBudgetUsed + len <= currentBudget) {
          playerBeams.push(createBeam(selectedNode, newNode));
          playerBudgetUsed = totalBeamCost(playerBeams);
          if (budgetEl) budgetEl.textContent = currentBudget - Math.round(playerBudgetUsed);
        }
      }
      selectedNode = newNode;
    } else {
      selectedNode = null;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// TEST PHASE
// ──────────────────────────────────────────────────────────────
function startTest(game) {
  aiBuild();
  simPlayer = cloneForSim(playerNodes, playerBeams);
  simAI = cloneForSim(aiNodes, aiBeams);
  truckPlayer = createTruck(5);
  truckAI = createTruck(5);
  testTimer = 0;
  testPhase = 'simulating';
  gameState = 'testing';
  game.hideOverlay();
}

// ──────────────────────────────────────────────────────────────
// SCORING
// ──────────────────────────────────────────────────────────────
function calcScore(truck, budgetUsed) {
  const budgetRemain = currentBudget - budgetUsed;
  const distPercent = Math.min(1, (truck.maxX - 5) / (gapRight + 25));
  const distScore = Math.round(distPercent * 300);
  const bonus = truck.crossed ? 500 : 0;
  return Math.max(0, Math.round(budgetRemain * 0.3) + distScore + bonus);
}

// ──────────────────────────────────────────────────────────────
// GAME FLOW
// ──────────────────────────────────────────────────────────────
function startGame(game) {
  gameState = 'building';
  game.hideOverlay();
  playerTotalScore = 0;
  aiTotalScore = 0;
  if (playerScoreEl) playerScoreEl.textContent = '0';
  if (aiScoreEl) aiScoreEl.textContent = '0';
  initLevel(0);
}

function handleOverlayClick(game) {
  if (gameState === 'levelComplete') {
    if (currentLevel < LEVELS.length - 1) {
      initLevel(currentLevel + 1);
      gameState = 'building';
      game.hideOverlay();
    } else {
      showGameOver(game);
    }
  } else if (gameState === 'gameOver') {
    startGame(game);
  }
}

function showLevelComplete(pScore, aScore, game) {
  playerTotalScore += pScore;
  aiTotalScore += aScore;
  if (playerScoreEl) playerScoreEl.textContent = playerTotalScore;
  if (aiScoreEl) aiScoreEl.textContent = aiTotalScore;
  gameState = 'levelComplete';

  const pCrossed = truckPlayer.crossed;
  const aCrossed = truckAI.crossed;
  const title = pCrossed ? 'BRIDGE HELD!' : 'BRIDGE COLLAPSED!';
  const body =
    'You: ' + pScore + ' pts' + (pCrossed ? ' [CROSSED]' : ' [FELL]') +
    '  AI: ' + aScore + ' pts' + (aCrossed ? ' [CROSSED]' : ' [FELL]') +
    '  ' + LEVELS[currentLevel].name + ' complete' +
    (currentLevel < LEVELS.length - 1 ? '  |  Click for next level' : '  |  Click for final results');

  game.showOverlay(title, body);
  if (overlayDetailEl) overlayDetailEl.textContent = '';
}

function showGameOver(game) {
  gameState = 'gameOver';
  const winner = playerTotalScore >= aiTotalScore ? 'YOU WIN!' : 'AI WINS!';
  game.showOverlay(winner, 'Final Score — You: ' + playerTotalScore + ' | AI: ' + aiTotalScore + '  |  Click to play again');
  score = playerTotalScore;
}

// ──────────────────────────────────────────────────────────────
// DRAWING HELPERS
// ──────────────────────────────────────────────────────────────
function drawSky(renderer, ox) {
  // Approximate gradient with two filled rects (dark top, lighter bottom)
  renderer.fillRect(ox, 0, HALF_W, GROUND_Y / 2, '#0a0a1a');
  renderer.fillRect(ox, GROUND_Y / 2, HALF_W, GROUND_Y / 2, '#121222');
}

function drawGround(renderer, ox) {
  // Left cliff
  renderer.fillRect(ox, GROUND_Y, gapLeft, H - GROUND_Y, '#3a2a1a');
  // Right cliff
  renderer.fillRect(ox + gapRight, GROUND_Y, HALF_W - gapRight, H - GROUND_Y, '#3a2a1a');
  // Cliff faces
  renderer.fillRect(ox + gapLeft, GROUND_Y, 2, GAP_DEPTH, '#5a4030');
  renderer.fillRect(ox + gapRight - 2, GROUND_Y, 2, GAP_DEPTH, '#5a4030');
  // Grass strips
  renderer.fillRect(ox, GROUND_Y - 3, gapLeft + 1, 5, '#4a7a3a');
  renderer.fillRect(ox + gapRight - 1, GROUND_Y - 3, HALF_W - gapRight + 1, 5, '#4a7a3a');
  // Water
  const waterY = GROUND_Y + GAP_DEPTH - 10;
  renderer.fillRect(ox + gapLeft, waterY, gapRight - gapLeft, 15, 'rgba(30,70,130,0.5)');
  // Deep darkness
  renderer.fillRect(ox + gapLeft, GROUND_Y + GAP_DEPTH + 5, gapRight - gapLeft, H - (GROUND_Y + GAP_DEPTH + 5), '#0a0810');
}

function drawAnchors(renderer, nodes, ox, color) {
  for (const n of nodes) {
    if (!n.fixed) continue;
    renderer.fillCircle(ox + n.x, n.y, 6, color);
    renderer.fillCircle(ox + n.x, n.y, 5, '#222');
    renderer.fillCircle(ox + n.x, n.y, 4, color);
    // Pin cross
    renderer.drawLine(ox + n.x - 3, n.y, ox + n.x + 3, n.y, '#222', 1);
    renderer.drawLine(ox + n.x, n.y - 3, ox + n.x, n.y + 3, '#222', 1);
  }
}

function drawBuildBeams(renderer, text, beams, ox, color) {
  for (const b of beams) {
    renderer.drawLine(ox + b.n1.x, b.n1.y, ox + b.n2.x, b.n2.y, color, 3);
    // Length label
    const mx = ox + (b.n1.x + b.n2.x) / 2;
    const my = (b.n1.y + b.n2.y) / 2;
    text.drawText(String(Math.round(b.restLength)), mx, my - 12, 9, 'rgba(255,255,255,0.3)', 'center');
  }
}

function drawBuildNodes(renderer, nodes, ox) {
  for (const n of nodes) {
    if (n.fixed) continue;
    renderer.fillCircle(ox + n.x, n.y, 4, '#f94');
    renderer.fillCircle(ox + n.x, n.y, 3, '#222');
    renderer.fillCircle(ox + n.x, n.y, 2, '#f94');
  }
  if (selectedNode) {
    // Dashed circle approximation — draw 12-sided polygon
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push({ x: ox + selectedNode.x + Math.cos(a) * 10, y: selectedNode.y + Math.sin(a) * 10 });
    }
    renderer.strokePoly(pts, '#ff0', 2, true);
  }
  if (hoverNode && hoverNode !== selectedNode) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pts.push({ x: ox + hoverNode.x + Math.cos(a) * 9, y: hoverNode.y + Math.sin(a) * 9 });
    }
    renderer.strokePoly(pts, 'rgba(255,153,68,0.5)', 1.5, true);
  }
}

function drawPreviewLine(renderer, text) {
  if (!selectedNode || gameState !== 'building') return;
  if (mousePos.x >= SPLIT) return;
  const tx = hoverNode ? hoverNode.x : mousePos.x;
  const ty = hoverNode ? hoverNode.y : mousePos.y;

  // Dashed preview — draw segments manually
  const x1 = selectedNode.x, y1 = selectedNode.y;
  const dx = tx - x1, dy = ty - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const dash = 5, gap = 5;
  let d = 0;
  while (d < len) {
    const segEnd = Math.min(d + dash, len);
    renderer.drawLine(
      x1 + ux * d,  y1 + uy * d,
      x1 + ux * segEnd, y1 + uy * segEnd,
      'rgba(255,153,68,0.35)', 2
    );
    d += dash + gap;
  }

  const previewLen = Math.round(len);
  const overBudget = playerBudgetUsed + previewLen > currentBudget;
  const label = (overBudget ? 'OVER ' : '-') + previewLen;
  const mx = (x1 + tx) / 2;
  const my = (y1 + ty) / 2;
  text.drawText(label, mx, my - 14, 10, overBudget ? '#f44' : 'rgba(255,153,68,0.7)', 'center');
}

function drawSimBeams(renderer, sim, ox) {
  for (const b of sim.beams) {
    if (b.broken) continue;
    const n1 = sim.nodes[b.i1];
    const n2 = sim.nodes[b.i2];
    const stress = Math.min(1, b.stress / BEAM_STRENGTH);
    let r, g;
    if (stress < 0.5) {
      r = Math.round(255 * stress * 2);
      g = 200;
    } else {
      r = 255;
      g = Math.round(200 * (1 - (stress - 0.5) * 2));
    }
    const rH = r.toString(16).padStart(2, '0');
    const gH = g.toString(16).padStart(2, '0');
    renderer.drawLine(ox + n1.x, n1.y, ox + n2.x, n2.y, '#' + rH + gH + '28', 3);
  }
  // Broken beams (faint red)
  for (const b of sim.beams) {
    if (!b.broken) continue;
    const n1 = sim.nodes[b.i1];
    const n2 = sim.nodes[b.i2];
    renderer.drawLine(ox + n1.x, n1.y, ox + n2.x, n2.y, 'rgba(255,60,60,0.25)', 1);
  }
}

function drawSimNodes(renderer, sim, ox) {
  for (const n of sim.nodes) {
    const r = n.fixed ? 5 : 3;
    const color = n.fixed ? '#888' : '#ccc';
    renderer.fillCircle(ox + n.x, n.y, r, color);
  }
}

function drawTruck(renderer, text, truck, ox, color) {
  if (!truck) return;
  const tx = ox + truck.x;
  const ty = truck.y;
  if (ty > H + 20) return;

  // Shadow
  renderer.fillRect(tx + 2, ty + 2, truck.width, truck.height, 'rgba(0,0,0,0.3)');
  // Body
  renderer.fillRect(tx, ty, truck.width, truck.height, color);
  // Cab (darker shade) — pre-compute darker color
  const cabColor = darkenHex(color, 30);
  renderer.fillRect(tx + truck.width - 11, ty - 7, 11, 7, cabColor);
  // Windshield
  renderer.fillRect(tx + truck.width - 10, ty - 6, 3, 5, 'rgba(150,200,255,0.5)');
  // Wheels
  renderer.fillCircle(tx + 6, ty + truck.height + 1, 3.5, '#111');
  renderer.fillCircle(tx + truck.width - 6, ty + truck.height + 1, 3.5, '#111');
  // Hub caps
  renderer.fillCircle(tx + 6, ty + truck.height + 1, 1.5, '#555');
  renderer.fillCircle(tx + truck.width - 6, ty + truck.height + 1, 1.5, '#555');
  // Weight label
  text.drawText(truck.weight + 't', tx + truck.width / 2 - 3, ty + truck.height - 12, 8, '#000', 'center');
}

function darkenHex(hex, amount) {
  let r = 255, g = 153, b = 68;
  if (hex === '#4af') { r = 68; g = 170; b = 255; }
  else if (hex === '#f94') { r = 255; g = 153; b = 68; }
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawButton(renderer, text, x, y, w, h, label, enabled) {
  const bgColor = enabled ? 'rgba(255,153,68,0.15)' : 'rgba(80,80,80,0.1)';
  const borderColor = enabled ? '#f94' : '#555';
  const textColor = enabled ? '#f94' : '#666';
  renderer.fillRect(x, y, w, h, bgColor);
  renderer.strokePoly([
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
  ], borderColor, 1.5, true);
  text.drawText(label, x + w / 2, y + (h - 12) / 2, 11, textColor, 'center');
}

function drawHUD(renderer, text, ox, label, budgetUsed, color, side) {
  text.drawText(label, ox + 8, 4, 12, color, 'left');
  const remain = currentBudget - Math.round(budgetUsed);
  const budgetColor = remain < 50 ? '#f44' : '#aaa';
  text.drawText('Budget: ' + remain + '/' + currentBudget, ox + 8, 18, 10, budgetColor, 'left');

  if (gameState === 'testing') {
    const truck = side === 'player' ? truckPlayer : truckAI;
    if (truck) {
      const progress = Math.min(100, Math.max(0,
        Math.round(((truck.maxX - 5) / (gapRight + 25)) * 100)));
      const statusColor = truck.fallen ? '#f44' : truck.crossed ? '#4f4' : '#ff4';
      const status = truck.fallen ? 'FELL!' : truck.crossed ? 'CROSSED!' : progress + '%';
      text.drawText('Truck: ' + status, ox + 8, 32, 10, statusColor, 'left');
    }
  }
}

function drawBuildZone(renderer, ox) {
  // Dashed outline of build area
  const bx = ox + gapLeft - 5;
  const by = GROUND_Y - 65;
  const bw = gapRight - gapLeft + 10;
  const bh = 73;
  const dash = 3, gap = 6, color = 'rgba(255,153,68,0.1)';
  // Top edge
  let d = 0;
  while (d < bw) { const e = Math.min(d + dash, bw); renderer.drawLine(bx + d, by, bx + e, by, color, 1); d += dash + gap; }
  // Bottom edge
  d = 0;
  while (d < bw) { const e = Math.min(d + dash, bw); renderer.drawLine(bx + d, by + bh, bx + e, by + bh, color, 1); d += dash + gap; }
  // Left edge
  d = 0;
  while (d < bh) { const e = Math.min(d + dash, bh); renderer.drawLine(bx, by + d, bx, by + e, color, 1); d += dash + gap; }
  // Right edge
  d = 0;
  while (d < bh) { const e = Math.min(d + dash, bh); renderer.drawLine(bx + bw, by + d, bx + bw, by + e, color, 1); d += dash + gap; }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / 50));
    // Encode alpha into color
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, p.color + alphaHex);
  }
}

// ──────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────
export function createGame() {
  const game = new Game('game');

  levelEl        = document.getElementById('level');
  budgetEl       = document.getElementById('budget');
  playerScoreEl  = document.getElementById('playerScore');
  aiScoreEl      = document.getElementById('aiScore');
  overlayDetailEl = document.getElementById('overlayDetail');

  // ── Canvas mouse event listeners ──
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    pendingContextMenu = true;
  });

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mousePos = {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top)  * (H / rect.height),
    };
    if (gameState !== 'building') { hoverNode = null; return; }
    if (mousePos.x >= SPLIT) { hoverNode = null; return; }
    hoverNode = getNodeAt(mousePos.x, mousePos.y, playerNodes, 14);
  });

  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    pendingMouseDown = {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top)  * (H / rect.height),
      button: e.button,
    };
  });

  // ── Init ──
  game.onInit = () => {
    gameState = 'waiting';
    score = 0;
    aiTotalScore = 0;
    playerTotalScore = 0;
    particles = [];
    selectedNode = null;
    hoverNode = null;
    pendingMouseDown = null;
    pendingContextMenu = false;
    game.showOverlay(
      'BRIDGE BUILDING RACE',
      'Physics-based bridge construction\nBuild under budget, then test with a truck!\n5 levels of increasing difficulty\nSplit-screen vs AI engineer\n\nClick to Start'
    );
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ──
  game.onUpdate = () => {
    // Process right-click (deselect)
    if (pendingContextMenu) {
      pendingContextMenu = false;
      selectedNode = null;
    }

    // Process mouse click
    if (pendingMouseDown) {
      const pos = pendingMouseDown;
      pendingMouseDown = null;
      if (pos.button === 0) {
        processMouseDown(pos, game);
      } else if (pos.button === 2) {
        selectedNode = null;
      }
    }

    // Run physics during testing
    if (gameState === 'testing' && testPhase === 'simulating') {
      testTimer++;

      simStep(simPlayer, truckPlayer);
      simStep(simAI, truckAI);

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }

      const pDone = truckPlayer.fallen || truckPlayer.crossed || testTimer > 500;
      const aDone = truckAI.fallen || truckAI.crossed || testTimer > 500;

      if (pDone && aDone) {
        testPhase = 'done';
        const pScore = calcScore(truckPlayer, playerBudgetUsed);
        const aScore = calcScore(truckAI, aiBudgetUsed);
        // Use a frame counter to delay ~60 frames (~1s) before showing results
        testPhase = 'waiting_result';
        testTimer = 0;
        // Store scores for deferred display
        game._pendingPScore = pScore;
        game._pendingAScore = aScore;
      } else if (testPhase !== 'simulating') {
        // no-op
      }
    } else if (testPhase === 'waiting_result') {
      testTimer++;
      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (testTimer >= 60) {
        testPhase = 'done';
        showLevelComplete(game._pendingPScore, game._pendingAScore, game);
      }
    }
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Divider line
    renderer.drawLine(SPLIT, 0, SPLIT, H, '#333', 2);

    // Divider "VS" label — rotated text not supported; draw it horizontally, centered
    text.drawText('VS', SPLIT - 8, H / 2 - 6, 9, '#444', 'center');

    if (gameState === 'building') {
      // ── Player side ──
      drawSky(renderer, 0);
      drawGround(renderer, 0);
      drawBuildZone(renderer, 0);
      drawBuildBeams(renderer, text, playerBeams, 0, '#f94');
      drawPreviewLine(renderer, text);
      drawAnchors(renderer, playerNodes, 0, '#f94');
      drawBuildNodes(renderer, playerNodes, 0);
      drawHUD(renderer, text, 0, 'YOU - ' + LEVELS[currentLevel].name, playerBudgetUsed, '#f94', 'player');

      // Buttons
      drawButton(renderer, text, 15, 360, 80, 28, 'CLEAR', playerBeams.length > 0);
      drawButton(renderer, text, 110, 360, 90, 28, 'TEST!', playerBeams.length > 0);
      drawButton(renderer, text, 210, 360, 70, 28, 'UNDO', playerBeams.length > 0);

      // ── AI side (placeholder during build) ──
      drawSky(renderer, SPLIT);
      drawGround(renderer, SPLIT);
      drawAnchors(renderer, aiNodes, SPLIT, '#4af');
      drawHUD(renderer, text, SPLIT, 'AI', 0, '#4af', 'ai');

      text.drawText('AI builds on TEST', SPLIT + HALF_W / 2, GROUND_Y - 48, 11, '#4af', 'center');
      text.drawText('Triangular truss optimizer', SPLIT + HALF_W / 2, GROUND_Y - 33, 9, '#555', 'center');

      // Instructions
      text.drawText('Click anchors/nodes to connect  |  Click gap area for new node', HALF_W / 2, H - 12, 9, '#555', 'center');

    } else if (gameState === 'testing' || testPhase === 'waiting_result' || testPhase === 'done') {
      // ── Player sim ──
      drawSky(renderer, 0);
      drawGround(renderer, 0);
      drawSimBeams(renderer, simPlayer, 0);
      drawSimNodes(renderer, simPlayer, 0);
      drawTruck(renderer, text, truckPlayer, 0, '#f94');
      drawHUD(renderer, text, 0, 'YOU', playerBudgetUsed, '#f94', 'player');

      // ── AI sim ──
      drawSky(renderer, SPLIT);
      drawGround(renderer, SPLIT);
      drawSimBeams(renderer, simAI, SPLIT);
      drawSimNodes(renderer, simAI, SPLIT);
      drawTruck(renderer, text, truckAI, SPLIT, '#4af');
      drawHUD(renderer, text, SPLIT, 'AI', aiBudgetUsed, '#4af', 'ai');

      drawParticles(renderer);
    }
  };

  game.start();
  return game;
}
