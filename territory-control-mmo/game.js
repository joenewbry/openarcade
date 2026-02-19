// territory-control-mmo/game.js — Territory Control MMO for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 500;

// --- Hex geometry ---
const COLS = 20, ROWS = 15;
const HEX_R = 16;
const HEX_W = HEX_R * Math.sqrt(3);
const HEX_H = HEX_R * 2;
const MAP_OX = 18, MAP_OY = 50;

// --- Factions ---
const FACTIONS = [
  { id: 0, name: 'Empire',  color: '#cc6644', light: '#ee9977', dark: '#884433', ai: false },
  { id: 1, name: 'Dominion', color: '#4488cc', light: '#66aaee', dark: '#224477', ai: true },
  { id: 2, name: 'Horde',   color: '#44aa44', light: '#66dd66', dark: '#227722', ai: true }
];

// --- Territory types ---
const TERRAIN_TYPES = ['plains', 'farm', 'mine', 'forest'];
const TERRAIN_COLORS = { plains: '#88aa77', farm: '#bbdd66', mine: '#999988', forest: '#556699' };
const TERRAIN_PROD = {
  plains: { food: 0, ore: 0, wood: 0, gold: 2 },
  farm:   { food: 3, ore: 0, wood: 0, gold: 0 },
  mine:   { food: 0, ore: 3, wood: 0, gold: 0 },
  forest: { food: 0, ore: 0, wood: 3, gold: 0 }
};

// --- Building defs ---
const BUILDINGS = {
  outpost:  { label: 'Outpost',  cost: { food: 2, ore: 1, wood: 2, gold: 0 }, desc: 'Claim neutral territory', icon: 'O' },
  fort:     { label: 'Fort',     cost: { food: 0, ore: 3, wood: 3, gold: 1 }, desc: 'Defense +5', icon: 'F' },
  barracks: { label: 'Barracks', cost: { food: 1, ore: 2, wood: 2, gold: 1 }, desc: 'Train troops here', icon: 'B' },
  market:   { label: 'Market',   cost: { food: 0, ore: 1, wood: 2, gold: 2 }, desc: '+2 gold/turn', icon: 'M' }
};

// --- Troop defs ---
const TROOPS = {
  infantry: { label: 'Infantry', cost: { food: 2, ore: 1, wood: 0, gold: 1 }, atk: 3, def: 3, icon: 'I' },
  cavalry:  { label: 'Cavalry',  cost: { food: 3, ore: 0, wood: 0, gold: 2 }, atk: 5, def: 2, icon: 'C' },
  siege:    { label: 'Siege',    cost: { food: 1, ore: 3, wood: 2, gold: 2 }, atk: 7, def: 1, icon: 'S' }
};

// --- Game state ---
let hexes = [];
let resources = [{}, {}, {}];
let turn = 0;
const MAX_TURNS = 30;
let selectedHex = null;
let actionMode = null;
let hoverHex = null;
let logs = [];
let score = 0;
let mapViewOffX = 0, mapViewOffY = 0;

// --- Hex helpers ---
function makeHex(col, row) {
  const odd = col & 1;
  const x = MAP_OX + col * HEX_W * 0.75;
  const y = MAP_OY + row * (HEX_H * 0.75) + (odd ? HEX_H * 0.375 : 0);
  const tt = TERRAIN_TYPES[Math.floor(Math.random() * 4)];
  return {
    col, row, x, y, terrain: tt,
    owner: -1,
    building: null,
    troops: { infantry: 0, cavalry: 0, siege: 0 },
    isCapital: false,
    defense: 0
  };
}

function hexDist(a, b) {
  function toCube(c, r) {
    const x = c;
    const z = r - (c - (c & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
  }
  const ca = toCube(a.col, a.row);
  const cb = toCube(b.col, b.row);
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
}

function getNeighbors(hex) {
  const c = hex.col, r = hex.row;
  const odd = c & 1;
  const dirs = odd
    ? [[1, 0], [1, 1], [-1, 0], [-1, 1], [0, -1], [0, 1]]
    : [[1, -1], [1, 0], [-1, -1], [-1, 0], [0, -1], [0, 1]];
  const res = [];
  for (const [dc, dr] of dirs) {
    const nc = c + dc, nr = r + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
      res.push(hexes[nr * COLS + nc]);
    }
  }
  return res;
}

function getTotalTroops(hex) {
  return hex.troops.infantry + hex.troops.cavalry + hex.troops.siege;
}

function getAttackPower(hex) {
  return hex.troops.infantry * 3 + hex.troops.cavalry * 5 + hex.troops.siege * 7;
}

function getDefensePower(hex) {
  let d = hex.troops.infantry * 3 + hex.troops.cavalry * 2 + hex.troops.siege * 1;
  d += hex.defense;
  if (hex.isCapital) d += 5;
  return d;
}

// --- Resources ---
function collectResources(factionId) {
  const r = resources[factionId];
  for (const h of hexes) {
    if (h.owner !== factionId) continue;
    const prod = TERRAIN_PROD[h.terrain];
    r.food += prod.food;
    r.ore += prod.ore;
    r.wood += prod.wood;
    r.gold += prod.gold;
    if (h.building === 'market') r.gold += 2;
  }
}

function canAfford(factionId, cost) {
  const r = resources[factionId];
  return r.food >= cost.food && r.ore >= cost.ore && r.wood >= cost.wood && r.gold >= cost.gold;
}

function spendResources(factionId, cost) {
  const r = resources[factionId];
  r.food -= cost.food;
  r.ore -= cost.ore;
  r.wood -= cost.wood;
  r.gold -= cost.gold;
}

// --- Build ---
function buildOnHex(hex, buildingKey) {
  if (hex.owner < 0) return false;
  const b = BUILDINGS[buildingKey];
  if (!canAfford(hex.owner, b.cost)) return false;
  if (hex.building && buildingKey !== 'outpost') return false;
  spendResources(hex.owner, b.cost);
  if (buildingKey === 'fort') {
    hex.defense += 5;
    hex.building = 'fort';
  } else {
    hex.building = buildingKey;
  }
  return true;
}

function claimWithOutpost(hex, factionId) {
  if (hex.owner !== -1) return false;
  const nbrs = getNeighbors(hex);
  const adj = nbrs.some(n => n.owner === factionId);
  if (!adj) return false;
  const cost = BUILDINGS.outpost.cost;
  if (!canAfford(factionId, cost)) return false;
  spendResources(factionId, cost);
  hex.owner = factionId;
  hex.building = 'outpost';
  return true;
}

// --- Train ---
function trainTroop(hex, troopKey) {
  if (hex.owner < 0) return false;
  if (hex.building !== 'barracks' && !hex.isCapital) return false;
  const t = TROOPS[troopKey];
  if (!canAfford(hex.owner, t.cost)) return false;
  spendResources(hex.owner, t.cost);
  hex.troops[troopKey]++;
  return true;
}

// --- Attack ---
function attackHex(attackerHex, defenderHex) {
  if (attackerHex.owner < 0) return null;
  if (defenderHex.owner === attackerHex.owner) return null;
  if (getTotalTroops(attackerHex) === 0) return null;
  const nbrs = getNeighbors(attackerHex);
  if (!nbrs.includes(defenderHex)) return null;

  const atkPow = getAttackPower(attackerHex);
  const defPow = getDefensePower(defenderHex);
  const atkRoll = atkPow * (0.7 + Math.random() * 0.6);
  const defRoll = defPow * (0.7 + Math.random() * 0.6);

  let result;
  if (atkRoll > defRoll) {
    const lossRatio = Math.min(0.8, defPow / (atkPow + 1) * 0.6);
    const surviving = {};
    for (const k in attackerHex.troops) {
      const lost = Math.ceil(attackerHex.troops[k] * lossRatio);
      surviving[k] = Math.max(0, attackerHex.troops[k] - lost);
    }
    const oldOwner = defenderHex.owner;
    defenderHex.owner = attackerHex.owner;
    defenderHex.troops = { ...surviving };
    defenderHex.defense = 0;
    defenderHex.building = null;
    defenderHex.isCapital = false;
    attackerHex.troops = { infantry: 0, cavalry: 0, siege: 0 };
    result = { win: true, attacker: attackerHex.owner, defender: oldOwner };
  } else {
    const lossRatio = Math.min(0.9, atkPow / (defPow + 1) * 0.7);
    for (const k in defenderHex.troops) {
      const lost = Math.ceil(defenderHex.troops[k] * lossRatio);
      defenderHex.troops[k] = Math.max(0, defenderHex.troops[k] - lost);
    }
    attackerHex.troops = { infantry: 0, cavalry: 0, siege: 0 };
    result = { win: false, attacker: attackerHex.owner, defender: defenderHex.owner };
  }
  return result;
}

// --- AI ---
function aiFactionTurn(fid) {
  collectResources(fid);
  const owned = hexes.filter(h => h.owner === fid);
  if (owned.length === 0) return;

  // 1. Build barracks if none
  const hasBarracks = owned.some(h => h.building === 'barracks' || h.isCapital);
  if (!hasBarracks) {
    const candidate = owned.find(h => !h.building && !h.isCapital);
    if (candidate && canAfford(fid, BUILDINGS.barracks.cost)) {
      buildOnHex(candidate, 'barracks');
      addLog(FACTIONS[fid].name + ' built Barracks.');
    }
  }

  // 2. Train troops
  const trainSites = owned.filter(h => h.building === 'barracks' || h.isCapital);
  for (const site of trainSites) {
    let trained = 0;
    while (trained < 2 && canAfford(fid, TROOPS.infantry.cost)) {
      trainTroop(site, 'infantry');
      trained++;
    }
    if (canAfford(fid, TROOPS.cavalry.cost) && Math.random() > 0.4) {
      trainTroop(site, 'cavalry');
    }
    if (canAfford(fid, TROOPS.siege.cost) && Math.random() > 0.6) {
      trainTroop(site, 'siege');
    }
  }

  // 3. Expand into neutral
  for (const h of owned) {
    const nbrs = getNeighbors(h);
    for (const n of nbrs) {
      if (n.owner === -1 && canAfford(fid, BUILDINGS.outpost.cost)) {
        claimWithOutpost(n, fid);
        addLog(FACTIONS[fid].name + ' claims territory.');
        break;
      }
    }
  }

  // 4. Build forts on borders
  const borderHexes = owned.filter(h => {
    const nbrs = getNeighbors(h);
    return nbrs.some(n => n.owner !== -1 && n.owner !== fid);
  });
  for (const bh of borderHexes) {
    if (!bh.building && canAfford(fid, BUILDINGS.fort.cost) && Math.random() > 0.5) {
      buildOnHex(bh, 'fort');
      addLog(FACTIONS[fid].name + ' built Fort.');
      break;
    }
  }

  // 5. Build markets
  if (Math.random() > 0.6) {
    const mc = owned.find(h => !h.building && !h.isCapital && h.terrain === 'plains');
    if (mc && canAfford(fid, BUILDINGS.market.cost)) {
      buildOnHex(mc, 'market');
    }
  }

  // 6. Coordinated attacks
  const attackCandidates = [];
  for (const h of owned) {
    if (getTotalTroops(h) < 2) continue;
    const nbrs = getNeighbors(h);
    for (const n of nbrs) {
      if (n.owner !== -1 && n.owner !== fid) {
        attackCandidates.push({ from: h, to: n, atkPow: getAttackPower(h), defPow: getDefensePower(n) });
      }
    }
  }
  attackCandidates.sort((a, b) => (b.atkPow / Math.max(1, b.defPow)) - (a.atkPow / Math.max(1, a.defPow)));

  let attacks = 0;
  const attacked = new Set();
  for (const ac of attackCandidates) {
    if (attacks >= 2) break;
    if (attacked.has(ac.to)) continue;
    if (ac.atkPow < ac.defPow * 0.6) continue;
    const result = attackHex(ac.from, ac.to);
    if (result) {
      attacked.add(ac.to);
      attacks++;
      if (result.win) {
        addLog(FACTIONS[fid].name + ' conquered territory!');
      } else {
        addLog(FACTIONS[fid].name + ' attack repelled.');
      }
    }
  }

  // 7. Move troops toward front lines
  for (const h of owned) {
    if (getTotalTroops(h) === 0) continue;
    const nbrs = getNeighbors(h);
    const isBorder = nbrs.some(n => n.owner !== -1 && n.owner !== fid);
    if (isBorder) continue;
    const friendlyNbrs = nbrs.filter(n => n.owner === fid);
    const borderNbr = friendlyNbrs.find(fn => {
      const fnn = getNeighbors(fn);
      return fnn.some(n2 => n2.owner !== -1 && n2.owner !== fid);
    });
    if (borderNbr) {
      for (const k in h.troops) {
        borderNbr.troops[k] += h.troops[k];
        h.troops[k] = 0;
      }
    }
  }
}

// --- Score/logging ---
function updateScore() {
  const counts = [0, 0, 0];
  for (const h of hexes) {
    if (h.owner >= 0) counts[h.owner]++;
  }
  score = counts[0];
  const sbTerr = document.getElementById('sb-terr');
  const sbTurn = document.getElementById('sb-turn');
  const sbScore = document.getElementById('sb-score');
  if (sbTerr) sbTerr.textContent = counts[0];
  if (sbTurn) sbTurn.textContent = Math.min(turn, MAX_TURNS) + '/' + MAX_TURNS;
  if (sbScore) sbScore.textContent = score;
  updateTurnInfo(counts);
}

function updateTurnInfo(counts) {
  const ti = document.getElementById('turn-info');
  if (!ti) return;
  const parts = FACTIONS.map(f => `<span style="color:${f.color}">${f.name}:${counts[f.id]}</span>`);
  ti.innerHTML = parts.join(' | ');
}

function addLog(msg) {
  logs.unshift(msg);
  if (logs.length > 6) logs.pop();
  const el = document.getElementById('action-log');
  if (el) el.innerHTML = logs.map(l => '<div>' + l + '</div>').join('');
}

// --- DOM panels ---
function updatePanels() {
  const ip = document.getElementById('info-panel');
  const bp = document.getElementById('build-panel');
  if (!ip || !bp) return;
  bp.innerHTML = '';

  if (!selectedHex) {
    ip.innerHTML = '<div class="info-title">Select a territory</div><div class="info-text">Click a hex on the map.</div>';
    return;
  }

  const h = selectedHex;
  const ownerName = h.owner >= 0 ? FACTIONS[h.owner].name : 'Neutral';
  const ownerColor = h.owner >= 0 ? FACTIONS[h.owner].color : '#888';
  const prod = TERRAIN_PROD[h.terrain];
  const prodStr = Object.entries(prod).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ');

  let info = `<div class="info-title" style="color:${ownerColor}">${ownerName} Territory (${h.col},${h.row})</div>`;
  info += `<div class="info-text">`;
  info += `Terrain: ${h.terrain} | Produces: ${prodStr || 'none'}<br>`;
  if (h.building) info += `Building: ${BUILDINGS[h.building]?.label || h.building}<br>`;
  if (h.isCapital) info += `CAPITAL | `;
  info += `Defense: ${getDefensePower(h)} | Troops: Inf:${h.troops.infantry} Cav:${h.troops.cavalry} Sge:${h.troops.siege}`;
  info += `</div>`;
  ip.innerHTML = info;

  if (h.owner === 0) {
    // Buildings
    if (!h.building && !h.isCapital) {
      for (const [key, b] of Object.entries(BUILDINGS)) {
        if (key === 'outpost') continue;
        const ok = canAfford(0, b.cost);
        const costStr = Object.entries(b.cost).filter(([, v]) => v > 0).map(([k, v]) => `${k[0].toUpperCase()}${v}`).join(' ');
        const btn = document.createElement('button');
        btn.textContent = `${b.label} (${costStr})`;
        btn.disabled = !ok;
        btn.title = b.desc;
        btn.onclick = () => {
          if (buildOnHex(h, key)) {
            addLog('Built ' + b.label + '.');
            updatePanels();
          }
        };
        bp.appendChild(btn);
      }
    }

    // Train troops
    if (h.building === 'barracks' || h.isCapital) {
      for (const [key, t] of Object.entries(TROOPS)) {
        const ok = canAfford(0, t.cost);
        const costStr = Object.entries(t.cost).filter(([, v]) => v > 0).map(([k, v]) => `${k[0].toUpperCase()}${v}`).join(' ');
        const btn = document.createElement('button');
        btn.textContent = `Train ${t.label} (${costStr})`;
        btn.disabled = !ok;
        btn.onclick = () => {
          if (trainTroop(h, key)) {
            addLog('Trained ' + t.label + '.');
            updatePanels();
          }
        };
        bp.appendChild(btn);
      }
    }

    // Attack button
    if (getTotalTroops(h) > 0) {
      const atkBtn = document.createElement('button');
      atkBtn.textContent = actionMode === 'attack' ? '[ ATTACKING ]' : 'ATTACK';
      atkBtn.style.background = actionMode === 'attack' ? '#cc4444' : '#663333';
      atkBtn.style.color = '#fff';
      atkBtn.onclick = () => {
        actionMode = actionMode === 'attack' ? null : 'attack';
        updatePanels();
      };
      bp.appendChild(atkBtn);
    }
  }

  // Claim neutral
  if (h.owner === -1) {
    const nbrs = getNeighbors(h);
    const adj = nbrs.some(n => n.owner === 0);
    if (adj) {
      const ok = canAfford(0, BUILDINGS.outpost.cost);
      const costStr = Object.entries(BUILDINGS.outpost.cost).filter(([, v]) => v > 0).map(([k, v]) => `${k[0].toUpperCase()}${v}`).join(' ');
      const btn = document.createElement('button');
      btn.textContent = `Claim (Outpost: ${costStr})`;
      btn.disabled = !ok;
      btn.onclick = () => {
        if (claimWithOutpost(h, 0)) {
          addLog('Claimed territory!');
          updateScore();
          updatePanels();
        }
      };
      bp.appendChild(btn);
    }
  }
}

function updateResourcePanel() {
  const rp = document.getElementById('res-panel');
  if (!rp) return;
  const r = resources[0];
  rp.innerHTML = `
    <div style="color:#cc6644;font-weight:bold;margin-bottom:4px;">RESOURCES</div>
    <div><span class="rlbl">Food: </span><span class="rval">${r.food}</span></div>
    <div><span class="rlbl">Ore:  </span><span class="rval">${r.ore}</span></div>
    <div><span class="rlbl">Wood: </span><span class="rval">${r.wood}</span></div>
    <div><span class="rlbl">Gold: </span><span class="rval">${r.gold}</span></div>
    <div style="margin-top:6px;"><button id="end-turn-btn" style="padding:4px 10px;background:#cc6644;color:#fff;border:none;font-family:Courier New;cursor:pointer;font-size:11px;">END TURN</button></div>
  `;
  const etb = document.getElementById('end-turn-btn');
  if (etb) etb.onclick = endPlayerTurn;
}

// --- Turn management ---
function endPlayerTurn() {
  collectResources(0);
  addLog('--- Turn ' + turn + ' ---');
  aiFactionTurn(1);
  aiFactionTurn(2);
  turn++;
  selectedHex = null;
  actionMode = null;
  updateScore();
  updateResourcePanel();
  updatePanels();
}

// --- Hex hit test ---
function hexAt(mx, my) {
  let closest = null, minD = Infinity;
  for (const h of hexes) {
    const dx = mx - (h.x + mapViewOffX);
    const dy = my - (h.y + mapViewOffY);
    const d = dx * dx + dy * dy;
    if (d < HEX_R * HEX_R && d < minD) {
      minD = d;
      closest = h;
    }
  }
  return closest;
}

// --- Hex polygon points ---
function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + i * Math.PI / 3;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

// Parse #rrggbb hex color to [r,g,b,a] 0-255 for tint mixing
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

// Blend two hex colors 50/50, return #rrggbb string
function blendColors(c1, c2, t = 0.5) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(a[0] * (1 - t) + b[0] * t);
  const g = Math.round(a[1] * (1 - t) + b[1] * t);
  const bl = Math.round(a[2] * (1 - t) + b[2] * t);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + bl.toString(16).padStart(2, '0');
}

// Convert color string to #rrggbbaa with given alpha (0-1)
function withAlpha(color, alpha) {
  const rgb = hexToRgb(color.length === 7 ? color : '#cccccc');
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return '#' + rgb[0].toString(16).padStart(2, '0') +
    rgb[1].toString(16).padStart(2, '0') +
    rgb[2].toString(16).padStart(2, '0') + a;
}

export function createGame() {
  const game = new Game('game');

  // Setup canvas mouse events directly (mouse not handled by engine for clicks)
  const canvas = game.canvas;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    hoverHex = hexAt(mx, my);
  });

  canvas.addEventListener('click', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const clicked = hexAt(mx, my);
    if (!clicked) return;

    // Attack mode
    if (actionMode === 'attack' && selectedHex && selectedHex.owner === 0) {
      if (clicked.owner !== -1 && clicked.owner !== 0) {
        const nbrs = getNeighbors(selectedHex);
        if (nbrs.includes(clicked)) {
          const result = attackHex(selectedHex, clicked);
          if (result) {
            if (result.win) {
              addLog('Victory! Territory conquered!');
            } else {
              addLog('Attack failed! Troops lost.');
            }
            actionMode = null;
            updateScore();
            selectedHex = clicked;
            updatePanels();
            updateResourcePanel();
            return;
          }
        }
      }
      actionMode = null;
    }

    selectedHex = clicked;
    actionMode = null;
    updatePanels();
  });

  game.onInit = () => {
    // Init game data
    hexes = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        hexes.push(makeHex(c, r));
      }
    }
    const starts = [
      [{ col: 2, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 3 }],
      [{ col: 17, row: 2 }, { col: 16, row: 2 }, { col: 17, row: 3 }],
      [{ col: 9, row: 12 }, { col: 10, row: 12 }, { col: 9, row: 11 }]
    ];
    for (let f = 0; f < 3; f++) {
      resources[f] = { food: 10, ore: 8, wood: 8, gold: 6 };
      for (let i = 0; i < starts[f].length; i++) {
        const s = starts[f][i];
        const h = hexes[s.row * COLS + s.col];
        h.owner = f;
        if (i === 0) {
          h.isCapital = true;
          h.building = 'barracks';
          h.defense = 5;
          h.troops.infantry = 3;
        } else {
          h.troops.infantry = 1;
        }
      }
    }
    turn = 1;
    score = 0;
    selectedHex = null;
    actionMode = null;
    logs = [];
    hoverHex = null;

    // Show start overlay via game engine
    game.showOverlay('TERRITORY CONTROL', 'Click START GAME to begin');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state === 'waiting') return;

    if (game.state === 'playing' && turn > MAX_TURNS) {
      // Compute final counts
      const counts = [0, 0, 0];
      for (const h of hexes) {
        if (h.owner >= 0) counts[h.owner]++;
      }
      let winner = 0;
      if (counts[1] > counts[winner]) winner = 1;
      if (counts[2] > counts[winner]) winner = 2;
      const winMsg = winner === 0 ? 'YOU WIN!' : FACTIONS[winner].name + ' wins.';
      game.showOverlay(
        'GAME OVER',
        `${winMsg} | Empire:${counts[0]} Dominion:${counts[1]} Horde:${counts[2]}`
      );
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    const PANEL_H = 110;
    const SCORE_H = 32;
    const mapBottom = H - PANEL_H;

    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');
    // Map area background
    renderer.fillRect(0, SCORE_H, W, mapBottom - SCORE_H, '#12122a');

    if (game.state === 'waiting') {
      // Draw a subtle hex grid preview in background
      for (const h of hexes) {
        const hx = h.x + mapViewOffX;
        const hy = h.y + mapViewOffY;
        if (hx < -20 || hx > W + 20 || hy < SCORE_H - 4 || hy > mapBottom + 10) continue;
        const fill = TERRAIN_COLORS[h.terrain];
        const pts = hexPoints(hx, hy, HEX_R - 1);
        renderer.fillPoly(pts, withAlpha(fill, 0.4));
      }
      return;
    }

    // Draw hex map
    for (const h of hexes) {
      const hx = h.x + mapViewOffX;
      const hy = h.y + mapViewOffY;
      if (hx < -20 || hx > W + 20 || hy < SCORE_H - 4 || hy > mapBottom + 10) continue;

      let fillColor;
      let strokeColor;
      let strokeW;

      if (h.owner >= 0) {
        fillColor = FACTIONS[h.owner].dark;
        strokeColor = FACTIONS[h.owner].color;
        strokeW = 1.2;
      } else {
        fillColor = TERRAIN_COLORS[h.terrain];
        strokeColor = '#2a2a4a';
        strokeW = 0.8;
      }

      // Hover highlight
      if (h === hoverHex && h !== selectedHex) {
        strokeColor = '#ffffff';
        strokeW = 1.5;
      }

      // Selected
      if (h === selectedHex) {
        strokeColor = '#ffffff';
        strokeW = 2.5;
      }

      // Attack target highlight
      if (actionMode === 'attack' && selectedHex && h.owner !== -1 && h.owner !== 0) {
        const nbrs = getNeighbors(selectedHex);
        if (nbrs.includes(h)) {
          strokeColor = '#ff4444';
          strokeW = 2;
        }
      }

      const pts = hexPoints(hx, hy, HEX_R - 1);
      renderer.fillPoly(pts, fillColor);
      renderer.strokePoly(pts, strokeColor, strokeW, true);

      // Capital marker
      if (h.isCapital) {
        text.drawText('*', hx - 3, hy - 10, 12, '#ffffff', 'left');
      }

      // Building icon
      if (h.building && BUILDINGS[h.building]) {
        const icon = BUILDINGS[h.building].icon;
        const iconY = h.isCapital ? hy - 3 : hy - 5;
        text.drawText(icon, hx, iconY, 10, '#dddddd', 'center');
      }

      // Troop count
      const tc = getTotalTroops(h);
      if (tc > 0) {
        const troopColor = h.owner >= 0 ? FACTIONS[h.owner].light : '#ffffff';
        const troopY = (h.building || h.isCapital) ? hy + 4 : hy - 2;
        text.drawText(String(tc), hx, troopY, 9, troopColor, 'center');
      }

      // Terrain letter for neutral
      if (h.owner === -1) {
        text.drawText(h.terrain[0].toUpperCase(), hx, hy - 4, 8, '#ffffff55', 'center');
      }
    }

    // Score bar background
    renderer.fillRect(0, 0, W, SCORE_H, '#1a1a2eff');
    renderer.fillRect(0, SCORE_H - 2, W, 2, '#cc6644');

    // Score bar text
    const counts = [0, 0, 0];
    for (const h of hexes) {
      if (h.owner >= 0) counts[h.owner]++;
    }
    text.drawText('TERRITORIES: ' + counts[0], 12, 8, 12, '#cc6644', 'left');
    text.drawText('TURN: ' + Math.min(turn, MAX_TURNS) + '/' + MAX_TURNS, W / 2, 8, 12, '#cc6644', 'center');
    text.drawText('SCORE: ' + score, W - 12, 8, 12, '#cc6644', 'right');

    // Turn info line (faction counts)
    const infoY = SCORE_H + 4;
    const factionStr = FACTIONS.map(f => f.name + ':' + counts[f.id]).join('  ');
    text.drawText(factionStr, W - 8, infoY, 10, '#aaaaaa', 'right');

    // Action log (top-left below score bar)
    let logY = SCORE_H + 4;
    for (let i = 0; i < Math.min(logs.length, 4); i++) {
      text.drawText(logs[i], 8, logY + i * 12, 9, '#aaaaaa88', 'left');
    }

    // UI Panel background
    renderer.fillRect(0, mapBottom, W, PANEL_H, '#1a1a2eff');
    renderer.fillRect(0, mapBottom, W, 2, '#cc6644');

    // Resource panel (drawn in DOM, but render a subtle divider)
    renderer.fillRect(140, mapBottom, 1, PANEL_H, '#444444');
    renderer.fillRect(W - 242, mapBottom, 1, PANEL_H, '#444444');

    // Update DOM panels each frame (cheap, state rarely changes)
    updateResourcePanel();
    updateScore();
  };

  // Start button from overlay
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      const uiPanel = document.getElementById('ui-panel');
      if (uiPanel) uiPanel.classList.remove('hidden');
      addLog('Game started! You are the Empire.');
      updateScore();
      updatePanels();
      game.setState('playing');
    };
  }

  // Play again button (injected into overlay on game over)
  // We watch for state changes to handle restart
  game.onStateChange = (newState) => {
    if (newState === 'over') {
      // Inject restart button into overlay
      const overlayText = document.getElementById('overlayText');
      if (overlayText) {
        const btn = document.createElement('button');
        btn.id = 'restart-btn';
        btn.textContent = 'PLAY AGAIN';
        btn.style.cssText = 'margin-top:16px;padding:10px 32px;background:#cc6644;color:#fff;border:none;font-family:Courier New,monospace;font-size:16px;cursor:pointer;';
        // Remove old restart btn if present
        const old = document.getElementById('restart-btn');
        if (old) old.remove();
        overlayText.insertAdjacentElement('afterend', btn);
        btn.onclick = () => {
          game.onInit();
        };
      }
    }
  };

  game.start();
  return game;
}
