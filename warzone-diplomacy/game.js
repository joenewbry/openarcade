// warzone-diplomacy/game.js — Warzone Diplomacy as ES module for WebGL engine

import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 500;

  /* ==================== DOM ELEMENTS ==================== */
  const scoreEl = document.getElementById('score');
  const turnNumEl = document.getElementById('turnNum');
  const reinforcementsEl = document.getElementById('reinforcements');
  const phaseInfoEl = document.getElementById('phaseInfo');
  const allianceInfoEl = document.getElementById('allianceInfo');
  const logEl = document.getElementById('log');
  const modeLabelEl = document.getElementById('modeLabel');

  /* ==================== CONSTANTS ==================== */
  const PLAYER_COLORS = ['#4488ff', '#ee5555', '#33bb33', '#dd44dd', '#ffaa00'];
  const PLAYER_NAMES = ['You', 'General Krov', 'Marshal Vex', 'Duchess Nara', 'Warlord Zhin'];
  const AI_PERSONALITIES = [null, 'aggressive', 'defensive', 'diplomatic', 'opportunist'];
  const CONTINENT_COLORS = ['#443322', '#223344', '#224422', '#442244', '#444422'];
  const CONTINENT_NAMES = ['Nordheim', 'Oceania', 'Verdania', 'Shadowlands', 'Aurelia'];
  const CONTINENT_BONUSES = [3, 2, 3, 2, 4];
  const WIN_THRESHOLD = 0.75;

  /* ==================== GAME STATE ==================== */
  let score = 0;
  let territories = [];
  let adjacency = {};
  let players = [];
  let turnNumber = 0;
  let currentOrders = [];
  let orderMode = null;
  let selectedTerritory = null;
  let hoveredTerritory = null;
  let alliances = {};
  let betrayals = {};
  let animQueue = [];
  let animating = false;

  /* ==================== MAP GENERATION ==================== */
  function buildMap() {
    const tdata = [
      // Continent 0: Nordheim (top-left) - 5 territories
      { id: 0,  name: 'Frostpeak',    cx: 75,  cy: 60,  cont: 0 },
      { id: 1,  name: 'Icehold',      cx: 150, cy: 45,  cont: 0 },
      { id: 2,  name: 'Snowgate',     cx: 115, cy: 120, cont: 0 },
      { id: 3,  name: 'Rimwall',      cx: 55,  cy: 145, cont: 0 },
      { id: 4,  name: 'Glacius',      cx: 185, cy: 110, cont: 0 },
      // Continent 1: Oceania (top-right) - 4 territories
      { id: 5,  name: 'Tidecrest',    cx: 420, cy: 50,  cont: 1 },
      { id: 6,  name: 'Seaholm',      cx: 500, cy: 70,  cont: 1 },
      { id: 7,  name: 'Coralport',    cx: 470, cy: 140, cont: 1 },
      { id: 8,  name: 'Stormisle',    cx: 545, cy: 130, cont: 1 },
      // Continent 2: Verdania (center) - 6 territories
      { id: 9,  name: 'Greenhollow',  cx: 250, cy: 180, cont: 2 },
      { id: 10, name: 'Mossbridge',   cx: 320, cy: 160, cont: 2 },
      { id: 11, name: 'Thornfield',   cx: 280, cy: 245, cont: 2 },
      { id: 12, name: 'Rootheim',     cx: 355, cy: 230, cont: 2 },
      { id: 13, name: 'Leafward',     cx: 240, cy: 310, cont: 2 },
      { id: 14, name: 'Ivyspire',     cx: 390, cy: 300, cont: 2 },
      // Continent 3: Shadowlands (bottom-left) - 4 territories
      { id: 15, name: 'Duskreach',    cx: 70,  cy: 310, cont: 3 },
      { id: 16, name: 'Voidfen',      cx: 140, cy: 360, cont: 3 },
      { id: 17, name: 'Ashdale',      cx: 65,  cy: 420, cont: 3 },
      { id: 18, name: 'Grimhollow',   cx: 155, cy: 440, cont: 3 },
      // Continent 4: Aurelia (bottom-right) - 5 territories
      { id: 19, name: 'Goldcrest',    cx: 430, cy: 360, cont: 4 },
      { id: 20, name: 'Sunspire',     cx: 510, cy: 340, cont: 4 },
      { id: 21, name: 'Dawnkeep',     cx: 460, cy: 430, cont: 4 },
      { id: 22, name: 'Radiantfort',  cx: 540, cy: 420, cont: 4 },
      { id: 23, name: 'Heliogarde',   cx: 490, cy: 470, cont: 4 },
    ];

    const adj = {
      0:  [1, 2, 3],          1:  [0, 2, 4, 5],       2:  [0, 1, 3, 4],
      3:  [0, 2, 15],         4:  [1, 2, 9, 10],
      5:  [1, 6, 7, 10],      6:  [5, 7, 8],           7:  [5, 6, 8, 12],
      8:  [6, 7, 20],
      9:  [4, 10, 11, 13],    10: [4, 5, 9, 12],       11: [9, 12, 13, 14],
      12: [7, 10, 11, 14],    13: [9, 11, 15, 16],     14: [11, 12, 19],
      15: [3, 13, 16, 17],    16: [13, 15, 17, 18],    17: [15, 16, 18],
      18: [16, 17, 21],
      19: [14, 20, 21],       20: [8, 19, 22],         21: [18, 19, 22, 23],
      22: [20, 21, 23],       23: [21, 22],
    };

    // Use a seeded-ish random per territory for stable polys each call
    const savedRandom = Math.random;
    let seed = 42;
    const seededRng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };
    Math.random = seededRng;

    territories = tdata.map(t => ({
      ...t, owner: -1, armies: 0,
      polyPoints: generateTerritoryPoly(t.cx, t.cy),
    }));
    adjacency = adj;

    Math.random = savedRandom;
  }

  function generateTerritoryPoly(cx, cy) {
    const pts = [];
    const n = 6 + Math.floor(Math.random() * 3);
    const baseR = 32 + Math.random() * 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
      const r = baseR + (Math.random() - 0.5) * 12;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  /* ==================== INITIALIZATION ==================== */
  function initGame() {
    buildMap();
    turnNumber = 1;
    currentOrders = [];
    orderMode = null;
    selectedTerritory = null;
    alliances = {};
    betrayals = {};
    animQueue = [];
    animating = false;
    if (logEl) logEl.innerHTML = '';

    players = PLAYER_NAMES.map((name, i) => ({
      id: i, name, alive: true,
      personality: AI_PERSONALITIES[i],
      territories: [],
      reinforcements: 0,
      pendingOrders: [],
      trustScores: [50, 50, 50, 50, 50],
      aggressionMemory: [0, 0, 0, 0, 0],
    }));

    // Distribute territories
    const shuffled = [...Array(24).keys()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < 5; i++) {
      const startTerrs = shuffled.slice(i * 4, i * 4 + 4);
      startTerrs.forEach(tid => {
        territories[tid].owner = i;
        territories[tid].armies = 2 + Math.floor(Math.random() * 2);
      });
    }
    for (let i = 20; i < 24; i++) {
      const p = Math.floor(Math.random() * 5);
      territories[shuffled[i]].owner = p;
      territories[shuffled[i]].armies = 1;
    }

    updatePlayerTerritories();
    calculateReinforcements(0);
    updateUI();
    game.setState('playing');
    logMsg('The war begins. Assign your orders and submit.', 'diplomacy');
  }

  function updatePlayerTerritories() {
    players.forEach(p => {
      p.territories = territories.filter(t => t.owner === p.id).map(t => t.id);
      p.alive = p.territories.length > 0;
    });
  }

  /* ==================== REINFORCEMENTS ==================== */
  function calculateReinforcements(playerId) {
    const p = players[playerId];
    let r = Math.max(3, Math.floor(p.territories.length / 3));
    for (let c = 0; c < 5; c++) {
      const contTerrs = territories.filter(t => t.cont === c);
      if (contTerrs.every(t => t.owner === playerId)) r += CONTINENT_BONUSES[c];
    }
    p.reinforcements = r;
    return r;
  }

  /* ==================== ORDER SYSTEM ==================== */
  function setMode(mode) {
    if (game.state !== 'playing' || animating) return;
    orderMode = mode;
    selectedTerritory = null;
    document.getElementById('btnAttack').classList.toggle('active', mode === 'attack');
    document.getElementById('btnReinforce').classList.toggle('active', mode === 'reinforce');
    if (modeLabelEl) modeLabelEl.textContent = mode === 'attack'
      ? 'Mode: Attack (click source, then target)'
      : 'Mode: Reinforce (click your territory)';
  }

  function undoOrder() {
    if (currentOrders.length > 0) {
      const removed = currentOrders.pop();
      if (removed.type === 'reinforce') players[0].reinforcements += removed.amount;
      logMsg('Undid: ' + removed.type + ' order', 'reinforce');
      updateUI();
    }
  }

  function handleTerritoryClick(tid) {
    if (game.state !== 'playing' || animating) return;
    const t = territories[tid];

    if (orderMode === 'reinforce') {
      if (t.owner !== 0) return;
      if (players[0].reinforcements <= 0) { logMsg('No reinforcements remaining!', 'attack'); return; }
      currentOrders.push({ type: 'reinforce', target: tid, amount: 1 });
      players[0].reinforcements -= 1;
      logMsg('+1 army to ' + t.name, 'reinforce');
      updateUI();
    } else if (orderMode === 'attack') {
      if (selectedTerritory === null) {
        if (t.owner !== 0) { logMsg('Select your own territory first', 'attack'); return; }
        if (t.armies < 2) { logMsg('Need at least 2 armies to attack', 'attack'); return; }
        selectedTerritory = tid;
        if (modeLabelEl) modeLabelEl.textContent = 'Attack from ' + t.name + ' -> click enemy neighbor';
      } else {
        if (t.owner === 0) { selectedTerritory = null; return; }
        if (!adjacency[selectedTerritory].includes(tid)) {
          logMsg('Target must be adjacent!', 'attack');
          selectedTerritory = null; return;
        }
        const src = territories[selectedTerritory];
        const attackArmies = Math.min(src.armies - 1, 3);
        currentOrders.push({ type: 'attack', from: selectedTerritory, to: tid, armies: attackArmies });
        logMsg('Attack: ' + src.name + ' (' + attackArmies + ') -> ' + t.name, 'attack');
        selectedTerritory = null;
      }
    }
  }

  /* ==================== ORDER RESOLUTION ==================== */
  function submitOrders() {
    if (game.state !== 'playing' || animating) return;

    // Auto-spend remaining reinforcements
    while (players[0].reinforcements > 0) {
      const owned = players[0].territories;
      if (owned.length === 0) break;
      const borders = owned.filter(tid => adjacency[tid].some(nid => territories[nid].owner !== 0));
      const pool = borders.length > 0 ? borders : owned;
      const tid = pool[Math.floor(Math.random() * pool.length)];
      currentOrders.push({ type: 'reinforce', target: tid, amount: 1 });
      players[0].reinforcements--;
    }

    players[0].pendingOrders = [...currentOrders];
    currentOrders = [];

    for (let i = 1; i < 5; i++) {
      if (!players[i].alive) continue;
      calculateReinforcements(i);
      players[i].pendingOrders = generateAIOrders(i);
    }

    processAllianceDiplomacy();
    animating = true;
    if (phaseInfoEl) phaseInfoEl.textContent = 'Phase: Resolving...';
    resolveAllOrders();
  }

  function resolveAllOrders() {
    // Apply reinforcements
    for (let i = 0; i < 5; i++) {
      if (!players[i].alive) continue;
      players[i].pendingOrders.filter(o => o.type === 'reinforce').forEach(o => {
        if (territories[o.target].owner === i) territories[o.target].armies += o.amount;
      });
    }

    // Collect attacks
    const allAttacks = [];
    for (let i = 0; i < 5; i++) {
      if (!players[i].alive) continue;
      players[i].pendingOrders.filter(o => o.type === 'attack').forEach(o => {
        if (territories[o.from].owner === i && territories[o.from].armies >= 2) {
          allAttacks.push({ ...o, player: i });
        }
      });
    }

    // Shuffle for fairness
    for (let i = allAttacks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAttacks[i], allAttacks[j]] = [allAttacks[j], allAttacks[i]];
    }

    animQueue = allAttacks;
    resolveNextAttack();
  }

  function resolveNextAttack() {
    if (animQueue.length === 0) {
      animating = false;
      endTurn();
      return;
    }

    const atk = animQueue.shift();
    const src = territories[atk.from];
    const dst = territories[atk.to];

    if (src.owner !== atk.player || src.armies < 2) {
      resolveNextAttack();
      return;
    }

    const defOwner = dst.owner;
    const allianceKey = [Math.min(atk.player, defOwner), Math.max(atk.player, defOwner)].join('-');
    if (alliances[allianceKey]) {
      delete alliances[allianceKey];
      betrayals[allianceKey] = turnNumber;
      logMsg('BETRAYAL! ' + PLAYER_NAMES[atk.player] + ' broke alliance with ' + PLAYER_NAMES[defOwner] + '!', 'betray');
      players.forEach(p => {
        if (p.id !== atk.player) p.trustScores[atk.player] = Math.max(0, p.trustScores[atk.player] - 30);
      });
    }

    if (defOwner >= 0 && defOwner < 5) players[defOwner].aggressionMemory[atk.player] += 1;

    const attackArmies = Math.min(src.armies - 1, atk.armies);
    const defendArmies = Math.min(dst.armies, 2);

    const atkDice = rollDice(attackArmies).sort((a, b) => b - a);
    const defDice = rollDice(defendArmies).sort((a, b) => b - a);
    let atkLoss = 0, defLoss = 0;
    for (let i = 0; i < Math.min(atkDice.length, defDice.length); i++) {
      if (atkDice[i] > defDice[i]) defLoss++;
      else atkLoss++;
    }

    src.armies -= atkLoss;
    dst.armies -= defLoss;

    const atkName = PLAYER_NAMES[atk.player];
    const defName = defOwner >= 0 ? PLAYER_NAMES[defOwner] : 'Neutral';

    if (dst.armies <= 0) {
      dst.owner = atk.player;
      const moveIn = Math.min(src.armies - 1, attackArmies);
      dst.armies = Math.max(1, moveIn);
      src.armies = Math.max(1, src.armies - moveIn);
      logMsg(atkName + ' captured ' + dst.name + ' from ' + defName + '! [' + atkDice + '] vs [' + defDice + ']', 'attack');
    } else {
      logMsg(atkName + ' attacked ' + dst.name + ' (' + defName + '): lost ' + atkLoss + ', killed ' + defLoss + ' [' + atkDice + '] vs [' + defDice + ']', 'attack');
    }

    updatePlayerTerritories();
    updateUI();
    setTimeout(resolveNextAttack, 350);
  }

  function rollDice(n) {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push(Math.floor(Math.random() * 6) + 1);
    return dice;
  }

  function endTurn() {
    // Decay alliances
    for (const key of Object.keys(alliances)) {
      alliances[key]--;
      if (alliances[key] <= 0) {
        delete alliances[key];
        const [a, b] = key.split('-').map(Number);
        logMsg('Alliance expired: ' + PLAYER_NAMES[a] + ' & ' + PLAYER_NAMES[b], 'diplomacy');
      }
    }

    updatePlayerTerritories();
    const playerTerrs = players[0].territories.length;

    if (!players[0].alive) {
      score = playerTerrs;
      game.setScoreFn(() => score);
      game.showOverlay('DEFEAT', 'Eliminated on turn ' + turnNumber + '. Score: ' + score);
      game.setState('over');
      if (scoreEl) scoreEl.textContent = score;
      return;
    }

    if (playerTerrs >= Math.ceil(24 * WIN_THRESHOLD)) {
      score = playerTerrs + turnNumber * 2;
      game.setScoreFn(() => score);
      game.showOverlay('TOTAL VICTORY!', 'Dominated ' + playerTerrs + '/24 territories in ' + turnNumber + ' turns! Score: ' + score);
      game.setState('over');
      if (scoreEl) scoreEl.textContent = score;
      return;
    }

    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 1 && alivePlayers[0].id === 0) {
      score = playerTerrs + turnNumber * 2;
      game.setScoreFn(() => score);
      game.showOverlay('LAST ONE STANDING!', 'All enemies eliminated in ' + turnNumber + ' turns! Score: ' + score);
      game.setState('over');
      if (scoreEl) scoreEl.textContent = score;
      return;
    }

    turnNumber++;
    calculateReinforcements(0);
    orderMode = null;
    selectedTerritory = null;
    document.getElementById('btnAttack').classList.remove('active');
    document.getElementById('btnReinforce').classList.remove('active');
    if (modeLabelEl) modeLabelEl.textContent = 'Mode: --';
    updateUI();
    logMsg('--- Turn ' + turnNumber + ' --- You have ' + players[0].reinforcements + ' reinforcements.', 'diplomacy');
  }

  /* ==================== AI SYSTEM ==================== */
  function generateAIOrders(pid) {
    const p = players[pid];
    const orders = [];
    let reinforcements = p.reinforcements;
    const personality = p.personality;
    const owned = p.territories;

    const borderTerrs = owned.filter(tid => adjacency[tid].some(nid => territories[nid].owner !== pid));
    const innerTerrs = owned.filter(tid => adjacency[tid].every(nid => territories[nid].owner === pid));

    // Reinforcement strategy
    if (personality === 'aggressive') {
      const targets = borderTerrs.slice().sort((a, b) => {
        const eA = adjacency[a].filter(n => territories[n].owner !== pid);
        const eB = adjacency[b].filter(n => territories[n].owner !== pid);
        const aMin = eA.length > 0 ? Math.min(...eA.map(n => territories[n].armies)) : 99;
        const bMin = eB.length > 0 ? Math.min(...eB.map(n => territories[n].armies)) : 99;
        return aMin - bMin;
      });
      let i = 0;
      while (reinforcements > 0 && targets.length > 0) {
        orders.push({ type: 'reinforce', target: targets[i % targets.length], amount: 1 });
        reinforcements--; i++;
      }
    } else if (personality === 'defensive') {
      const weakBorders = borderTerrs.slice().sort((a, b) => territories[a].armies - territories[b].armies);
      let i = 0;
      while (reinforcements > 0) {
        const target = weakBorders.length > 0 ? weakBorders[i % weakBorders.length] : owned[i % owned.length];
        orders.push({ type: 'reinforce', target, amount: 1 });
        reinforcements--; i++;
      }
    } else if (personality === 'diplomatic') {
      let i = 0;
      while (reinforcements > 0) {
        const target = borderTerrs.length > 0 ? borderTerrs[i % borderTerrs.length] : owned[i % owned.length];
        orders.push({ type: 'reinforce', target, amount: 1 });
        reinforcements--; i++;
      }
    } else {
      const sorted = borderTerrs.slice().sort((a, b) => territories[b].armies - territories[a].armies);
      const best = sorted.length > 0 ? sorted[0] : owned[0];
      if (best !== undefined) {
        while (reinforcements > 0) {
          orders.push({ type: 'reinforce', target: best, amount: 1 });
          reinforcements--;
        }
      }
    }

    // Attack strategy
    const allyIds = getAllies(pid);

    for (const tid of borderTerrs) {
      const src = territories[tid];
      if (src.armies < 2) continue;

      let targets = adjacency[tid]
        .filter(nid => territories[nid].owner !== pid)
        .map(nid => territories[nid]);

      if (personality !== 'opportunist') {
        targets = targets.filter(t => !allyIds.includes(t.owner));
      } else {
        targets = targets.filter(t => {
          if (allyIds.includes(t.owner)) return src.armies > t.armies * 2.5 && Math.random() < 0.2;
          return true;
        });
      }

      if (targets.length === 0) continue;

      let target;
      if (personality === 'aggressive') {
        target = targets.sort((a, b) => a.armies - b.armies)[0];
        if (src.armies > target.armies) orders.push({ type: 'attack', from: tid, to: target.id, armies: Math.min(src.armies - 1, 3) });
      } else if (personality === 'defensive') {
        target = targets.sort((a, b) => a.armies - b.armies)[0];
        if (src.armies >= target.armies * 2) orders.push({ type: 'attack', from: tid, to: target.id, armies: Math.min(src.armies - 1, 3) });
      } else if (personality === 'diplomatic') {
        target = targets.sort((a, b) => p.trustScores[a.owner] - p.trustScores[b.owner])[0];
        if (src.armies > target.armies * 1.3) orders.push({ type: 'attack', from: tid, to: target.id, armies: Math.min(src.armies - 1, 3) });
      } else {
        target = targets.sort((a, b) => (a.armies / src.armies) - (b.armies / src.armies))[0];
        if (src.armies > target.armies * 1.1) orders.push({ type: 'attack', from: tid, to: target.id, armies: Math.min(src.armies - 1, 3) });
      }
    }

    // Limit attacks by personality
    const maxAttacks = personality === 'aggressive' ? 4 : personality === 'defensive' ? 1 : personality === 'diplomatic' ? 2 : 3;
    const atkOrders = orders.filter(o => o.type === 'attack');
    if (atkOrders.length > maxAttacks) {
      atkOrders.slice(maxAttacks).forEach(r => { const idx = orders.indexOf(r); if (idx >= 0) orders.splice(idx, 1); });
    }

    return orders;
  }

  function getAllies(pid) {
    const allies = [];
    for (const key of Object.keys(alliances)) {
      const [a, b] = key.split('-').map(Number);
      if (a === pid) allies.push(b);
      if (b === pid) allies.push(a);
    }
    return allies;
  }

  function processAllianceDiplomacy() {
    for (let i = 1; i < 5; i++) {
      if (!players[i].alive) continue;
      const p = players[i];
      const personality = p.personality;

      for (let j = i + 1; j < 5; j++) {
        if (!players[j].alive) continue;
        const q = players[j];
        const key = i + '-' + j;
        if (alliances[key]) continue;
        if (betrayals[key] && turnNumber - betrayals[key] < 5) continue;

        let willAlly = false;
        const dominant = players.reduce((best, pl) => pl.territories.length > best.territories.length ? pl : best, players[0]);
        const dominantThreat = dominant.territories.length > 8;

        if (personality === 'diplomatic' || q.personality === 'diplomatic') {
          if (p.trustScores[j] > 30 && q.trustScores[i] > 30) willAlly = true;
        }
        if (dominantThreat && dominant.id !== i && dominant.id !== j) { if (Math.random() < 0.5) willAlly = true; }
        if (personality === 'defensive' && p.territories.length < 4) { if (Math.random() < 0.4) willAlly = true; }

        if (willAlly) {
          alliances[key] = 3 + Math.floor(Math.random() * 3);
          logMsg('Alliance formed: ' + PLAYER_NAMES[i] + ' & ' + PLAYER_NAMES[j] + '!', 'diplomacy');
          p.trustScores[j] = Math.min(100, p.trustScores[j] + 15);
          q.trustScores[i] = Math.min(100, q.trustScores[i] + 15);
        }
      }

      // AI-to-human alliances
      const hKey = '0-' + i;
      if (!alliances[hKey]) {
        if (betrayals[hKey] && turnNumber - betrayals[hKey] < 5) continue;
        let willAllyHuman = false;
        if (personality === 'diplomatic' && p.trustScores[0] > 40) willAllyHuman = Math.random() < 0.3;
        if (p.territories.length < 3 && Math.random() < 0.3) willAllyHuman = true;
        const dominant = players.reduce((best, pl) => pl.territories.length > best.territories.length ? pl : best, players[0]);
        if (dominant.id !== 0 && dominant.id !== i && dominant.territories.length > 8 && Math.random() < 0.4) willAllyHuman = true;

        if (willAllyHuman) {
          alliances[hKey] = 3 + Math.floor(Math.random() * 3);
          logMsg(PLAYER_NAMES[i] + ' proposes alliance with you! (' + alliances[hKey] + ' turns)', 'diplomacy');
          p.trustScores[0] = Math.min(100, p.trustScores[0] + 10);
        }
      }
    }
  }

  /* ==================== UI ==================== */
  function updateUI() {
    const pt = players.length > 0 ? players[0].territories.length : 0;
    score = pt;
    if (scoreEl) scoreEl.textContent = pt;
    if (turnNumEl) turnNumEl.textContent = turnNumber;
    if (reinforcementsEl) reinforcementsEl.textContent = players.length > 0 ? players[0].reinforcements : 0;

    const allyNames = getAllies(0).map(id => PLAYER_NAMES[id]);
    if (allianceInfoEl) allianceInfoEl.textContent = allyNames.length > 0 ? 'Allies: ' + allyNames.join(', ') : 'Alliances: None';

    if (phaseInfoEl) phaseInfoEl.textContent = animating
      ? 'Phase: Resolving...'
      : 'Phase: Planning (' + currentOrders.length + ' orders)';

    const inPlanning = game.state === 'playing' && !animating;
    const btnAttack = document.getElementById('btnAttack');
    const btnReinforce = document.getElementById('btnReinforce');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnUndo = document.getElementById('btnUndo');
    if (btnAttack) btnAttack.disabled = !inPlanning;
    if (btnReinforce) btnReinforce.disabled = !inPlanning;
    if (btnSubmit) btnSubmit.disabled = !inPlanning;
    if (btnUndo) btnUndo.disabled = !inPlanning || currentOrders.length === 0;
  }

  function logMsg(msg, cls) {
    if (!logEl) return;
    const div = document.createElement('div');
    div.className = cls || '';
    div.textContent = msg;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* ==================== DRAWING ==================== */
  function drawContinentRegions(renderer, text) {
    for (let c = 0; c < 5; c++) {
      const contTerrs = territories.filter(t => t.cont === c);
      if (contTerrs.length === 0) continue;

      const minX = Math.min(...contTerrs.map(t => t.cx)) - 45;
      const maxX = Math.max(...contTerrs.map(t => t.cx)) + 45;
      const minY = Math.min(...contTerrs.map(t => t.cy)) - 45;
      const maxY = Math.max(...contTerrs.map(t => t.cy)) + 45;

      const rx = (maxX - minX) / 2;
      const ry = (maxY - minY) / 2;
      const ecx = minX + rx;
      const ecy = minY + ry;

      // Approximate ellipse as a polygon
      const pts = [];
      const nSides = 32;
      for (let i = 0; i < nSides; i++) {
        const a = (Math.PI * 2 * i) / nSides;
        pts.push({ x: ecx + Math.cos(a) * (rx + 10), y: ecy + Math.sin(a) * (ry + 10) });
      }

      // Parse continent base color and add alpha
      const base = CONTINENT_COLORS[c];
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      const fill = '#' + base.slice(1) + '30';
      renderer.fillPoly(pts, fill);

      text.drawText(CONTINENT_NAMES[c] + ' (+' + CONTINENT_BONUSES[c] + ')', ecx, maxY + 2, 10, '#ffffff26', 'center');
    }
  }

  function drawTerritory(t, renderer, text) {
    const isAllyOwned = getAllies(0).includes(t.owner);
    const isOwned = t.owner === 0;

    const color = (t.owner >= 0 && t.owner < 5) ? PLAYER_COLORS[t.owner] : '#555555';

    // Fill: color with 50% alpha
    const fillHex = color.replace('#', '');
    const fillR = parseInt(fillHex.slice(0, 2), 16);
    const fillG = parseInt(fillHex.slice(2, 4), 16);
    const fillB = parseInt(fillHex.slice(4, 6), 16);
    const fillColor = '#' + fillHex + '80';
    renderer.fillPoly(t.polyPoints, fillColor);

    // Stroke
    const strokeWidth = isOwned ? 2.5 : 1.5;
    if (isAllyOwned) {
      renderer.strokePoly(t.polyPoints, '#6aaaffcc', strokeWidth);
    } else {
      renderer.strokePoly(t.polyPoints, color, strokeWidth);
    }

    // Glow ring for player-owned
    if (isOwned) {
      renderer.setGlow(PLAYER_COLORS[0], 0.6);
      renderer.strokePoly(t.polyPoints, PLAYER_COLORS[0] + '60', 1);
      renderer.setGlow(null);
    }

    // Army count circle
    const r = t.armies > 9 ? 12 : 10;
    renderer.fillCircle(t.cx, t.cy, r, '#1a1a2e');
    renderer.strokePoly(circlePoints(t.cx, t.cy, r, 16), color, 1.5);

    // Army number
    text.drawText(String(t.armies), t.cx, t.cy - 6, 11, '#ffffff', 'center');

    // Reinforcement indicators
    const reinforced = currentOrders.filter(o => o.type === 'reinforce' && o.target === t.id);
    if (reinforced.length > 0) {
      const total = reinforced.reduce((s, o) => s + o.amount, 0);
      text.drawText('+' + total, t.cx + 14, t.cy - 16, 10, '#66ff66', 'left');
    }
  }

  function circlePoints(cx, cy, r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  function drawArrow(x1, y1, x2, y2, color, renderer) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const mx = x1 + Math.cos(angle) * (len - 20);
    const my = y1 + Math.sin(angle) * (len - 20);

    // Dashed line shaft
    renderer.dashedLine(x1, y1, mx, my, color, 2, 4, 4);

    // Arrowhead triangle
    const headPts = [
      { x: mx + Math.cos(angle) * 8,       y: my + Math.sin(angle) * 8 },
      { x: mx + Math.cos(angle + 2.5) * 8, y: my + Math.sin(angle + 2.5) * 8 },
      { x: mx + Math.cos(angle - 2.5) * 8, y: my + Math.sin(angle - 2.5) * 8 },
    ];
    renderer.fillPoly(headPts, color);
  }

  function drawTooltip(t, renderer, text) {
    const ownerName = t.owner >= 0 ? PLAYER_NAMES[t.owner] : 'Neutral';
    const lines = [t.name, 'Owner: ' + ownerName, 'Armies: ' + t.armies, 'Continent: ' + CONTINENT_NAMES[t.cont]];

    let tx = t.cx + 30, ty = t.cy - 30;
    if (tx + 140 > W) tx = t.cx - 170;
    if (ty < 10) ty = 10;
    if (ty + 60 > H) ty = H - 65;

    renderer.fillRect(tx, ty, 140, 58, '#0a0a1eeb');
    renderer.strokePoly([
      { x: tx, y: ty }, { x: tx + 140, y: ty },
      { x: tx + 140, y: ty + 58 }, { x: tx, y: ty + 58 },
    ], '#cc4444', 1);

    lines.forEach((line, i) => {
      text.drawText(line, tx + 6, ty + 5 + i * 13, 10, i === 0 ? '#cc4444' : '#cccccc', 'left');
    });
  }

  function drawLegend(renderer, text) {
    const lx = 10, ly = H - 82;
    renderer.fillRect(lx, ly, 145, 78, '#0a0a1ed9');
    renderer.strokePoly([
      { x: lx, y: ly }, { x: lx + 145, y: ly },
      { x: lx + 145, y: ly + 78 }, { x: lx, y: ly + 78 },
    ], '#333333', 1);

    for (let i = 0; i < 5; i++) {
      const p = players[i];
      if (!p) continue;
      const y = ly + 4 + i * 14;
      const dotColor = p.alive ? PLAYER_COLORS[i] : '#444444';
      renderer.fillCircle(lx + 8, y + 5, 4, dotColor);

      let pType = '';
      if (i > 0 && p.personality) pType = ' [' + p.personality.substring(0, 3) + ']';
      const label = p.name.substring(0, 12) + ' ' + p.territories.length + 't' + pType;
      text.drawText(label, lx + 16, y, 9, p.alive ? '#cccccc' : '#555555', 'left');

      if (!p.alive) text.drawText('X', lx + 135, y, 9, '#aa4444', 'left');
    }
  }

  function drawMenuAnimation(renderer, text) {
    const t = Date.now() / 1000;
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * W;
      const y = (Math.cos(t * 0.2 + i * 2.3) * 0.5 + 0.5) * H;
      const r = 2 + Math.sin(t + i) * 1.5;
      const alpha = Math.floor((0.15 + Math.sin(t + i) * 0.1) * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(x, y, r, '#cc4444' + alpha);
    }

    for (let i = 0; i < 8; i++) {
      const cx = 80 + i * 65;
      const cy = 200 + Math.sin(t + i) * 30;
      const hexPts = [];
      for (let j = 0; j < 6; j++) {
        const a = (Math.PI * 2 * j) / 6;
        hexPts.push({ x: cx + Math.cos(a) * 25, y: cy + Math.sin(a) * 25 });
      }
      const hexAlpha = Math.floor((0.1 + Math.sin(t * 0.5 + i) * 0.05) * 255).toString(16).padStart(2, '0');
      renderer.strokePoly(hexPts, '#cc4444' + hexAlpha, 1);
    }
  }

  /* ==================== INPUT ==================== */
  function getTerritoryAt(mx, my) {
    for (const t of territories) {
      if (pointInPoly(mx, my, t.polyPoints)) return t.id;
    }
    let closest = -1, minDist = 35;
    for (const t of territories) {
      const d = Math.sqrt((mx - t.cx) ** 2 + (my - t.cy) ** 2);
      if (d < minDist) { minDist = d; closest = t.id; }
    }
    return closest;
  }

  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // Attach canvas mouse events directly (not through engine input)
  const canvas = document.getElementById('game');

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (game.state === 'waiting') {
      game.hideOverlay();
      initGame();
      return;
    }

    if (game.state === 'over') {
      game.hideOverlay();
      initGame();
      return;
    }

    const tid = getTerritoryAt(mx, my);
    if (tid >= 0) handleTerritoryClick(tid);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const tid = getTerritoryAt(mx, my);
    if (tid !== hoveredTerritory) hoveredTerritory = tid;
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredTerritory = null;
  });

  // Wire up buttons
  window.setMode = setMode;
  window.submitOrders = submitOrders;
  window.undoOrder = undoOrder;

  /* ==================== ENGINE CALLBACKS ==================== */
  game.onInit = () => {
    game.showOverlay('WARZONE DIPLOMACY', 'Risk-like conquest with alliances & betrayal');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // No fixed-rate logic needed; game advances via setTimeout in resolveNextAttack
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      drawMenuAnimation(renderer, text);
      return;
    }

    if (territories.length === 0) return;

    drawContinentRegions(renderer, text);

    // Adjacency lines
    for (const [tidStr, neighbors] of Object.entries(adjacency)) {
      const tid = parseInt(tidStr);
      const t = territories[tid];
      for (const nid of neighbors) {
        if (nid > tid) {
          const n = territories[nid];
          renderer.drawLine(t.cx, t.cy, n.cx, n.cy, '#ffffff14', 1);
        }
      }
    }

    // Territories
    for (const t of territories) drawTerritory(t, renderer, text);

    // Attack order arrows
    for (const o of currentOrders) {
      if (o.type === 'attack') {
        const src = territories[o.from];
        const dst = territories[o.to];
        drawArrow(src.cx, src.cy, dst.cx, dst.cy, '#ffff00', renderer);
      }
    }

    // Selected territory highlight (dashed outline via repeated strokePoly)
    if (selectedTerritory !== null) {
      renderer.strokePoly(territories[selectedTerritory].polyPoints, '#ffffffcc', 3);
      adjacency[selectedTerritory].forEach(nid => {
        if (territories[nid].owner !== 0) {
          renderer.strokePoly(territories[nid].polyPoints, '#ff644480', 2);
        }
      });
    }

    // Tooltip
    if (hoveredTerritory !== null && hoveredTerritory >= 0) drawTooltip(territories[hoveredTerritory], renderer, text);

    // Legend
    drawLegend(renderer, text);
  };

  game.start();
  return game;
}
