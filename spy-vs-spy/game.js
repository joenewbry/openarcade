// spy-vs-spy/game.js — Spy vs Spy game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;
const COLS = 4, ROWS = 3;
const RW = 150, RH = 133;

// Theme color
const COLOR = '#888';

// Furniture color map
const FURNITURE_COLORS = {
  desk:      '#8B6914',
  cabinet:   '#5a5a7a',
  safe:      '#3a3a5a',
  bookshelf: '#6B4226',
  plant:     '#2a6a2a',
  locker:    '#4a4a6a',
};
const FURNITURE_TYPES = ['desk', 'cabinet', 'safe', 'bookshelf', 'plant', 'locker'];

// DOM HUD elements
const playerDocsEl  = document.getElementById('playerDocs');
const playerTrapsEl = document.getElementById('playerTraps');
const timerEl       = document.getElementById('timer');
const scoreEl       = document.getElementById('score');

// ── Game state ──
let score = 0;
let timerMs = 180000;
let messageText = '';
let messageTimer = 0;
let combatState = null;
let rooms = [];
let roomGrid = [];
let player, ai;
const doors = {};
let animTime = 0; // accumulated frame counter for animations

// ── Helpers ──
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getAdjacentRooms(roomId) {
  const adj = [];
  for (let i = 0; i < rooms.length; i++) {
    if (doors[roomId + ',' + i]) adj.push(i);
  }
  return adj;
}

function findNextStep(fromId, toId) {
  if (fromId === toId) return fromId;
  const visited = new Set();
  const parent = {};
  const queue = [fromId];
  visited.add(fromId);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === toId) {
      let step = toId;
      while (parent[step] !== fromId && parent[step] !== undefined) step = parent[step];
      return step;
    }
    for (const n of getAdjacentRooms(cur)) {
      if (!visited.has(n)) {
        visited.add(n);
        parent[n] = cur;
        queue.push(n);
      }
    }
  }
  const adj = getAdjacentRooms(fromId);
  return adj.length > 0 ? adj[0] : fromId;
}

function updateSpyWorldPos(spy) {
  const room = rooms[spy.roomId];
  spy.x = room.x + spy.localX;
  spy.y = room.y + spy.localY;
}

function isRoomVisible(roomId) {
  if (roomId === player.roomId) return true;
  return getAdjacentRooms(player.roomId).includes(roomId);
}

function showMessage(msg) {
  messageText = msg;
  messageTimer = 2000;
}

// ── Room / map init ──
function initRooms() {
  // Clear doors
  for (const k of Object.keys(doors)) delete doors[k];

  rooms = [];
  roomGrid = [];
  for (let r = 0; r < ROWS; r++) {
    roomGrid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const room = {
        col: c, row: r,
        id: r * COLS + c,
        x: c * RW, y: r * RH,
        furniture: [],
        isExit: false,
      };
      roomGrid[r][c] = room;
      rooms.push(room);
    }
  }

  // Create doors
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      if (c < COLS - 1) {
        if (Math.random() < 0.8 || c === 0) {
          doors[id + ',' + (id + 1)] = true;
          doors[(id + 1) + ',' + id] = true;
        }
      }
      if (r < ROWS - 1) {
        if (Math.random() < 0.8 || r === 0) {
          doors[id + ',' + (id + COLS)] = true;
          doors[(id + COLS) + ',' + id] = true;
        }
      }
    }
  }

  // Ensure connectivity via BFS from room 0
  const visited = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (let i = 0; i < rooms.length; i++) {
      if (!visited.has(i) && doors[cur + ',' + i]) {
        visited.add(i);
        queue.push(i);
      }
    }
  }
  for (let i = 0; i < rooms.length; i++) {
    if (!visited.has(i)) {
      const r = Math.floor(i / COLS), c = i % COLS;
      const neighbors = [];
      if (r > 0) neighbors.push((r - 1) * COLS + c);
      if (r < ROWS - 1) neighbors.push((r + 1) * COLS + c);
      if (c > 0) neighbors.push(r * COLS + c - 1);
      if (c < COLS - 1) neighbors.push(r * COLS + c + 1);
      for (const n of neighbors) {
        if (visited.has(n)) {
          doors[i + ',' + n] = true;
          doors[n + ',' + i] = true;
          visited.add(i);
          break;
        }
      }
    }
  }

  // Furniture per room
  const POSITIONS = [
    {x:20,y:20},{x:80,y:20},{x:20,y:70},{x:80,y:70},{x:50,y:45},{x:110,y:45}
  ];
  for (const room of rooms) {
    const count = 2 + Math.floor(Math.random() * 3);
    const positions = shuffleArray(POSITIONS).slice(0, count);
    for (let i = 0; i < count; i++) {
      room.furniture.push({
        type: FURNITURE_TYPES[Math.floor(Math.random() * FURNITURE_TYPES.length)],
        x: positions[i].x,
        y: positions[i].y,
        searched: false,
        hasDoc: false,
        hasTrap: null,
        trapOwner: null,
      });
    }
  }

  // Place 4 documents
  const allFurn = [];
  for (const room of rooms) for (const f of room.furniture) allFurn.push(f);
  const shuffled = shuffleArray(allFurn);
  for (let i = 0; i < 4; i++) shuffled[i].hasDoc = true;

  // Exit room
  const exitRoom = roomGrid[Math.random() < 0.5 ? 0 : ROWS - 1][COLS - 1];
  exitRoom.isExit = true;
}

function createSpy(roomId, isPlayer) {
  const room = rooms[roomId];
  return {
    roomId,
    x: room.x + RW / 2,
    y: room.y + RH / 2,
    localX: RW / 2,
    localY: RH / 2,
    docs: 0,
    trapsSet: 0,
    trapsTriggered: 0,
    stunTimer: 0,
    disguiseTimer: 0,
    isPlayer,
    speed: 2.5,
    trapsAvailable: 5,
    searchTimer: 0,
    searchTarget: null,
    // AI
    targetRoom: -1,
    aiState: 'explore',
    visitedRooms: new Set([roomId]),
    aiActionTimer: 0,
    aiSearching: false,
  };
}

// ── Actions ──
function completeSearch(spy, furniture) {
  if (furniture.hasTrap && furniture.trapOwner !== (spy.isPlayer ? 'player' : 'ai')) {
    spy.stunTimer = 2000;
    furniture.hasTrap = null;
    furniture.trapOwner = null;
    if (spy.isPlayer) {
      showMessage('TRAPPED! Stunned for 2 seconds!');
      ai.trapsTriggered++;
    } else {
      showMessage('AI hit your trap!');
      player.trapsTriggered++;
      score += 50;
      scoreEl.textContent = score;
    }
    return;
  }
  furniture.searched = true;
  if (furniture.hasDoc) {
    spy.docs++;
    furniture.hasDoc = false;
    if (spy.isPlayer) {
      showMessage('Found a SECRET DOCUMENT! (' + spy.docs + '/4)');
      score += 100;
      scoreEl.textContent = score;
      playerDocsEl.textContent = spy.docs;
    } else {
      showMessage('AI found a document! (' + ai.docs + '/4)');
    }
  } else {
    if (spy.isPlayer) showMessage('Nothing here...');
  }
}

function playerSearch(game) {
  if (player.stunTimer > 0 || player.searchTimer > 0 || combatState) return;
  const room = rooms[player.roomId];
  let nearest = null, nearDist = Infinity;
  for (const f of room.furniture) {
    const dx = (room.x + f.x + 15) - player.x;
    const dy = (room.y + f.y + 15) - player.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 40 && d < nearDist) { nearDist = d; nearest = f; }
  }
  if (nearest) {
    player.searchTimer = 600;
    player.searchTarget = nearest;
    showMessage('Searching ' + nearest.type + '...');
  } else {
    showMessage('Nothing to search nearby');
  }
}

function playerSetTrap() {
  if (player.stunTimer > 0 || player.searchTimer > 0 || combatState) return;
  if (player.trapsAvailable <= 0) { showMessage('No traps left!'); return; }
  const room = rooms[player.roomId];
  let nearest = null, nearDist = Infinity;
  for (const f of room.furniture) {
    const dx = (room.x + f.x + 15) - player.x;
    const dy = (room.y + f.y + 15) - player.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 40 && d < nearDist && !f.hasTrap) { nearDist = d; nearest = f; }
  }
  if (nearest) {
    nearest.hasTrap = 'player';
    nearest.trapOwner = 'player';
    nearest.searched = false;
    player.trapsAvailable--;
    player.trapsSet++;
    playerTrapsEl.textContent = player.trapsSet;
    showMessage('Trap set in ' + nearest.type + '!');
  } else {
    showMessage('No furniture nearby to trap');
  }
}

function playerDisguise() {
  if (player.stunTimer > 0 || combatState) return;
  if (player.disguiseTimer > 0) { showMessage('Already disguised!'); return; }
  player.disguiseTimer = 5000;
  showMessage('Disguised for 5 seconds!');
}

function playerInteract(game) {
  if (player.stunTimer > 0 || combatState) return;
  const room = rooms[player.roomId];
  if (room.isExit && player.docs >= 4) { endGame(game, 'player_exit'); return; }
  if (room.isExit && player.docs < 4) {
    showMessage('Need all 4 documents to exit! (' + player.docs + '/4)');
    return;
  }
  playerSearch(game);
}

function startCombat() {
  combatState = { timer: 2000, phase: 'choose', playerChoice: null, aiChoice: null, result: null };
  showMessage('COMBAT! Press 1=Rock, 2=Paper, 3=Scissors');
}

function playerCombatChoice(choice) {
  if (!combatState || combatState.phase !== 'choose') return;
  combatState.playerChoice = choice;
  combatState.aiChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  combatState.phase = 'resolve';
  combatState.timer = 1500;
  const p = combatState.playerChoice, a = combatState.aiChoice;
  if (p === a) {
    combatState.result = 'draw';
    showMessage('DRAW! Both chose ' + p);
  } else if ((p==='rock'&&a==='scissors')||(p==='paper'&&a==='rock')||(p==='scissors'&&a==='paper')) {
    combatState.result = 'player';
    showMessage('You WIN! ' + p + ' beats ' + a);
  } else {
    combatState.result = 'ai';
    showMessage('You LOSE! ' + a + ' beats ' + p);
  }
}

function resolveCombat() {
  if (!combatState) return;
  if (combatState.phase === 'choose') combatState.result = 'ai';
  if (combatState.result === 'player') {
    ai.stunTimer = 3000;
    if (ai.docs > 0) {
      ai.docs--; player.docs++;
      playerDocsEl.textContent = player.docs;
      score += 75;
      scoreEl.textContent = score;
      showMessage('Stole a document from the enemy!');
    }
  } else if (combatState.result === 'ai') {
    player.stunTimer = 3000;
    if (player.docs > 0) {
      player.docs--; ai.docs++;
      playerDocsEl.textContent = player.docs;
      showMessage('Enemy stole a document from you!');
    }
  } else {
    player.stunTimer = 500;
    ai.stunTimer = 500;
  }
  combatState = null;
}

function endGame(game, reason) {
  let title, text;
  if (reason === 'player_exit') {
    score += 500 + Math.floor(timerMs / 100);
    title = 'MISSION COMPLETE!';
    text = 'You escaped with all documents! Score: ' + score;
  } else if (reason === 'ai_exit') {
    title = 'MISSION FAILED';
    text = 'Enemy escaped with the documents!';
  } else {
    if (player.docs > ai.docs) {
      score += 200;
      title = 'TIME UP - YOU WIN!';
      text = 'You: ' + player.docs + ' docs, Enemy: ' + ai.docs + ' docs. Score: ' + score;
    } else if (ai.docs > player.docs) {
      title = 'TIME UP - YOU LOSE';
      text = 'You: ' + player.docs + ' docs, Enemy: ' + ai.docs + ' docs';
    } else {
      score += 100;
      title = 'TIME UP - DRAW';
      text = 'Both found ' + player.docs + ' documents. Score: ' + score;
    }
  }
  scoreEl.textContent = score;
  game.showOverlay(title, text + ' | Press SPACE to play again');
  game.setState('over');
}

// ── Update ──
function updatePlayer(dt, game) {
  if (player.stunTimer > 0) { player.stunTimer -= dt; return; }
  if (player.disguiseTimer > 0) player.disguiseTimer -= dt;
  if (player.searchTimer > 0) {
    player.searchTimer -= dt;
    if (player.searchTimer <= 0 && player.searchTarget) {
      completeSearch(player, player.searchTarget);
      player.searchTarget = null;
    }
    return;
  }

  const input = game.input;
  let dx = 0, dy = 0;
  if (input.isDown('ArrowLeft')  || input.isDown('a')) dx -= 1;
  if (input.isDown('ArrowRight') || input.isDown('d')) dx += 1;
  if (input.isDown('ArrowUp')    || input.isDown('w')) dy -= 1;
  if (input.isDown('ArrowDown')  || input.isDown('s')) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx = dx / len * player.speed;
    dy = dy / len * player.speed;
    let newX = player.localX + dx;
    let newY = player.localY + dy;
    const margin = 8;

    if (newX < margin) {
      const leftId = player.roomId - 1;
      if (player.roomId % COLS > 0 && doors[player.roomId + ',' + leftId]) {
        player.roomId = leftId; player.localX = RW - margin - 1;
        updateSpyWorldPos(player); return;
      }
      newX = margin;
    }
    if (newX > RW - margin) {
      const rightId = player.roomId + 1;
      if (player.roomId % COLS < COLS - 1 && doors[player.roomId + ',' + rightId]) {
        player.roomId = rightId; player.localX = margin + 1;
        updateSpyWorldPos(player); return;
      }
      newX = RW - margin;
    }
    if (newY < margin) {
      const upId = player.roomId - COLS;
      if (Math.floor(player.roomId / COLS) > 0 && doors[player.roomId + ',' + upId]) {
        player.roomId = upId; player.localY = RH - margin - 1;
        updateSpyWorldPos(player); return;
      }
      newY = margin;
    }
    if (newY > RH - margin) {
      const downId = player.roomId + COLS;
      if (Math.floor(player.roomId / COLS) < ROWS - 1 && doors[player.roomId + ',' + downId]) {
        player.roomId = downId; player.localY = margin + 1;
        updateSpyWorldPos(player); return;
      }
      newY = RH - margin;
    }

    player.localX = newX;
    player.localY = newY;
    updateSpyWorldPos(player);
  }
}

function updateAI(dt, game) {
  if (ai.stunTimer > 0) { ai.stunTimer -= dt; return; }
  if (ai.disguiseTimer > 0) ai.disguiseTimer -= dt;
  if (ai.searchTimer > 0) {
    ai.searchTimer -= dt;
    if (ai.searchTimer <= 0 && ai.searchTarget) {
      completeSearch(ai, ai.searchTarget);
      ai.searchTarget = null;
      ai.aiSearching = false;
    }
    return;
  }

  ai.aiActionTimer -= dt;
  ai.visitedRooms.add(ai.roomId);
  const room = rooms[ai.roomId];

  // 1. Go to exit if all docs collected
  if (ai.docs >= 4) {
    ai.aiState = 'exit';
    const exitRoom = rooms.find(r => r.isExit);
    if (exitRoom && ai.roomId === exitRoom.id) { endGame(game, 'ai_exit'); return; }
    const next = findNextStep(ai.roomId, exitRoom.id);
    if (next !== undefined && next !== ai.roomId) {
      ai.roomId = next;
      ai.localX = RW / 2;
      ai.localY = RH / 2;
      updateSpyWorldPos(ai);
    }
    return;
  }

  // 2. Search unsearched furniture
  const unsearched = room.furniture.filter(f => !f.searched);
  if (unsearched.length > 0 && !ai.aiSearching && ai.aiActionTimer <= 0) {
    const target = unsearched[0];
    ai.searchTimer = 800;
    ai.searchTarget = target;
    ai.aiSearching = true;
    ai.aiActionTimer = 200;
    ai.localX = target.x + 15;
    ai.localY = target.y + 15;
    updateSpyWorldPos(ai);
    return;
  }

  // 3. Set trap occasionally
  if (ai.trapsAvailable > 0 && ai.aiActionTimer <= 0 && Math.random() < 0.02) {
    const candidates = room.furniture.filter(f => f.searched && !f.hasTrap);
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      target.hasTrap = 'ai';
      target.trapOwner = 'ai';
      target.searched = false;
      ai.trapsAvailable--;
      ai.trapsSet++;
      ai.aiActionTimer = 500;
    }
  }

  // 4. Move to unexplored room
  if (ai.aiActionTimer <= 0) {
    const adj = getAdjacentRooms(ai.roomId);
    const unvisited = adj.filter(id => !ai.visitedRooms.has(id));
    let target;
    if (unvisited.length > 0) {
      target = unvisited[Math.floor(Math.random() * unvisited.length)];
    } else {
      let bestRoom = -1, bestCount = -1;
      for (const r of rooms) {
        const count = r.furniture.filter(f => !f.searched).length;
        if (count > bestCount) { bestCount = count; bestRoom = r.id; }
      }
      if (bestRoom >= 0 && bestCount > 0) {
        target = findNextStep(ai.roomId, bestRoom);
      } else {
        target = adj[Math.floor(Math.random() * adj.length)];
      }
    }
    if (target !== undefined && target !== ai.roomId) {
      const nextStep = findNextStep(ai.roomId, target);
      if (nextStep !== undefined) {
        ai.roomId = nextStep;
        ai.localX = RW / 2 + (Math.random() - 0.5) * 40;
        ai.localY = RH / 2 + (Math.random() - 0.5) * 30;
        updateSpyWorldPos(ai);
        ai.aiActionTimer = 600 + Math.random() * 400;
      }
    }
  }
}

// ── Draw helpers ──
function drawFurniture(renderer, text, room, f) {
  const fx = room.x + f.x;
  const fy = room.y + f.y;
  const baseColor = FURNITURE_COLORS[f.type] || '#555555';

  // Compute alpha suffix for searched items
  const alpha = f.searched ? '80' : 'ff';
  const col = baseColor + alpha;

  if (f.type === 'desk') {
    renderer.fillRect(fx, fy, 30, 20, col);
    renderer.fillRect(fx + 2, fy + 2, 26, 4, '#6a5010' + alpha);
  } else if (f.type === 'cabinet') {
    renderer.fillRect(fx, fy, 24, 28, col);
    renderer.fillRect(fx + 10, fy + 8,  4, 4, '#7a7a9a' + alpha);
    renderer.fillRect(fx + 10, fy + 18, 4, 4, '#7a7a9a' + alpha);
  } else if (f.type === 'safe') {
    renderer.fillRect(fx, fy, 22, 22, col);
    // Dial as circle
    renderer.fillCircle(fx + 11, fy + 11, 6, '#6a6a8a' + alpha);
    renderer.fillCircle(fx + 11, fy + 11, 4, '#3a3a5a' + alpha);
  } else if (f.type === 'bookshelf') {
    renderer.fillRect(fx, fy, 28, 26, col);
    for (let i = 0; i < 3; i++) {
      renderer.fillRect(fx + 2, fy + 3 + i * 8, 24, 5, '#845030' + alpha);
    }
  } else if (f.type === 'plant') {
    renderer.fillRect(fx + 6, fy + 15, 12, 10, '#5a3a1a' + alpha);
    renderer.fillCircle(fx + 12, fy + 12, 10, '#2a6a2a' + alpha);
  } else if (f.type === 'locker') {
    renderer.fillRect(fx, fy, 20, 30, col);
    renderer.fillRect(fx + 14, fy + 12, 3, 6, '#6a6a8a' + alpha);
  }

  // Trap indicator (player's own traps only, in current room)
  if (f.hasTrap === 'player' && room.id === player.roomId) {
    text.drawText('!', fx + 12, fy - 10, 10, '#ff4444', 'center');
  }

  // Document glow hint
  if (f.hasDoc && !f.searched && room.id === player.roomId) {
    renderer.setGlow('#ffff64', 0.4);
    renderer.fillRect(fx - 2, fy - 2, 36, 36, '#ffff6408');
    renderer.setGlow(null);
  }
}

function drawSpy(renderer, text, spy, color, label) {
  const x = spy.x;
  const y = spy.y;
  const bodyColor = spy.disguiseTimer > 0 ? '#555555' : color;
  const faceColor = spy.stunTimer > 0 ? '#666666' : '#dddddd';
  const coatColor = spy.disguiseTimer > 0 ? '#444444' : (spy.isPlayer ? '#2a5a2a' : '#5a2a2a');

  // Shadow (dark ellipse — approximate with a squished circle)
  renderer.fillCircle(x, y + 9, 7, '#00000050');

  // Hat (fedora triangle) — polygon
  renderer.setGlow(bodyColor, 0.5);
  renderer.fillPoly([
    { x: x - 10, y: y - 4 },
    { x: x,      y: y - 16 },
    { x: x + 10, y: y - 4 },
  ], bodyColor);
  // Hat brim
  renderer.fillRect(x - 12, y - 5, 24, 3, bodyColor);
  renderer.setGlow(null);

  // Face circle
  renderer.fillCircle(x, y, 7, faceColor);

  // Eyes
  renderer.fillRect(x - 4, y - 2, 3, 2, '#000000');
  renderer.fillRect(x + 1,  y - 2, 3, 2, '#000000');

  // Body coat
  renderer.fillRect(x - 6, y + 3, 12, 10, coatColor);

  // Collar triangle
  renderer.strokePoly([
    { x: x - 6, y: y + 3 },
    { x: x,     y: y + 8 },
    { x: x + 6, y: y + 3 },
  ], bodyColor, 1.5, false);

  // Label above
  text.drawText(label, x, y - 22, 8, color, 'center');

  // Stun stars (animated)
  if (spy.stunTimer > 0) {
    const t = animTime * 0.05;
    for (let i = 0; i < 3; i++) {
      const angle = t + i * 2.1;
      const sx = x + Math.cos(angle) * 14;
      const sy = y - 8 + Math.sin(angle) * 8;
      text.drawText('*', sx, sy, 10, '#ffff00', 'center');
    }
  }

  // Search indicator
  if (spy.searchTimer > 0) {
    const dots = '.'.repeat(Math.floor(animTime / 18) % 4);
    text.drawText('Searching' + dots, x, y - 26, 9, '#ffff00', 'center');
  }
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  function initAll() {
    initRooms();
    player = createSpy(0, true);
    ai     = createSpy(rooms.length - 1, false);
    timerMs = 180000;
    combatState = null;
    messageText = '';
    messageTimer = 0;
    score = 0;
    animTime = 0;
    scoreEl.textContent = '0';
    playerDocsEl.textContent = '0';
    playerTrapsEl.textContent = '0';
    timerEl.textContent = '3:00';
  }

  game.onInit = () => {
    initAll();
    game.showOverlay('SPY VS SPY', 'Press SPACE to infiltrate');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Key actions — attach directly to canvas for action keys
  // (combat choices, trap, search, disguise need one-shot press detection)
  const canvas = document.getElementById('game');
  canvas.addEventListener('keydown', () => {}); // keep focusable hint

  // Use engine input for action keys via wasPressed in onUpdate
  game.onUpdate = (dt) => {
    const input = game.input;
    animTime += dt;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        initAll();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        initAll();
        game.setState('playing');
      }
      return;
    }

    // --- playing ---

    // Timer
    timerMs -= dt;
    if (timerMs <= 0) { timerMs = 0; endGame(game, 'time'); return; }
    const sec = Math.ceil(timerMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;

    // Message timer
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) { messageText = ''; messageTimer = 0; }
    }

    // Action key one-shots
    if (input.wasPressed(' ')) playerInteract(game);
    if (input.wasPressed('z') || input.wasPressed('Z')) playerSetTrap();
    if (input.wasPressed('x') || input.wasPressed('X')) playerSearch(game);
    if (input.wasPressed('c') || input.wasPressed('C')) playerDisguise();

    // Combat choices
    if (combatState && combatState.phase === 'choose') {
      if (input.wasPressed('1')) playerCombatChoice('rock');
      if (input.wasPressed('2')) playerCombatChoice('paper');
      if (input.wasPressed('3')) playerCombatChoice('scissors');
    }

    // Combat update
    if (combatState) {
      combatState.timer -= dt;
      if (combatState.timer <= 0) resolveCombat();
      // Don't update spies during combat resolve phase
      if (combatState) return;
    }

    updatePlayer(dt, game);
    updateAI(dt, game);

    // Check same-room combat trigger
    if (player.roomId === ai.roomId &&
        player.stunTimer <= 0 && ai.stunTimer <= 0 &&
        player.disguiseTimer <= 0 && ai.disguiseTimer <= 0 &&
        !combatState) {
      startCombat();
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a1e');

    // Draw rooms
    for (const room of rooms) {
      const visible = isRoomVisible(room.id);
      const isCurrent = room.id === player.roomId;

      // Room fill
      if (visible) {
        renderer.fillRect(room.x + 1, room.y + 1, RW - 2, RH - 2, isCurrent ? '#1e1e3a' : '#151530');
      } else {
        renderer.fillRect(room.x + 1, room.y + 1, RW - 2, RH - 2, '#0c0c1c');
      }

      // Room border (drawn as 4 lines)
      const borderCol = visible ? '#444444' : '#222222';
      renderer.drawLine(room.x,        room.y,        room.x + RW,   room.y,        borderCol, 1);
      renderer.drawLine(room.x + RW,   room.y,        room.x + RW,   room.y + RH,   borderCol, 1);
      renderer.drawLine(room.x + RW,   room.y + RH,   room.x,        room.y + RH,   borderCol, 1);
      renderer.drawLine(room.x,        room.y + RH,   room.x,        room.y,        borderCol, 1);

      // Doors
      const doorCol = '#3a3a4a';
      if (room.col < COLS - 1 && doors[room.id + ',' + (room.id + 1)]) {
        renderer.fillRect(room.x + RW - 2, room.y + RH / 2 - 12, 4, 24, doorCol);
      }
      if (room.row < ROWS - 1 && doors[room.id + ',' + (room.id + COLS)]) {
        renderer.fillRect(room.x + RW / 2 - 12, room.y + RH - 2, 24, 4, doorCol);
      }

      // Exit marker
      if (room.isExit && visible) {
        renderer.setGlow('#44ff44', 0.5);
        renderer.strokePoly([
          { x: room.x + 2, y: room.y + 2 },
          { x: room.x + RW - 2, y: room.y + 2 },
          { x: room.x + RW - 2, y: room.y + RH - 2 },
          { x: room.x + 2, y: room.y + RH - 2 },
        ], '#44ff44', 2, true);
        renderer.setGlow(null);
        text.drawText('EXIT', room.x + RW / 2, room.y + RH - 14, 10, '#44ff44', 'center');
      }

      if (!visible) continue;

      // Furniture
      for (const f of room.furniture) {
        drawFurniture(renderer, text, room, f);
      }

      // Room label
      text.drawText('R' + room.id, room.x + 4, room.y + 2, 8, '#333333', 'left');
    }

    // AI spy (visible rooms only, not when disguised)
    if (isRoomVisible(ai.roomId) && ai.disguiseTimer <= 0) {
      drawSpy(renderer, text, ai, '#cc4444', 'AI');
    }

    // Player spy
    drawSpy(renderer, text, player, '#44cc44', 'YOU');

    // Combat overlay
    if (combatState) {
      renderer.fillRect(W / 2 - 120, H / 2 - 50, 240, 100, '#000000cc');
      renderer.strokePoly([
        { x: W / 2 - 120, y: H / 2 - 50 },
        { x: W / 2 + 120, y: H / 2 - 50 },
        { x: W / 2 + 120, y: H / 2 + 50 },
        { x: W / 2 - 120, y: H / 2 + 50 },
      ], '#888888', 2, true);
      text.drawText('COMBAT!', W / 2, H / 2 - 38, 16, '#ffffff', 'center');

      if (combatState.phase === 'choose') {
        text.drawText('1=Rock  2=Paper  3=Scissors', W / 2, H / 2 - 12, 11, '#aaaaaa', 'center');
        const timeLeft = Math.ceil(combatState.timer / 1000);
        text.drawText('Choose in ' + timeLeft + 's...', W / 2, H / 2 + 8, 11, '#aaaaaa', 'center');
      } else {
        text.drawText('You: ' + (combatState.playerChoice || '???'), W / 2 - 50, H / 2 - 12, 12, '#44cc44', 'center');
        text.drawText('AI: ' + combatState.aiChoice, W / 2 + 50, H / 2 - 12, 12, '#cc4444', 'center');
        const resColor = combatState.result === 'player' ? '#44ff44' : combatState.result === 'ai' ? '#ff4444' : '#ffff00';
        const resText  = combatState.result === 'player' ? 'YOU WIN!' : combatState.result === 'ai' ? 'YOU LOSE!' : 'DRAW!';
        text.drawText(resText, W / 2, H / 2 + 16, 14, resColor, 'center');
      }
    }

    // Message bar
    if (messageText) {
      renderer.fillRect(0, H - 28, W, 28, '#000000b0');
      text.drawText(messageText, W / 2, H - 24, 12, '#888888', 'center');
    }

    // HUD: doc indicators
    text.drawText('DOCS:', 5, 2, 10, '#888888', 'left');
    for (let i = 0; i < 4; i++) {
      const filled = i < player.docs;
      renderer.fillRect(50 + i * 16, 3, 12, 12, filled ? '#ffff00' : '#333333');
      renderer.strokePoly([
        { x: 50 + i * 16,      y: 3 },
        { x: 50 + i * 16 + 12, y: 3 },
        { x: 50 + i * 16 + 12, y: 15 },
        { x: 50 + i * 16,      y: 15 },
      ], '#666666', 1, true);
      if (filled) {
        text.drawText('D', 56 + i * 16, 3, 8, '#000000', 'center');
      }
    }
    text.drawText('TRAPS:' + player.trapsAvailable, 125, 2, 10, '#888888', 'left');

    // Stun overlay
    if (player.stunTimer > 0) {
      renderer.fillRect(0, 0, W, H, '#ff000050');
      renderer.setGlow('#ff4444', 0.8);
      text.drawText('STUNNED!', W / 2, H / 2 - 16, 24, '#ff4444', 'center');
      text.drawText(Math.ceil(player.stunTimer / 1000) + 's', W / 2, H / 2 + 12, 14, '#ff4444', 'center');
      renderer.setGlow(null);
    }

    // Disguise indicator
    if (player.disguiseTimer > 0) {
      text.drawText('DISGUISED ' + Math.ceil(player.disguiseTimer / 1000) + 's', W - 5, 2, 10, '#888888', 'right');
    }
  };

  game.start();
  return game;
}
