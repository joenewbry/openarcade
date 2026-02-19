// naval-commander/game.js — Naval Commander ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const MAX_TURNS = 20;

// ── Game state ──
let score = 0;
let turn, playerGold, aiGold, ports, fleets, seaLanes, selectedFleet, selectedPort, phase;
let combatLog, turnLog, animations;
let mapSeed, islandTiles;
let nextFleetId;
let buildButtons = [];

// DOM HUD elements (kept in DOM for readability)
const hudTurn    = document.getElementById('hud-turn');
const hudGold    = document.getElementById('hud-gold');
const hudPorts   = document.getElementById('hud-ports');
const hudShips   = document.getElementById('hud-ships');
const hudScore   = document.getElementById('hud-score');
const infoSel    = document.getElementById('info-selection');
const infoAct    = document.getElementById('info-actions');
const infoInt    = document.getElementById('info-intel');

// Ship stats
const SHIP_TYPES = {
  frigate:    { name: 'Frigate',    attack: 2, defense: 1, hp: 3, speed: 3, cost: 5,  symbol: 'F' },
  destroyer:  { name: 'Destroyer',  attack: 4, defense: 3, hp: 5, speed: 2, cost: 10, symbol: 'D' },
  battleship: { name: 'Battleship', attack: 7, defense: 5, hp: 8, speed: 1, cost: 18, symbol: 'B' },
};

// ── Seeded RNG ──
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Map generation ──
function generateMap() {
  const rng = seededRandom(mapSeed);
  ports = [];
  seaLanes = [];
  islandTiles = [];

  for (let i = 0; i < 35; i++) {
    islandTiles.push({
      x: rng() * W,
      y: rng() * H,
      r: 6 + rng() * 18,
      shade: rng() * 0.3 + 0.15,
    });
  }

  const portPositions = [
    { x: 60,  y: 250, name: 'Haven',       owner: 'player'  },
    { x: 540, y: 250, name: 'Ironhold',    owner: 'ai'      },
    { x: 200, y: 80,  name: 'Northwatch',  owner: 'neutral' },
    { x: 400, y: 80,  name: 'Stormcrest',  owner: 'neutral' },
    { x: 300, y: 250, name: 'Midway',      owner: 'neutral' },
    { x: 200, y: 420, name: 'Tidecross',   owner: 'neutral' },
    { x: 400, y: 420, name: 'Coral Bay',   owner: 'neutral' },
    { x: 130, y: 140, name: 'Gale Point',  owner: 'neutral' },
    { x: 470, y: 140, name: 'Bastion',     owner: 'neutral' },
    { x: 130, y: 370, name: 'Serpent Isle',owner: 'neutral' },
    { x: 470, y: 370, name: 'Duskport',    owner: 'neutral' },
  ];

  portPositions.forEach((p, i) => {
    ports.push({
      id: i, x: p.x, y: p.y, name: p.name, owner: p.owner,
      income: p.owner === 'neutral' ? 3 : 5,
      garrison: p.owner === 'neutral' ? 1 : 0,
    });
  });

  for (let i = 0; i < ports.length; i++) {
    for (let j = i + 1; j < ports.length; j++) {
      const dx = ports[i].x - ports[j].x;
      const dy = ports[i].y - ports[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 220) seaLanes.push({ from: i, to: j, dist });
    }
  }

  // Ensure connectivity
  const connected = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    const cur = queue.shift();
    seaLanes.forEach(l => {
      const other = l.from === cur ? l.to : (l.to === cur ? l.from : -1);
      if (other >= 0 && !connected.has(other)) { connected.add(other); queue.push(other); }
    });
  }
  ports.forEach((p, i) => {
    if (!connected.has(i)) {
      let bestDist = Infinity, bestJ = 0;
      ports.forEach((q, j) => {
        if (connected.has(j)) {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < bestDist) { bestDist = d; bestJ = j; }
        }
      });
      seaLanes.push({ from: i, to: bestJ, dist: bestDist });
      connected.add(i);
    }
  });
}

function makeShip(type) {
  const t = SHIP_TYPES[type];
  return { type, name: t.name, attack: t.attack, defense: t.defense, hp: t.hp, maxHp: t.hp, speed: t.speed, symbol: t.symbol };
}

function initGame() {
  turn = 1;
  playerGold = 10;
  aiGold = 10;
  score = 0;
  selectedFleet = null;
  selectedPort = null;
  phase = 'player';
  combatLog = [];
  turnLog = '';
  animations = [];
  mapSeed = Date.now() % 100000;
  nextFleetId = 2;
  buildButtons = [];

  generateMap();

  fleets = [
    { id: 0, owner: 'player', portId: 0, ships: [makeShip('frigate'), makeShip('destroyer'), makeShip('frigate')], moving: null, x: ports[0].x, y: ports[0].y },
    { id: 1, owner: 'ai',     portId: 1, ships: [makeShip('frigate'), makeShip('destroyer'), makeShip('frigate')], moving: null, x: ports[1].x, y: ports[1].y },
  ];
}

// ── Helpers ──
function getPortNeighbors(portId) {
  const neighbors = [];
  seaLanes.forEach(l => {
    if (l.from === portId) neighbors.push(l.to);
    if (l.to  === portId) neighbors.push(l.from);
  });
  return neighbors;
}

function getFleetPower(fleet)  { return fleet.ships.reduce((s, sh) => s + sh.attack + sh.defense + sh.hp, 0); }
function getFleetAttack(fleet) { return fleet.ships.reduce((s, sh) => s + sh.attack, 0); }
function countPorts(owner)     { return ports.filter(p => p.owner === owner).length; }
function countShips(owner)     { return fleets.filter(f => f.owner === owner).reduce((s, f) => s + f.ships.length, 0); }

// ── Combat ──
function resolveCombat(attacker, defender) {
  const log = [];
  log.push(`${attacker.owner === 'player' ? 'Your' : 'Enemy'} fleet engages!`);
  let rounds = 0;
  while (attacker.ships.length > 0 && defender.ships.length > 0 && rounds < 10) {
    rounds++;
    const atkDmg = attacker.ships.reduce((s, sh) => s + sh.attack, 0);
    const defDmg = defender.ships.reduce((s, sh) => s + sh.attack, 0);

    let remainDmg = atkDmg;
    for (let i = defender.ships.length - 1; i >= 0 && remainDmg > 0; i--) {
      const actual = Math.max(0, remainDmg - defender.ships[i].defense);
      defender.ships[i].hp -= Math.max(1, Math.floor(actual / Math.max(1, defender.ships.length)));
      remainDmg = Math.max(0, remainDmg - defender.ships[i].defense - 1);
    }
    remainDmg = defDmg;
    for (let i = attacker.ships.length - 1; i >= 0 && remainDmg > 0; i--) {
      const actual = Math.max(0, remainDmg - attacker.ships[i].defense);
      attacker.ships[i].hp -= Math.max(1, Math.floor(actual / Math.max(1, attacker.ships.length)));
      remainDmg = Math.max(0, remainDmg - attacker.ships[i].defense - 1);
    }

    const defLost = defender.ships.filter(s => s.hp <= 0).length;
    const atkLost = attacker.ships.filter(s => s.hp <= 0).length;
    defender.ships = defender.ships.filter(s => s.hp > 0);
    attacker.ships = attacker.ships.filter(s => s.hp > 0);
    if (defLost > 0) log.push(`Round ${rounds}: ${defLost} enemy ship(s) sunk`);
    if (atkLost > 0) log.push(`Round ${rounds}: ${atkLost} allied ship(s) lost`);
  }

  const result = attacker.ships.length > 0 ? 'attacker' : (defender.ships.length > 0 ? 'defender' : 'draw');
  log.push(result === 'attacker' ? 'Victory!' : (result === 'defender' ? 'Defeated!' : 'Mutual destruction!'));
  return { result, log };
}

// ── Player actions ──
function moveFleetTo(fleet, targetPortId) {
  if (fleet.owner !== 'player' || fleet.portId === null) return;
  const neighbors = getPortNeighbors(fleet.portId);
  if (!neighbors.includes(targetPortId)) { turnLog = 'Not adjacent! Move to a connected port.'; return; }
  fleet.moving = { from: fleet.portId, to: targetPortId, progress: 0 };
  fleet.portId = null;
  selectedFleet = null;
  turnLog = `Fleet moving to ${ports[targetPortId].name}`;
}

function buildShip(port, type) {
  if (port.owner !== 'player') return;
  const cost = SHIP_TYPES[type].cost;
  if (playerGold < cost) { turnLog = 'Not enough gold!'; return; }
  playerGold -= cost;
  let fleet = fleets.find(f => f.owner === 'player' && f.portId === port.id);
  if (!fleet) {
    fleet = { id: nextFleetId++, owner: 'player', portId: port.id, ships: [], moving: null, x: port.x, y: port.y };
    fleets.push(fleet);
  }
  fleet.ships.push(makeShip(type));
  turnLog = `Built ${SHIP_TYPES[type].name} at ${port.name} (-${cost}g)`;
  updateHUD();
}

function resolveMovement(owner) {
  const moving = fleets.filter(f => f.owner === owner && f.moving);
  moving.forEach(fleet => {
    const target = fleet.moving.to;
    fleet.portId = target;
    fleet.x = ports[target].x;
    fleet.y = ports[target].y;
    fleet.moving = null;

    const enemies = fleets.filter(f => f.owner !== owner && f.portId === target && f.ships.length > 0);
    enemies.forEach(enemy => {
      const { result, log } = resolveCombat(fleet, enemy);
      combatLog = combatLog.concat(log);
      if (result === 'attacker') {
        if (owner === 'player') score += 2;
        fleets = fleets.filter(f => f !== enemy);
      } else if (result === 'defender') {
        if (owner !== 'player') score -= 1;
        fleets = fleets.filter(f => f !== fleet);
      } else {
        fleets = fleets.filter(f => f !== enemy && f !== fleet);
      }
    });

    const port = ports[target];
    if (port.owner !== owner && fleets.some(f => f.owner === owner && f.portId === target && f.ships.length > 0)) {
      if (port.garrison > 0 && port.owner === 'neutral') {
        const garrisonFleet = { ships: [] };
        for (let i = 0; i < port.garrison; i++) garrisonFleet.ships.push(makeShip('frigate'));
        const attFleet = fleets.find(f => f.owner === owner && f.portId === target && f.ships.length > 0);
        if (attFleet) {
          const { result, log } = resolveCombat(attFleet, garrisonFleet);
          combatLog = combatLog.concat(log);
          if (result !== 'attacker') {
            fleets = fleets.filter(f => f !== attFleet);
            return;
          }
        }
      }
      port.owner = owner;
      port.garrison = 0;
      combatLog.push(`${owner === 'player' ? 'You' : 'AI'} captured ${port.name}!`);
      if (owner === 'player') score += 3;
    }
  });
  fleets = fleets.filter(f => f.ships.length > 0);
}

function collectIncome() {
  ports.forEach(p => {
    if (p.owner === 'player') playerGold += p.income;
    else if (p.owner === 'ai')    aiGold  += p.income;
  });
  seaLanes.forEach(l => {
    if (ports[l.from].owner === 'player' && ports[l.to].owner === 'player') playerGold += 1;
    if (ports[l.from].owner === 'ai'     && ports[l.to].owner === 'ai')     aiGold     += 1;
  });
}

function checkGameEnd(game) {
  if (turn >= MAX_TURNS) {
    const playerScore = score + countPorts('player') * 2;
    const aiScore     = countPorts('ai') * 2 + countShips('ai');
    score = playerScore;
    game.setState('over');
    showGameOver(game, playerScore, aiScore);
    return;
  }
  if (countPorts('player') === 0 && countShips('player') === 0 && turn > 1) {
    game.setState('over');
    showGameOver(game, score, 999);
    return;
  }
  if (countPorts('ai') === 0 && countShips('ai') === 0 && turn > 1) {
    score += 10;
    game.setState('over');
    showGameOver(game, score, 0);
  }
}

function showGameOver(game, pScore, aScore) {
  const won = pScore > aScore;
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <h1 style="font-size:32px;color:#48c;text-shadow:0 0 16px #48c;margin-bottom:8px">${won ? 'VICTORY' : 'DEFEAT'}</h1>
      <h2 style="font-size:18px;color:#aaa;margin-bottom:16px;font-weight:normal">${won ? 'The seas are yours!' : 'The enemy controls the waves.'}</h2>
      <div style="font-size:14px;color:#ccc;margin:4px 0">Your Score: <span style="color:#48c;font-weight:bold">${pScore}</span></div>
      <div style="font-size:14px;color:#ccc;margin:4px 0">Ports Held: <span style="color:#48c;font-weight:bold">${countPorts('player')}</span></div>
      <div style="font-size:14px;color:#ccc;margin:4px 0">Ships Remaining: <span style="color:#48c;font-weight:bold">${countShips('player')}</span></div>
      <div style="font-size:14px;color:#ccc;margin:4px 0">Enemy Score: <span style="color:#48c;font-weight:bold">${aScore}</span></div>
      <br>
      <button id="restart-btn" style="padding:12px 36px;font-size:16px;font-family:'Courier New',monospace;background:transparent;color:#48c;border:2px solid #48c;cursor:pointer;text-transform:uppercase;letter-spacing:2px">PLAY AGAIN</button>
    `;
    document.getElementById('restart-btn').addEventListener('click', () => {
      initGame();
      combatLog = [];
      game.setState('playing');
      game.hideOverlay();
      updateHUD();
    });
  }
}

// ── AI ──
function aiTurn() {
  phase = 'ai';
  const aiPorts   = ports.filter(p => p.owner === 'ai');

  aiPorts.forEach(port => {
    if (aiGold >= 5) {
      let fleet = fleets.find(f => f.owner === 'ai' && f.portId === port.id);
      if (!fleet) {
        fleet = { id: nextFleetId++, owner: 'ai', portId: port.id, ships: [], moving: null, x: port.x, y: port.y };
        fleets.push(fleet);
      }
      if (aiGold >= 18 && fleet.ships.filter(s => s.type === 'battleship').length < 1) {
        fleet.ships.push(makeShip('battleship')); aiGold -= 18;
      } else if (aiGold >= 10) {
        fleet.ships.push(makeShip('destroyer'));  aiGold -= 10;
      } else if (aiGold >= 5) {
        fleet.ships.push(makeShip('frigate'));    aiGold -= 5;
      }
    }
  });

  const updatedAiFleets = fleets.filter(f => f.owner === 'ai' && f.portId !== null && !f.moving);
  updatedAiFleets.forEach(fleet => {
    if (fleet.ships.length < 1) return;
    const neighbors = getPortNeighbors(fleet.portId);
    const power = getFleetPower(fleet);
    let bestTarget = null, bestScore = -Infinity;

    neighbors.forEach(nId => {
      const port = ports[nId];
      let tScore = 0;
      if (port.owner === 'neutral') {
        tScore = 20 + port.income * 3;
        const enemyFleet = fleets.find(f => f.owner === 'player' && f.portId === nId);
        if (enemyFleet) tScore -= getFleetPower(enemyFleet) * 2;
      } else if (port.owner === 'player') {
        const enemyFleet = fleets.find(f => f.owner === 'player' && f.portId === nId);
        const enemyPower = enemyFleet ? getFleetPower(enemyFleet) : 0;
        tScore = power > enemyPower * 1.2 ? 30 + port.income * 4 - enemyPower : -10;
      } else {
        const hasPlayerNeighbors = getPortNeighbors(nId).some(nn => ports[nn].owner === 'player');
        tScore = hasPlayerNeighbors ? 5 : -5;
      }
      tScore += getPortNeighbors(nId).length * 1.5;
      const currentHasThreat = neighbors.some(nn => ports[nn].owner === 'player');
      if (currentHasThreat && port.owner === 'ai') tScore -= 15;
      if (tScore > bestScore) { bestScore = tScore; bestTarget = nId; }
    });

    if (bestTarget !== null && bestScore > 0) {
      fleet.moving = { from: fleet.portId, to: bestTarget, progress: 0 };
      fleet.portId = null;
    }
  });
}

function endPlayerTurn(game) {
  if (phase !== 'player') return;
  phase = 'resolve';
  resolveMovement('player');
  setTimeout(() => {
    aiTurn();
    setTimeout(() => {
      resolveMovement('ai');
      setTimeout(() => {
        collectIncome();
        checkGameEnd(game);
        if (game.state === 'playing') {
          turn++;
          phase = 'player';
          selectedFleet = null;
          selectedPort = null;
          updateHUD();
        }
      }, 300);
    }, 300);
  }, 300);
}

// ── HUD ──
function updateHUD() {
  if (!ports) return;
  if (hudTurn)  hudTurn.textContent  = `${turn}/${MAX_TURNS}`;
  if (hudGold)  hudGold.textContent  = playerGold;
  if (hudPorts) hudPorts.textContent = countPorts('player');
  if (hudShips) hudShips.textContent = countShips('player');
  if (hudScore) hudScore.textContent = score;

  if (selectedFleet) {
    const p = ports.find(pp => pp.id === selectedFleet.portId);
    const shipList = selectedFleet.ships.map(s => `${s.symbol}(${s.hp}/${s.maxHp})`).join(' ');
    if (infoSel) infoSel.innerHTML = `Fleet at ${p ? p.name : '?'}<br>${shipList}<br>Power: ${getFleetPower(selectedFleet)}`;
    const neighbors = p ? getPortNeighbors(p.id) : [];
    if (infoAct) infoAct.innerHTML = `Click adjacent port to move:<br>${neighbors.map(n => ports[n].name + ' (' + ports[n].owner + ')').join(', ')}`;
  } else if (selectedPort) {
    if (infoSel) infoSel.innerHTML = `${selectedPort.name} (${selectedPort.owner})<br>Income: ${selectedPort.income}g`;
    if (infoAct) {
      if (selectedPort.owner === 'player') {
        infoAct.innerHTML = `Build: [1] Frigate 5g | [2] Destroyer 10g | [3] Battleship 18g`;
      } else {
        infoAct.innerHTML = selectedPort.owner === 'neutral' ? `Garrison: ${selectedPort.garrison} ship(s)` : 'Enemy controlled';
      }
    }
  } else {
    if (infoSel) infoSel.innerHTML = 'Click a fleet or port';
    if (infoAct) infoAct.innerHTML = turnLog || 'Space/Enter = End Turn';
  }

  if (infoInt) {
    infoInt.innerHTML = `AI: ${countPorts('ai')} ports, ${countShips('ai')} ships<br>` +
      (combatLog.length > 0 ? combatLog.slice(-2).join('<br>') : 'No combat yet');
  }
}

// ── Drawing helpers ──
// Hex color with alpha [0..1] → #rrggbbaa string
function withAlpha(hex6, alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return hex6 + a;
}

// Horizontal wave lines for water — approximate without canvas gradient
let waveTime = 0;

function drawWater(renderer) {
  // Deep ocean base
  renderer.fillRect(0, 0, W, H, '#0a1628');
  // Subtle wave lines — render as thin translucent rects
  for (let row = 0; row < H; row += 12) {
    for (let x = 0; x < W; x += 40) {
      const wave = Math.sin(x / 40 + waveTime + row / 30) * 3;
      renderer.fillRect(x, row + wave, 38, 1, '#1e4a7408');
    }
  }
}

function drawIslands(renderer) {
  islandTiles.forEach(t => {
    // Approximate radial gradient with layered circles
    renderer.setGlow('#1c4128', 0.3);
    renderer.fillCircle(t.x, t.y, t.r, withAlpha('#225032', Math.min(1, t.shade + 0.15)));
    renderer.fillCircle(t.x, t.y, t.r * 0.6, withAlpha('#1c4128', t.shade));
    renderer.setGlow(null);
  });
}

function drawSeaLanes(renderer) {
  seaLanes.forEach(l => {
    const p1 = ports[l.from];
    const p2 = ports[l.to];
    const bothPlayer = p1.owner === 'player' && p2.owner === 'player';
    const bothAI     = p1.owner === 'ai'     && p2.owner === 'ai';

    if (bothPlayer) {
      renderer.drawLine(p1.x, p1.y, p2.x, p2.y, '#4488cc59', 2);
    } else if (bothAI) {
      renderer.drawLine(p1.x, p1.y, p2.x, p2.y, '#cc444440', 1);
    } else {
      // Dashed neutral lane — use dashedLine
      renderer.dashedLine(p1.x, p1.y, p2.x, p2.y, '#64647826', 1, 4, 6);
    }
  });
}

function drawPorts(renderer, text) {
  ports.forEach(p => {
    const colorHex = p.owner === 'player' ? '#4488cc' : (p.owner === 'ai' ? '#cc4444' : '#888888');
    const isSelected = selectedPort && selectedPort.id === p.id;

    if (isSelected || p.owner === 'player') {
      renderer.setGlow(colorHex, isSelected ? 0.8 : 0.4);
    }

    // Port circle fill (dark bg)
    renderer.fillCircle(p.x, p.y, 14, '#1a1a2e');
    // Port circle stroke via polygon
    const pts = [];
    const segs = 20;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14 });
    }
    renderer.strokePoly(pts, colorHex, isSelected ? 3 : 2, false);

    renderer.setGlow(null);

    // Port name
    text.drawText(p.name, p.x, p.y - 26, 9, '#aaaaaa', 'center');
    // Income
    text.drawText(`+${p.income}g`, p.x, p.y - 36, 8, '#cccc88', 'center');
    // Owner symbol
    const sym = p.owner === 'player' ? 'P' : (p.owner === 'ai' ? 'E' : 'N');
    text.drawText(sym, p.x, p.y - 5, 10, colorHex, 'center');

    // Garrison
    if (p.owner === 'neutral' && p.garrison > 0) {
      text.drawText(`[${p.garrison}]`, p.x + 22, p.y - 4, 8, '#666666', 'left');
    }
  });
}

function drawFleets(renderer, text) {
  fleets.forEach(f => {
    if (f.ships.length === 0) return;
    const isSelected = selectedFleet && selectedFleet.id === f.id;
    const color = f.owner === 'player' ? '#4488cc' : '#cc4444';

    let fx = f.x, fy = f.y;
    if (f.moving) {
      const from = ports[f.moving.from];
      const to   = ports[f.moving.to];
      f.moving.progress = Math.min(1, f.moving.progress + 0.05);
      fx = from.x + (to.x - from.x) * f.moving.progress;
      fy = from.y + (to.y - from.y) * f.moving.progress;
      f.x = fx; f.y = fy;
    }

    const offsetX = f.owner === 'player' ? -15 : 15;
    const offsetY = 18;
    const dx = fx + offsetX;
    const dy = fy + offsetY;
    const bw = Math.max(30, f.ships.length * 10 + 8);
    const bh = 16;

    if (isSelected) renderer.setGlow(color, 0.6);

    // Box fill
    renderer.fillRect(dx - bw / 2, dy - bh / 2, bw, bh, '#1a1a2eE6');
    // Box border
    const bpts = [
      { x: dx - bw / 2, y: dy - bh / 2 },
      { x: dx + bw / 2, y: dy - bh / 2 },
      { x: dx + bw / 2, y: dy + bh / 2 },
      { x: dx - bw / 2, y: dy + bh / 2 },
    ];
    renderer.strokePoly(bpts, color, isSelected ? 2 : 1, true);

    renderer.setGlow(null);

    // Ship symbols
    const shipStr = f.ships.map(s => s.symbol).join('');
    text.drawText(shipStr, dx, dy - 5, 9, color, 'center');
    // Power indicator
    text.drawText(`PWR:${getFleetAttack(f)}`, dx, dy + 7, 7, '#666666', 'center');
  });
}

function drawUI(renderer, text, game) {
  buildButtons = [];

  // End Turn button
  const btnX = W - 90, btnY = 8, btnW = 80, btnH = 22;
  renderer.fillRect(btnX, btnY, btnW, btnH, '#4488cc26');
  const btnPts = [
    { x: btnX, y: btnY }, { x: btnX + btnW, y: btnY },
    { x: btnX + btnW, y: btnY + btnH }, { x: btnX, y: btnY + btnH },
  ];
  renderer.strokePoly(btnPts, '#4488cc', 1, true);
  text.drawText('END TURN', btnX + btnW / 2, btnY + 6, 10, '#4488cc', 'center');

  // Turn / gold labels
  text.drawText(`Turn ${turn}/${MAX_TURNS}`, 8, 8, 10, '#4488cc', 'left');
  text.drawText(`Gold: ${playerGold}`, 8, 22, 10, '#4488cc', 'left');

  // Build panel
  if (selectedPort && selectedPort.owner === 'player' && phase === 'player') {
    const panelY = H - 36;
    renderer.fillRect(0, panelY, W, 36, '#0f0f23E6');
    const panelPts = [
      { x: 0, y: panelY }, { x: W, y: panelY },
      { x: W, y: panelY + 36 }, { x: 0, y: panelY + 36 },
    ];
    renderer.strokePoly(panelPts, '#4488cc55', 1, true);

    const types  = ['frigate', 'destroyer', 'battleship'];
    const labels = ['Frigate 5g', 'Destroyer 10g', 'Battleship 18g'];
    types.forEach((type, i) => {
      const bx = 20 + i * 185;
      const by = panelY + 5;
      const bw = 165, bh = 24;
      const canAfford = playerGold >= SHIP_TYPES[type].cost;
      const fillColor = canAfford ? '#4488cc26' : '#32323c26';
      const borderColor = canAfford ? '#4488cc' : '#444444';

      renderer.fillRect(bx, by, bw, bh, fillColor);
      const btnBpts = [
        { x: bx, y: by }, { x: bx + bw, y: by },
        { x: bx + bw, y: by + bh }, { x: bx, y: by + bh },
      ];
      renderer.strokePoly(btnBpts, borderColor, 1, true);
      text.drawText(`[${i + 1}] ${labels[i]}`, bx + bw / 2, by + 7, 10, canAfford ? '#4488cc' : '#555555', 'center');

      if (canAfford) buildButtons.push({ x: bx, y: by, w: bw, h: bh, port: selectedPort, type });
    });
  }

  // Movement highlights (dashed circles around neighbor ports)
  if (selectedFleet && selectedFleet.portId !== null) {
    const neighbors = getPortNeighbors(selectedFleet.portId);
    neighbors.forEach(nId => {
      const p = ports[nId];
      const pts = [];
      const segs = 24;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22 });
      }
      // Dashed effect: draw every other segment
      for (let i = 0; i < segs; i += 2) {
        const j = (i + 1) % segs;
        renderer.drawLine(pts[i].x, pts[i].y, pts[j].x, pts[j].y, '#4488cc80', 2);
      }
    });
  }

  // Combat log
  if (combatLog.length > 0 && phase === 'player') {
    const lines = combatLog.slice(-4);
    const logH = lines.length * 14 + 10;
    renderer.fillRect(W / 2 - 140, 40, 280, logH, '#0f0f23D9');
    const logPts = [
      { x: W / 2 - 140, y: 40 },
      { x: W / 2 + 140, y: 40 },
      { x: W / 2 + 140, y: 40 + logH },
      { x: W / 2 - 140, y: 40 + logH },
    ];
    renderer.strokePoly(logPts, '#cc4444', 1, true);
    lines.forEach((line, i) => {
      text.drawText(line, W / 2, 55 + i * 14, 10, '#ee8888', 'center');
    });
  }
}

// ── Mouse click handler ──
function handleClick(mx, my, game) {
  if (game.state !== 'playing' || phase !== 'player') return;

  // Check end turn button
  if (mx >= W - 90 && mx <= W - 10 && my >= 8 && my <= 30) {
    endPlayerTurn(game);
    return;
  }

  // Check build buttons (captured in last draw)
  for (const btn of buildButtons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      buildShip(btn.port, btn.type);
      updateHUD();
      return;
    }
  }

  // Check port click
  let clickedPort = null;
  ports.forEach(p => { if (Math.hypot(mx - p.x, my - p.y) < 20) clickedPort = p; });

  // Check fleet click
  let clickedFleet = null;
  fleets.forEach(f => {
    if (f.owner === 'player' && f.portId !== null) {
      const ox = f.x - 15, oy = f.y + 18;
      if (Math.hypot(mx - ox, my - oy) < 18) clickedFleet = f;
    }
  });

  if (selectedFleet) {
    if (clickedPort) {
      moveFleetTo(selectedFleet, clickedPort.id);
      updateHUD();
      return;
    }
    selectedFleet = null;
    selectedPort  = null;
  }

  if (clickedFleet) {
    selectedFleet = clickedFleet;
    selectedPort  = null;
    turnLog = `Fleet selected at ${ports[clickedFleet.portId].name} (${clickedFleet.ships.length} ships)`;
  } else if (clickedPort) {
    selectedPort  = clickedPort;
    selectedFleet = null;
    if (clickedPort.owner === 'player') {
      turnLog = `${clickedPort.name}: Income ${clickedPort.income}g. Build ships here.`;
    } else {
      turnLog = `${clickedPort.name} (${clickedPort.owner}): Income ${clickedPort.income}g`;
    }
  }
  updateHUD();
}

// ── Entry point ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('NAVAL COMMANDER', 'Control the Seas');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse click
  game.canvas.addEventListener('click', (e) => {
    const rect = game.canvas.getBoundingClientRect();
    handleClick(e.clientX - rect.left, e.clientY - rect.top, game);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      endPlayerTurn(game);
      return;
    }
    if (phase === 'player' && selectedPort && selectedPort.owner === 'player') {
      if (e.key === '1') { buildShip(selectedPort, 'frigate');    updateHUD(); }
      if (e.key === '2') { buildShip(selectedPort, 'destroyer');  updateHUD(); }
      if (e.key === '3') { buildShip(selectedPort, 'battleship'); updateHUD(); }
    }
  });

  // Start button (overlay)
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      initGame();
      combatLog = [];
      game.setState('playing');
      updateHUD();
    });
  }

  game.onUpdate = () => {
    waveTime += 0.016; // ~60Hz, advance wave animation
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      renderer.fillRect(0, 0, W, H, '#0a1628');
      return;
    }

    drawWater(renderer);
    drawIslands(renderer);
    drawSeaLanes(renderer);
    drawPorts(renderer, text);
    drawFleets(renderer, text);
    if (game.state === 'playing') drawUI(renderer, text, game);
  };

  game.start();
  return game;
}
