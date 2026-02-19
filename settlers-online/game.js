import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 550;

  // ====== CONSTANTS ======
  const TERRAINS = ['forest','hills','mountain','field','pasture','desert'];
  const RES_NAMES = ['wood','brick','ore','grain','sheep'];
  const RES_COLORS = {wood:'#2d5a1e',brick:'#a63c1e',ore:'#666666',grain:'#d4a017',sheep:'#8fbf4a'};
  const TERRAIN_RES = {forest:'wood',hills:'brick',mountain:'ore',field:'grain',pasture:'sheep',desert:null};
  const TERRAIN_COLORS = {forest:'#1b6e1b',hills:'#b85c38',mountain:'#7a7a7a',field:'#d4a817',pasture:'#6db84a',desert:'#d2b48c'};
  const PLAYER_COLORS = ['#4aaaff','#ee5555','#44cc44','#ffaa44'];
  const PLAYER_NAMES = ['You','Red AI','Green AI','Gold AI'];
  const BUILD_COSTS = {
    road: {wood:1,brick:1},
    settlement: {wood:1,brick:1,grain:1,sheep:1},
    city: {ore:3,grain:2}
  };

  // ====== BOARD LAYOUT ======
  const HEX_ROWS = [3,4,5,4,3];
  const HEX_SIZE = 38;
  const BOARD_CX = 210, BOARD_CY = 220;

  // ====== STATE ======
  let gameState = 'title';
  let score = 0;
  let tiles = [];
  let vertices = [];
  let edges = [];
  let players = [];
  let currentPlayer = 0;
  let diceRoll = [0,0];
  let turnPhase = 'roll';
  let setupPhase = 0;
  let setupStep = 'settlement';
  let setupPlayerIdx = 0;
  let robberTile = -1;
  let longestRoadPlayer = -1;
  let longestRoadLen = 0;
  let selectedAction = null;
  let tradeOpen = false;
  let tradeOffer = {give:'',want:''};
  let hoverVertex = -1;
  let hoverEdge = -1;
  let messageLog = [];
  let animFrame = 0;
  let lastDice = [1,1];
  let lastSetupVertex = -1;

  // DOM spans
  const vpSpan = document.querySelector('.player-vp');
  const turnSpan = document.querySelector('.turn-info');

  // ====== HEX MATH ======
  function hexCorner(cx, cy, size, i) {
    const angle = Math.PI / 180 * (60 * i - 30);
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  }

  function hexCenter(row, col) {
    const h = HEX_SIZE * Math.sqrt(3);
    const y = BOARD_CY + (row - 2) * h;
    const cols = HEX_ROWS[row];
    const w = HEX_SIZE * 2;
    const totalW = (cols - 1) * w * 0.75;
    const x = BOARD_CX - totalW / 2 + col * w * 0.75;
    return { x, y };
  }

  function hexPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push(hexCorner(cx, cy, size, i));
    return pts;
  }

  // ====== BOARD GENERATION ======
  function generateBoard() {
    tiles = [];
    let terrains = [];
    for (let i = 0; i < 4; i++) terrains.push('forest');
    for (let i = 0; i < 3; i++) terrains.push('hills');
    for (let i = 0; i < 3; i++) terrains.push('mountain');
    for (let i = 0; i < 4; i++) terrains.push('field');
    for (let i = 0; i < 4; i++) terrains.push('pasture');
    terrains.push('desert');
    shuffle(terrains);

    let numbers = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
    shuffle(numbers);

    let tIdx = 0, nIdx = 0;
    for (let r = 0; r < HEX_ROWS.length; r++) {
      for (let c = 0; c < HEX_ROWS[r]; c++) {
        const pos = hexCenter(r, c);
        const terrain = terrains[tIdx];
        let num = 0;
        if (terrain !== 'desert') {
          num = numbers[nIdx++];
        } else {
          robberTile = tIdx;
        }
        tiles.push({
          row: r, col: c, x: pos.x, y: pos.y,
          terrain, number: num, hasRobber: terrain === 'desert'
        });
        tIdx++;
      }
    }
    generateVerticesAndEdges();
  }

  function generateVerticesAndEdges() {
    vertices = [];
    edges = [];
    const vMap = new Map();

    function vKey(x, y) {
      return Math.round(x * 10) + ',' + Math.round(y * 10);
    }

    for (let t = 0; t < tiles.length; t++) {
      const tile = tiles[t];
      tile.vertexIds = [];
      for (let i = 0; i < 6; i++) {
        const corner = hexCorner(tile.x, tile.y, HEX_SIZE, i);
        const key = vKey(corner.x, corner.y);
        if (!vMap.has(key)) {
          vMap.set(key, vertices.length);
          vertices.push({
            x: corner.x, y: corner.y,
            building: null,
            adjacentTiles: [],
            adjacentVertices: [],
            adjacentEdges: []
          });
        }
        const vi = vMap.get(key);
        tile.vertexIds.push(vi);
        if (!vertices[vi].adjacentTiles.includes(t)) {
          vertices[vi].adjacentTiles.push(t);
        }
      }
    }

    const eMap = new Map();
    function eKey(a, b) { return Math.min(a, b) + '-' + Math.max(a, b); }

    for (let t = 0; t < tiles.length; t++) {
      const vids = tiles[t].vertexIds;
      for (let i = 0; i < 6; i++) {
        const a = vids[i], b = vids[(i + 1) % 6];
        const key = eKey(a, b);
        if (!eMap.has(key)) {
          eMap.set(key, edges.length);
          edges.push({ v1: a, v2: b, road: null });
        }
        const ei = eMap.get(key);
        if (!vertices[a].adjacentEdges.includes(ei)) vertices[a].adjacentEdges.push(ei);
        if (!vertices[b].adjacentEdges.includes(ei)) vertices[b].adjacentEdges.push(ei);
        if (!vertices[a].adjacentVertices.includes(b)) vertices[a].adjacentVertices.push(b);
        if (!vertices[b].adjacentVertices.includes(a)) vertices[b].adjacentVertices.push(a);
      }
    }
  }

  // ====== PLAYER ======
  function createPlayer(idx) {
    return {
      index: idx,
      resources: { wood: 0, brick: 0, ore: 0, grain: 0, sheep: 0 },
      roads: 0, settlements: 0, cities: 0, vp: 0,
      hasLongestRoad: false, knightsPlayed: 0, hasLargestArmy: false
    };
  }

  // ====== UTILITY ======
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function canAfford(player, cost) {
    for (const r in cost) {
      if ((player.resources[r] || 0) < cost[r]) return false;
    }
    return true;
  }

  function payCost(player, cost) {
    for (const r in cost) player.resources[r] -= cost[r];
  }

  function totalResources(player) {
    let t = 0;
    for (const r of RES_NAMES) t += player.resources[r];
    return t;
  }

  function addMsg(msg) {
    messageLog.unshift(msg);
    if (messageLog.length > 6) messageLog.pop();
  }

  // ====== SETUP PHASE ======
  function initGame() {
    generateBoard();
    players = [];
    for (let i = 0; i < 4; i++) players.push(createPlayer(i));
    currentPlayer = 0;
    setupPhase = 1;
    setupStep = 'settlement';
    setupPlayerIdx = 0;
    gameState = 'playing';
    turnPhase = 'setup';
    selectedAction = null;
    tradeOpen = false;
    longestRoadPlayer = -1;
    longestRoadLen = 0;
    lastSetupVertex = -1;
    messageLog = [];
    lastDice = [1, 1];
    addMsg('Setup: Place your 1st settlement');
    if (turnSpan) turnSpan.textContent = 'Setup - Place Settlement';
    game.setState('playing');
  }

  function getSetupOrder() {
    if (setupPhase === 1) return [0, 1, 2, 3];
    if (setupPhase === 2) return [3, 2, 1, 0];
    return [];
  }

  function advanceSetup() {
    if (setupStep === 'settlement') {
      setupStep = 'road';
      if (getSetupOrder()[setupPlayerIdx] === 0) {
        if (turnSpan) turnSpan.textContent = 'Setup - Place Road';
        addMsg('Now place a road next to it');
      }
      return;
    }
    setupStep = 'settlement';
    setupPlayerIdx++;
    if (setupPlayerIdx >= 4) {
      if (setupPhase === 1) {
        setupPhase = 2;
        setupPlayerIdx = 0;
      } else {
        for (let p = 0; p < 4; p++) {
          let count = 0;
          for (const v of vertices) {
            if (v.building && v.building.player === p && v.building.type === 'settlement') {
              count++;
              if (count === 2) {
                for (const ti of v.adjacentTiles) {
                  const res = TERRAIN_RES[tiles[ti].terrain];
                  if (res) players[p].resources[res]++;
                }
              }
            }
          }
        }
        setupPhase = 0;
        currentPlayer = 0;
        turnPhase = 'roll';
        if (turnSpan) turnSpan.textContent = 'Your Turn - Click Dice';
        addMsg('Game started! Click dice to roll');
        updateVP();
        return;
      }
    }
    const order = getSetupOrder();
    currentPlayer = order[setupPlayerIdx];
    if (currentPlayer !== 0) {
      if (turnSpan) turnSpan.textContent = PLAYER_NAMES[currentPlayer] + ' placing...';
      setTimeout(() => aiSetup(currentPlayer), 500);
    } else {
      const which = setupPhase === 1 ? '1st' : '2nd';
      if (turnSpan) turnSpan.textContent = 'Setup - Place ' + which + ' Settlement';
      addMsg('Place your ' + which + ' settlement');
    }
  }

  // ====== VALID PLACEMENTS ======
  function getValidSettlementVertices(playerIdx, isSetup) {
    const valid = [];
    for (let vi = 0; vi < vertices.length; vi++) {
      if (vertices[vi].building) continue;
      if (vertices[vi].adjacentTiles.length === 0) continue;
      let tooClose = false;
      for (const adj of vertices[vi].adjacentVertices) {
        if (vertices[adj].building) { tooClose = true; break; }
      }
      if (tooClose) continue;
      if (isSetup) {
        valid.push(vi);
      } else {
        let connected = false;
        for (const ei of vertices[vi].adjacentEdges) {
          if (edges[ei].road === playerIdx) { connected = true; break; }
        }
        if (connected) valid.push(vi);
      }
    }
    return valid;
  }

  function getValidRoadEdges(playerIdx, fromVertex) {
    const valid = [];
    for (let ei = 0; ei < edges.length; ei++) {
      if (edges[ei].road !== null) continue;
      const e = edges[ei];
      if (fromVertex !== undefined) {
        if (e.v1 === fromVertex || e.v2 === fromVertex) valid.push(ei);
        continue;
      }
      let connected = false;
      for (const vi of [e.v1, e.v2]) {
        if (vertices[vi].building && vertices[vi].building.player === playerIdx) {
          connected = true; break;
        }
        for (const adjE of vertices[vi].adjacentEdges) {
          if (adjE !== ei && edges[adjE].road === playerIdx) {
            if (!vertices[vi].building || vertices[vi].building.player === playerIdx) {
              connected = true; break;
            }
          }
        }
        if (connected) break;
      }
      if (connected) valid.push(ei);
    }
    return valid;
  }

  function getValidCityVertices(playerIdx) {
    const valid = [];
    for (let vi = 0; vi < vertices.length; vi++) {
      if (vertices[vi].building && vertices[vi].building.player === playerIdx && vertices[vi].building.type === 'settlement') {
        valid.push(vi);
      }
    }
    return valid;
  }

  // ====== BUILDING ======
  function placeSettlement(vi, playerIdx, isSetup) {
    vertices[vi].building = { player: playerIdx, type: 'settlement' };
    players[playerIdx].settlements++;
    if (!isSetup) payCost(players[playerIdx], BUILD_COSTS.settlement);
    lastSetupVertex = vi;
    updateVP();
  }

  function placeRoad(ei, playerIdx, isSetup) {
    edges[ei].road = playerIdx;
    players[playerIdx].roads++;
    if (!isSetup) payCost(players[playerIdx], BUILD_COSTS.road);
    updateLongestRoad();
  }

  function placeCity(vi, playerIdx) {
    vertices[vi].building = { player: playerIdx, type: 'city' };
    players[playerIdx].settlements--;
    players[playerIdx].cities++;
    payCost(players[playerIdx], BUILD_COSTS.city);
    updateVP();
  }

  // ====== LONGEST ROAD ======
  function calcLongestRoad(playerIdx) {
    let best = 0;
    const playerEdges = [];
    for (let ei = 0; ei < edges.length; ei++) {
      if (edges[ei].road === playerIdx) playerEdges.push(ei);
    }
    function dfs(vertex, visited) {
      let maxLen = 0;
      for (const ei of vertices[vertex].adjacentEdges) {
        if (edges[ei].road !== playerIdx || visited.has(ei)) continue;
        const nextV = edges[ei].v1 === vertex ? edges[ei].v2 : edges[ei].v1;
        if (vertices[nextV].building && vertices[nextV].building.player !== playerIdx) continue;
        visited.add(ei);
        const len = 1 + dfs(nextV, visited);
        if (len > maxLen) maxLen = len;
        visited.delete(ei);
      }
      return maxLen;
    }
    for (const ei of playerEdges) {
      for (const startV of [edges[ei].v1, edges[ei].v2]) {
        const visited = new Set([ei]);
        const otherV = edges[ei].v1 === startV ? edges[ei].v2 : startV;
        const len = 1 + dfs(otherV, visited);
        if (len > best) best = len;
      }
    }
    return best;
  }

  function updateLongestRoad() {
    let bestPlayer = -1, bestLen = 0;
    for (let p = 0; p < 4; p++) {
      const len = calcLongestRoad(p);
      if (len >= 5 && len > bestLen) { bestLen = len; bestPlayer = p; }
    }
    for (let p = 0; p < 4; p++) players[p].hasLongestRoad = false;
    if (bestPlayer >= 0) {
      players[bestPlayer].hasLongestRoad = true;
      if (longestRoadPlayer !== bestPlayer) {
        longestRoadPlayer = bestPlayer;
        longestRoadLen = bestLen;
        addMsg(PLAYER_NAMES[bestPlayer] + ': Longest Road (' + bestLen + ')');
      }
    }
    updateVP();
  }

  // ====== VP ======
  function updateVP() {
    for (let p = 0; p < 4; p++) {
      let vp = players[p].settlements + players[p].cities * 2;
      if (players[p].hasLongestRoad) vp += 2;
      if (players[p].hasLargestArmy) vp += 2;
      players[p].vp = vp;
    }
    score = players[0].vp;
    if (vpSpan) vpSpan.textContent = 'VP: ' + score + ' / 10';
  }

  function checkWin() {
    for (let p = 0; p < 4; p++) {
      if (players[p].vp >= 10) {
        gameState = 'over';
        addMsg(PLAYER_NAMES[p] + ' wins with ' + players[p].vp + ' VP!');
        game.setState('over');
        return true;
      }
    }
    return false;
  }

  // ====== DICE & RESOURCES ======
  function rollDice() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    diceRoll = [d1, d2];
    lastDice = [d1, d2];
    const total = d1 + d2;
    addMsg('Rolled ' + total + (total === 7 ? ' - Robber!' : ''));

    if (total === 7) {
      for (let p = 0; p < 4; p++) {
        const t = totalResources(players[p]);
        if (t > 7) {
          const discard = Math.floor(t / 2);
          for (let d = 0; d < discard; d++) {
            const owned = RES_NAMES.filter(r => players[p].resources[r] > 0);
            if (owned.length > 0) {
              const r = owned[Math.floor(Math.random() * owned.length)];
              players[p].resources[r]--;
            }
          }
          if (p === 0) addMsg('Discarded ' + discard + ' cards');
        }
      }
      let newRobber;
      do { newRobber = Math.floor(Math.random() * tiles.length); } while (newRobber === robberTile);
      tiles[robberTile].hasRobber = false;
      robberTile = newRobber;
      tiles[robberTile].hasRobber = true;
    } else {
      for (let t = 0; t < tiles.length; t++) {
        if (tiles[t].number === total && !tiles[t].hasRobber) {
          const res = TERRAIN_RES[tiles[t].terrain];
          if (!res) continue;
          for (const vi of tiles[t].vertexIds) {
            if (vertices[vi].building) {
              const b = vertices[vi].building;
              const amount = b.type === 'city' ? 2 : 1;
              players[b.player].resources[res] += amount;
            }
          }
        }
      }
    }
    turnPhase = 'build';
  }

  // ====== TRADING ======
  function bankTrade(playerIdx, give, want) {
    if (players[playerIdx].resources[give] >= 4) {
      players[playerIdx].resources[give] -= 4;
      players[playerIdx].resources[want] += 1;
      if (playerIdx === 0) addMsg('Traded 4 ' + give + ' -> 1 ' + want);
      return true;
    }
    return false;
  }

  // ====== AI ======
  function aiSetup(playerIdx) {
    if (gameState !== 'playing') return;
    if (setupStep === 'settlement') {
      const valid = getValidSettlementVertices(playerIdx, true);
      if (valid.length === 0) { advanceSetup(); return; }
      let best = -1, bestScore = -Infinity;
      for (const vi of valid) {
        let s = 0;
        const resSet = new Set();
        for (const ti of vertices[vi].adjacentTiles) {
          const res = TERRAIN_RES[tiles[ti].terrain];
          if (res) {
            resSet.add(res);
            const n = tiles[ti].number;
            s += 6 - Math.abs(7 - n);
          }
        }
        s += resSet.size * 3;
        s += Math.random() * 2;
        if (s > bestScore) { bestScore = s; best = vi; }
      }
      placeSettlement(best, playerIdx, true);
      lastSetupVertex = best;
      setTimeout(() => { advanceSetup(); }, 350);
    } else if (setupStep === 'road') {
      const valid = getValidRoadEdges(playerIdx, lastSetupVertex);
      if (valid.length > 0) {
        const ei = valid[Math.floor(Math.random() * valid.length)];
        placeRoad(ei, playerIdx, true);
      }
      setTimeout(() => { advanceSetup(); }, 350);
    }
  }

  function aiTurn(playerIdx) {
    if (gameState !== 'playing') return;
    turnPhase = 'roll';

    setTimeout(() => {
      rollDice();
      if (checkWin()) return;

      setTimeout(() => {
        aiBuilding(playerIdx);
      }, 500);
    }, 600);
  }

  function aiBuilding(playerIdx) {
    if (gameState !== 'playing') return;
    const p = players[playerIdx];
    let actions = [];

    aiSmartTrade(playerIdx);

    if (canAfford(p, BUILD_COSTS.city)) {
      const valid = getValidCityVertices(playerIdx);
      if (valid.length > 0) {
        let best = valid[0], bestVal = -1;
        for (const vi of valid) {
          let val = 0;
          for (const ti of vertices[vi].adjacentTiles) {
            val += 6 - Math.abs(7 - tiles[ti].number);
          }
          if (val > bestVal) { bestVal = val; best = vi; }
        }
        placeCity(best, playerIdx);
        actions.push('city');
      }
    }

    if (canAfford(p, BUILD_COSTS.settlement)) {
      const valid = getValidSettlementVertices(playerIdx, false);
      if (valid.length > 0) {
        let best = valid[0], bestVal = -1;
        for (const vi of valid) {
          let val = 0;
          const resSet = new Set();
          for (const ti of vertices[vi].adjacentTiles) {
            const res = TERRAIN_RES[tiles[ti].terrain];
            if (res) { resSet.add(res); val += 6 - Math.abs(7 - tiles[ti].number); }
          }
          val += resSet.size * 2;
          for (const adj of vertices[vi].adjacentVertices) {
            if (vertices[adj].building && vertices[adj].building.player === 0) val += 2;
          }
          if (val > bestVal) { bestVal = val; best = vi; }
        }
        placeSettlement(best, playerIdx, false);
        actions.push('settlement');
      }
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      if (canAfford(p, BUILD_COSTS.road) && p.roads < 15) {
        const valid = getValidRoadEdges(playerIdx);
        if (valid.length > 0) {
          let best = valid[Math.floor(Math.random() * valid.length)];
          let bestVal = -1;
          for (const ei of valid) {
            const e = edges[ei];
            let val = Math.random() * 2;
            for (const vi of [e.v1, e.v2]) {
              if (!vertices[vi].building) {
                let tooClose = false;
                for (const adj of vertices[vi].adjacentVertices) {
                  if (vertices[adj].building) tooClose = true;
                }
                if (!tooClose) {
                  for (const ti of vertices[vi].adjacentTiles) {
                    val += (6 - Math.abs(7 - tiles[ti].number)) * 0.5;
                  }
                }
              }
            }
            if (val > bestVal) { bestVal = val; best = ei; }
          }
          placeRoad(best, playerIdx, false);
          actions.push('road');
        }
      }
    }

    if (actions.length > 0) {
      addMsg(PLAYER_NAMES[playerIdx] + ': ' + actions.join(', '));
    }

    if (checkWin()) return;
    nextPlayer();
  }

  function aiSmartTrade(playerIdx) {
    const p = players[playerIdx];
    const wantsToBuild = [];
    if (getValidCityVertices(playerIdx).length > 0) wantsToBuild.push(BUILD_COSTS.city);
    if (getValidSettlementVertices(playerIdx, false).length > 0) wantsToBuild.push(BUILD_COSTS.settlement);
    wantsToBuild.push(BUILD_COSTS.road);

    for (const cost of wantsToBuild) {
      const needs = [];
      for (const r in cost) {
        const deficit = cost[r] - p.resources[r];
        if (deficit > 0) needs.push(r);
      }
      if (needs.length === 0) continue;

      for (const r of RES_NAMES) {
        if (p.resources[r] >= 5 && needs.length > 0 && r !== needs[0]) {
          bankTrade(playerIdx, r, needs[0]);
          return;
        }
      }
      for (const r of RES_NAMES) {
        if (p.resources[r] >= 4 && needs.length > 0 && r !== needs[0]) {
          bankTrade(playerIdx, r, needs[0]);
          return;
        }
      }
    }
  }

  function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % 4;
    turnPhase = 'roll';
    selectedAction = null;
    tradeOpen = false;
    if (gameState !== 'playing') return;

    if (currentPlayer === 0) {
      if (turnSpan) turnSpan.textContent = 'Your Turn - Click Dice';
      addMsg('Your turn!');
    } else {
      if (turnSpan) turnSpan.textContent = PLAYER_NAMES[currentPlayer] + "'s Turn";
      setTimeout(() => aiTurn(currentPlayer), 500);
    }
  }

  // ====== RENDERING HELPERS ======
  function alpha(hex, a) {
    // Convert '#rrggbb' + alpha float to '#rrggbbaa'
    const aa = Math.round(a * 255).toString(16).padStart(2, '0');
    return hex + aa;
  }

  function drawHexFilled(r, cx, cy, size, fillColor, strokeColor, strokeW) {
    const pts = hexPoints(cx, cy, size);
    r.fillPoly(pts, fillColor);
    if (strokeColor) r.strokePoly(pts, strokeColor, strokeW || 2);
  }

  // ====== DRAW FUNCTIONS ======
  function drawTitle(r, t) {
    r.fillRect(0, 0, W, H, '#0d2137');

    const pulse = 0.3 + 0.15 * Math.sin(animFrame * 0.03);
    const colors = ['#1b6e1b','#b85c38','#7a7a7a','#d4a817','#6db84a','#d2b48c'];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + animFrame * 0.005;
      const rad = 100;
      const hx = W/2 + rad * Math.cos(angle);
      const hy = 250 + rad * Math.sin(angle) * 0.6;
      const a35 = Math.round(0.35 * 255).toString(16).padStart(2, '0');
      drawHexFilled(r, hx, hy, 28, colors[i % 6] + a35, alpha('#ee8844', 0.3));
    }

    r.setGlow('#e84', 0.8);
    t.drawText('Settlers', W/2, 80, 38, '#ee8844', 'center');
    t.drawText('Online', W/2, 122, 38, '#ee8844', 'center');
    r.setGlow(null);

    t.drawText('Trade, Build, Settle the Island', W/2, 180, 14, '#aaaaaa', 'center');
    t.drawText('You vs 3 AI Opponents', W/2, 200, 14, '#aaaaaa', 'center');

    const rules = [
      'Roll dice -> Collect resources',
      'Build roads, settlements, cities',
      'Trade 4:1 with the bank',
      'Longest Road = +2 VP',
      'First to 10 Victory Points wins!'
    ];
    for (let i = 0; i < rules.length; i++) {
      t.drawText(rules[i], W/2, 332 + i * 18, 11, '#777777', 'center');
    }

    const btnY = 454;
    const btnPulseAlpha = Math.round((0.15 + pulse * 0.15) * 255).toString(16).padStart(2,'0');
    r.fillRect(W/2 - 90, btnY - 16, 180, 36, '#ee8844' + btnPulseAlpha);
    r.strokePoly([
      {x: W/2-90, y: btnY-16}, {x: W/2+90, y: btnY-16},
      {x: W/2+90, y: btnY+20}, {x: W/2-90, y: btnY+20}
    ], '#ee8844', 2);
    r.setGlow('#e84', 0.4 * pulse);
    t.drawText('Click to Start', W/2, btnY - 6, 16, '#ee8844', 'center');
    r.setGlow(null);
  }

  function drawBoard(r, t) {
    // Ocean circle approximation with a large polygon
    const oceanPts = [];
    const oceanR = HEX_SIZE * 4.8;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      oceanPts.push({ x: BOARD_CX + oceanR * Math.cos(a), y: BOARD_CY + oceanR * Math.sin(a) });
    }
    r.fillPoly(oceanPts, '#0d2137');
    r.strokePoly(oceanPts, alpha('#ee8844', 0.15), 3);

    for (let ti = 0; ti < tiles.length; ti++) {
      const tile = tiles[ti];
      let color = TERRAIN_COLORS[tile.terrain];
      if (tile.hasRobber) color = '#444444';
      drawHexFilled(r, tile.x, tile.y, HEX_SIZE - 2, color, '#1a1a2e', 1);

      if (tile.number > 0 && !tile.hasRobber) {
        // Number token circle
        const numCirclePts = [];
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          numCirclePts.push({ x: tile.x + 13 * Math.cos(a), y: tile.y + 13 * Math.sin(a) });
        }
        r.fillPoly(numCirclePts, '#f5f0dc');
        r.strokePoly(numCirclePts, '#333333', 1);

        const numColor = (tile.number === 6 || tile.number === 8) ? '#cc0000' : '#333333';
        t.drawText('' + tile.number, tile.x, tile.y - 8, 12, numColor, 'center');

        // Probability dots
        const dots = 6 - Math.abs(7 - tile.number);
        const dotColor = (tile.number === 6 || tile.number === 8) ? '#cc0000' : '#888888';
        for (let d = 0; d < dots; d++) {
          const dx = tile.x - (dots - 1) * 2.5 + d * 5;
          r.fillCircle(dx, tile.y + 9, 1.5, dotColor);
        }
      }

      if (tile.hasRobber && tile.terrain !== 'desert') {
        r.fillCircle(tile.x, tile.y - 4, 9, '#111111');
        r.fillRect(tile.x - 6, tile.y + 5, 12, 8, '#111111');
        t.drawText('R', tile.x, tile.y - 11, 10, '#ee8844', 'center');
      } else if (tile.terrain === 'desert') {
        t.drawText('DESERT', tile.x, tile.y - 6, 10, alpha('#000000', 0.4), 'center');
      }

      if (!tile.hasRobber && tile.terrain !== 'desert') {
        t.drawText(tile.terrain.substring(0, 3).toUpperCase(), tile.x, tile.y + 12, 8, alpha('#ffffff', 0.25), 'center');
      }
    }
  }

  function drawRoads(r) {
    for (let ei = 0; ei < edges.length; ei++) {
      const e = edges[ei];
      if (e.road === null) continue;
      const v1 = vertices[e.v1], v2 = vertices[e.v2];
      r.drawLine(v1.x + 1, v1.y + 1, v2.x + 1, v2.y + 1, alpha('#000000', 0.4), 6);
      r.drawLine(v1.x, v1.y, v2.x, v2.y, PLAYER_COLORS[e.road], 4);
    }
  }

  function drawHighlights(r) {
    if (currentPlayer !== 0 || gameState !== 'playing') return;

    if (turnPhase === 'setup') {
      const order = getSetupOrder();
      if (order[setupPlayerIdx] !== 0) return;

      if (setupStep === 'settlement') {
        const valid = getValidSettlementVertices(0, true);
        for (const vi of valid) {
          const isHover = vi === hoverVertex;
          const col = isHover ? alpha('#4aaaff', 0.7) : alpha('#4aaaff', 0.2);
          r.fillCircle(vertices[vi].x, vertices[vi].y, isHover ? 8 : 5, col);
          if (isHover) r.strokePoly(circlePoints(vertices[vi].x, vertices[vi].y, 8), '#4aaaff', 2);
        }
      } else if (setupStep === 'road') {
        const valid = getValidRoadEdges(0, lastSetupVertex);
        for (const ei of valid) {
          const e = edges[ei];
          const v1 = vertices[e.v1], v2 = vertices[e.v2];
          const isHover = ei === hoverEdge;
          const col = isHover ? alpha('#4aaaff', 0.7) : alpha('#4aaaff', 0.2);
          r.drawLine(v1.x, v1.y, v2.x, v2.y, col, isHover ? 6 : 4);
        }
      }
      return;
    }

    if (turnPhase === 'build' && selectedAction === 'settlement') {
      const valid = getValidSettlementVertices(0, false);
      for (const vi of valid) {
        const isHover = vi === hoverVertex;
        r.fillCircle(vertices[vi].x, vertices[vi].y, isHover ? 8 : 5, isHover ? alpha('#4aaaff', 0.7) : alpha('#4aaaff', 0.2));
      }
    }
    if (turnPhase === 'build' && selectedAction === 'city') {
      const valid = getValidCityVertices(0);
      for (const vi of valid) {
        const isHover = vi === hoverVertex;
        r.fillCircle(vertices[vi].x, vertices[vi].y, isHover ? 9 : 6, isHover ? alpha('#4aaaff', 0.7) : alpha('#4aaaff', 0.2));
      }
    }
    if (turnPhase === 'build' && selectedAction === 'road') {
      const valid = getValidRoadEdges(0);
      for (const ei of valid) {
        const e = edges[ei];
        const v1 = vertices[e.v1], v2 = vertices[e.v2];
        const isHover = ei === hoverEdge;
        const col = isHover ? alpha('#4aaaff', 0.7) : alpha('#4aaaff', 0.2);
        r.drawLine(v1.x, v1.y, v2.x, v2.y, col, isHover ? 6 : 4);
      }
    }
  }

  function circlePoints(cx, cy, rad, n) {
    n = n || 16;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
    }
    return pts;
  }

  function drawBuildings(r) {
    for (let vi = 0; vi < vertices.length; vi++) {
      const v = vertices[vi];
      if (!v.building) continue;
      const color = PLAYER_COLORS[v.building.player];
      if (v.building.type === 'settlement') {
        // House shape: pentagon roof
        const pts = [
          {x: v.x,     y: v.y - 9},
          {x: v.x + 7, y: v.y - 3},
          {x: v.x + 7, y: v.y + 5},
          {x: v.x - 7, y: v.y + 5},
          {x: v.x - 7, y: v.y - 3},
        ];
        r.fillPoly(pts, color);
        r.strokePoly(pts, '#000000', 1.5);
      } else {
        // City: L-shaped polygon
        const pts = [
          {x: v.x - 4, y: v.y - 12},
          {x: v.x + 3, y: v.y - 6},
          {x: v.x + 9, y: v.y - 6},
          {x: v.x + 9, y: v.y + 6},
          {x: v.x - 9, y: v.y + 6},
          {x: v.x - 9, y: v.y - 3},
          {x: v.x - 4, y: v.y - 3},
        ];
        r.fillPoly(pts, color);
        r.strokePoly(pts, '#000000', 1.5);
        // Window
        r.fillRect(v.x - 2, v.y - 1, 4, 4, alpha('#ffffff', 0.3));
      }
    }
  }

  function drawPanel(r, t, x, y, w, h, title) {
    r.fillRect(x, y, w, h, '#12152a');
    r.strokePoly([
      {x: x,   y: y},   {x: x+w, y: y},
      {x: x+w, y: y+h}, {x: x,   y: y+h}
    ], alpha('#ee8844', 0.3), 1);
    if (title) {
      t.drawText(title, x + 6, y + 4, 9, '#ee8844', 'left');
    }
  }

  function drawDie(r, cx, cy, value) {
    const rad = 15;
    // Die face
    r.fillRect(cx - rad, cy - rad, rad * 2, rad * 2, '#f5f0dc');
    r.strokePoly([
      {x: cx-rad, y: cy-rad}, {x: cx+rad, y: cy-rad},
      {x: cx+rad, y: cy+rad}, {x: cx-rad, y: cy+rad}
    ], '#555555', 1);

    const dotR = 2.5;
    const positions = {
      1: [[0,0]],
      2: [[-5,-5],[5,5]],
      3: [[-5,-5],[0,0],[5,5]],
      4: [[-5,-5],[5,-5],[-5,5],[5,5]],
      5: [[-5,-5],[5,-5],[0,0],[-5,5],[5,5]],
      6: [[-5,-5],[5,-5],[-5,0],[5,0],[-5,5],[5,5]]
    };
    const dots = positions[value] || positions[1];
    for (const [dx, dy] of dots) {
      r.fillCircle(cx + dx, cy + dy, dotR, '#222222');
    }
  }

  function drawUI(r, t) {
    const PX = 430;
    const PW = 162;

    // === DICE PANEL ===
    drawPanel(r, t, PX, 8, PW, 55, 'DICE');
    const dy = 26;
    drawDie(r, PX + 40, dy, lastDice[0]);
    drawDie(r, PX + 100, dy, lastDice[1]);

    if (currentPlayer === 0 && turnPhase === 'roll') {
      t.drawText('[ CLICK TO ROLL ]', PX + PW/2, 54, 9, '#ee8844', 'center');
    } else if (lastDice[0] + lastDice[1] > 1) {
      t.drawText('Total: ' + (lastDice[0]+lastDice[1]), PX + PW/2, 54, 9, '#777777', 'center');
    }

    // === RESOURCES PANEL ===
    drawPanel(r, t, PX, 68, PW, 82, 'RESOURCES');
    const resIcons = [
      {name:'wood',  icon:'W', color:'#3a7a2a'},
      {name:'brick', icon:'B', color:'#b85c38'},
      {name:'ore',   icon:'O', color:'#999999'},
      {name:'grain', icon:'G', color:'#d4a017'},
      {name:'sheep', icon:'S', color:'#6db84a'}
    ];
    const res = players.length > 0 ? players[0].resources : {};
    for (let i = 0; i < 5; i++) {
      const ry = 82 + i * 13;
      t.drawText(resIcons[i].icon,         PX + 8,      ry, 10, resIcons[i].color, 'left');
      t.drawText(resIcons[i].name,         PX + 22,     ry, 10, '#bbbbbb', 'left');
      t.drawText('' + (res[resIcons[i].name] || 0), PX + PW - 8, ry, 10, '#ffffff', 'right');
    }

    // === BUILD PANEL ===
    drawPanel(r, t, PX, 156, PW, 118, 'BUILD');
    const buildOpts = [
      {key:'road',       label:'Road',       cost:'W+B',     costs: BUILD_COSTS.road},
      {key:'settlement', label:'Settlement', cost:'W+B+G+S', costs: BUILD_COSTS.settlement},
      {key:'city',       label:'City',       cost:'3O+2G',   costs: BUILD_COSTS.city},
    ];
    for (let i = 0; i < 3; i++) {
      const by = 170 + i * 26;
      const opt = buildOpts[i];
      const canBuild = currentPlayer === 0 && turnPhase === 'build' && canAfford(players[0], opt.costs);
      const active = selectedAction === opt.key;

      r.fillRect(PX + 4, by - 2, PW - 8, 22, active ? alpha('#ee8844', 0.25) : alpha('#ffffff', 0.04));
      if (active) {
        r.strokePoly([
          {x: PX+4,     y: by-2},   {x: PX+PW-4, y: by-2},
          {x: PX+PW-4, y: by+20},  {x: PX+4,     y: by+20}
        ], '#ee8844', 1);
      }
      t.drawText(opt.label, PX + 10, by,     10, canBuild ? '#dddddd' : '#555555', 'left');
      t.drawText(opt.cost,  PX + 10, by + 12, 8, canBuild ? '#999999' : '#444444', 'left');
    }

    // End turn button
    const endY = 254;
    const canEnd = currentPlayer === 0 && turnPhase === 'build';
    r.fillRect(PX + 4, endY, PW - 8, 18, canEnd ? alpha('#ee8844', 0.15) : alpha('#ffffff', 0.03));
    r.strokePoly([
      {x: PX+4,     y: endY},    {x: PX+PW-4, y: endY},
      {x: PX+PW-4, y: endY+18}, {x: PX+4,     y: endY+18}
    ], canEnd ? '#ee8844' : '#333333', 1);
    t.drawText('END TURN', PX + PW/2, endY + 4, 10, canEnd ? '#ee8844' : '#555555', 'center');

    // === TRADE PANEL ===
    drawPanel(r, t, PX, 278, PW, 78, 'TRADE 4:1');
    if (tradeOpen && currentPlayer === 0 && turnPhase === 'build') {
      t.drawText('Give: ' + (tradeOffer.give || '???'), PX + 6, 294, 9, '#aaaaaa', 'left');
      t.drawText('Want: ' + (tradeOffer.want || '???'), PX + 6, 307, 9, '#aaaaaa', 'left');

      for (let i = 0; i < 5; i++) {
        const bx = PX + 6 + i * 31;
        const hasEnough = players[0].resources[RES_NAMES[i]] >= 4;
        const giveCol = tradeOffer.give === RES_NAMES[i] ? '#ee8844' : (hasEnough ? '#2a2a4e' : '#1a1a2e');
        r.fillRect(bx, 320, 28, 13, giveCol);
        r.strokePoly([{x:bx,y:320},{x:bx+28,y:320},{x:bx+28,y:333},{x:bx,y:333}], hasEnough ? '#ee8844' : '#333333', 1);
        t.drawText(RES_NAMES[i].substring(0,3).toUpperCase(), bx+14, 322, 7, hasEnough ? '#ffffff' : '#555555', 'center');

        const wantCol = tradeOffer.want === RES_NAMES[i] ? '#4aaaff' : '#2a2a4e';
        r.fillRect(bx, 335, 28, 13, wantCol);
        r.strokePoly([{x:bx,y:335},{x:bx+28,y:335},{x:bx+28,y:348},{x:bx,y:348}], '#4aaaff', 1);
        t.drawText(RES_NAMES[i].substring(0,3).toUpperCase(), bx+14, 337, 7, '#ffffff', 'center');
      }
    } else {
      const canTrade = currentPlayer === 0 && turnPhase === 'build';
      t.drawText('Click to open trade', PX + 8, 296, 9, canTrade ? '#aaaaaa' : '#555555', 'left');
      t.drawText('Give 4 of one resource', PX + 8, 310, 9, '#666666', 'left');
      t.drawText('Get 1 of another', PX + 8, 323, 9, '#666666', 'left');
    }

    // === VP TRACKER ===
    drawPanel(r, t, PX, 362, PW, 90, 'VICTORY POINTS');
    for (let p = 0; p < 4; p++) {
      if (!players[p]) continue;
      const py = 380 + p * 18;
      r.fillRect(PX + 8, py - 5, 6, 10, PLAYER_COLORS[p]);
      const nameColor = p === currentPlayer ? '#ffffff' : '#aaaaaa';
      const name = (p === 0 ? 'You' : PLAYER_NAMES[p]);
      t.drawText(name, PX + 18, py - 6, p === currentPlayer ? 11 : 10, nameColor, 'left');
      const barW = Math.min(players[p].vp / 10, 1) * 50;
      r.fillRect(PX + 80, py - 4, 50, 8, alpha('#ee8844', 0.2));
      r.fillRect(PX + 80, py - 4, barW, 8, PLAYER_COLORS[p]);
      t.drawText(players[p].vp + '', PX + PW - 6, py - 6, 10, '#ffffff', 'right');
      let badges = '';
      if (players[p].hasLongestRoad) badges += 'LR ';
      if (players[p].hasLargestArmy) badges += 'LA';
      if (badges) t.drawText(badges, PX + 78, py - 6, 7, '#ee8844', 'right');
    }

    // === MESSAGE LOG ===
    drawPanel(r, t, PX, 458, PW, 84, 'LOG');
    for (let i = 0; i < Math.min(messageLog.length, 6); i++) {
      const logColor = i === 0 ? '#ee8844' : (i === 1 ? '#999999' : '#555555');
      let msg = messageLog[i];
      if (msg.length > 26) msg = msg.substring(0, 25) + '..';
      t.drawText(msg, PX + 6, 473 + i * 10, 8, logColor, 'left');
    }

    // === BOARD STATUS BAR ===
    if (turnPhase === 'setup') {
      const order = getSetupOrder();
      const cp = order[setupPlayerIdx];
      r.fillRect(20, H - 32, 395, 26, alpha('#1a1a2e', 0.9));
      r.strokePoly([
        {x:20,   y:H-32}, {x:415,  y:H-32},
        {x:415,  y:H-6},  {x:20,   y:H-6}
      ], PLAYER_COLORS[cp], 1);
      const round = setupPhase === 1 ? '1' : '2';
      t.drawText(PLAYER_NAMES[cp] + ' - Place ' + setupStep + ' (Round ' + round + ')',
        217, H - 32 + 7, 12, PLAYER_COLORS[cp], 'center');
    }
  }

  function drawGameOver(r, t) {
    r.fillRect(0, 0, W, H, alpha('#1a1a2e', 0.88));

    let winner = 0;
    for (let p = 0; p < 4; p++) {
      if (players[p] && players[p].vp >= 10) winner = p;
    }

    r.setGlow('#e84', 0.8);
    if (winner === 0) {
      t.drawText('VICTORY!', W/2, H/2 - 75, 36, '#ee8844', 'center');
    } else {
      t.drawText(PLAYER_NAMES[winner] + ' Wins', W/2, H/2 - 75, 36, '#ee8844', 'center');
    }
    r.setGlow(null);

    if (players[winner]) {
      t.drawText(players[winner].vp + ' Victory Points', W/2, H/2 - 30, 14, '#aaaaaa', 'center');
    }

    for (let p = 0; p < 4; p++) {
      if (!players[p]) continue;
      const tag = p === winner ? ' << WINNER' : '';
      t.drawText(PLAYER_NAMES[p] + ': ' + players[p].vp + ' VP' + tag,
        W/2, H/2 + 20 + p * 24, 13, PLAYER_COLORS[p], 'center');
    }

    const pulse = 0.5 + 0.5 * Math.sin(animFrame * 0.05);
    const pulseAlpha = Math.round((0.5 + pulse * 0.5) * 255).toString(16).padStart(2,'0');
    t.drawText('Click to play again', W/2, H/2 + 125, 14, '#ee8844' + pulseAlpha, 'center');
  }

  // ====== INPUT ======
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    hoverVertex = -1;
    hoverEdge = -1;

    let minDist = 18;
    for (let vi = 0; vi < vertices.length; vi++) {
      const dx = vertices[vi].x - mx, dy = vertices[vi].y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) { minDist = d; hoverVertex = vi; }
    }

    let minEdgeDist = 12;
    for (let ei = 0; ei < edges.length; ei++) {
      const e = edges[ei];
      const v1 = vertices[e.v1], v2 = vertices[e.v2];
      const cx = (v1.x + v2.x) / 2, cy = (v1.y + v2.y) / 2;
      const dx = cx - mx, dy = cy - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minEdgeDist) { minEdgeDist = d; hoverEdge = ei; }
    }
  });

  canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (gameState === 'title') {
      initGame();
      return;
    }

    if (gameState === 'over') {
      gameState = 'title';
      game.setState('waiting');
      return;
    }

    // === SETUP CLICKS ===
    if (turnPhase === 'setup') {
      const order = getSetupOrder();
      if (order[setupPlayerIdx] !== 0) return;

      if (setupStep === 'settlement') {
        const valid = getValidSettlementVertices(0, true);
        if (hoverVertex >= 0 && valid.includes(hoverVertex)) {
          placeSettlement(hoverVertex, 0, true);
          addMsg('Settlement placed!');
          advanceSetup();
          return;
        }
      } else if (setupStep === 'road') {
        const valid = getValidRoadEdges(0, lastSetupVertex);
        if (hoverEdge >= 0 && valid.includes(hoverEdge)) {
          placeRoad(hoverEdge, 0, true);
          addMsg('Road placed!');
          advanceSetup();
          return;
        }
      }
      return;
    }

    if (currentPlayer !== 0) return;

    const PX = 430;
    const PW = 162;

    // === DICE CLICK ===
    if (turnPhase === 'roll') {
      if (mx >= PX && mx <= PX + PW && my >= 8 && my <= 63) {
        rollDice();
        if (turnSpan) turnSpan.textContent = 'Your Turn - Build / Trade';
        return;
      }
    }

    // === BUILD MENU CLICKS ===
    if (turnPhase === 'build') {
      const buildKeys = ['road', 'settlement', 'city'];
      for (let i = 0; i < 3; i++) {
        const by = 170 + i * 26;
        if (mx >= PX + 4 && mx <= PX + PW - 4 && my >= by - 2 && my <= by + 20) {
          if (canAfford(players[0], BUILD_COSTS[buildKeys[i]])) {
            selectedAction = selectedAction === buildKeys[i] ? null : buildKeys[i];
            tradeOpen = false;
          }
          return;
        }
      }

      // End turn
      const endY = 254;
      if (mx >= PX + 4 && mx <= PX + PW - 4 && my >= endY && my <= endY + 18) {
        selectedAction = null;
        nextPlayer();
        return;
      }

      // Trade panel
      const tradeY = 278;
      if (mx >= PX && mx <= PX + PW && my >= tradeY && my <= tradeY + 78) {
        if (!tradeOpen) {
          tradeOpen = true;
          tradeOffer = { give: '', want: '' };
          selectedAction = null;
          return;
        }
        for (let i = 0; i < 5; i++) {
          const bx = PX + 6 + i * 31;
          if (mx >= bx && mx <= bx + 28 && my >= 320 && my <= 333) {
            if (players[0].resources[RES_NAMES[i]] >= 4) {
              tradeOffer.give = RES_NAMES[i];
              tryExecuteTrade();
            }
            return;
          }
          if (mx >= bx && mx <= bx + 28 && my >= 335 && my <= 348) {
            tradeOffer.want = RES_NAMES[i];
            tryExecuteTrade();
            return;
          }
        }
        return;
      }

      // === BOARD CLICKS ===
      if (selectedAction === 'road' && hoverEdge >= 0) {
        const valid = getValidRoadEdges(0);
        if (valid.includes(hoverEdge)) {
          placeRoad(hoverEdge, 0, false);
          addMsg('Road built!');
          if (!canAfford(players[0], BUILD_COSTS.road)) selectedAction = null;
          return;
        }
      }
      if (selectedAction === 'settlement' && hoverVertex >= 0) {
        const valid = getValidSettlementVertices(0, false);
        if (valid.includes(hoverVertex)) {
          placeSettlement(hoverVertex, 0, false);
          addMsg('Settlement built!');
          selectedAction = null;
          return;
        }
      }
      if (selectedAction === 'city' && hoverVertex >= 0) {
        const valid = getValidCityVertices(0);
        if (valid.includes(hoverVertex)) {
          placeCity(hoverVertex, 0);
          addMsg('City upgraded!');
          selectedAction = null;
          return;
        }
      }
    }
  });

  function tryExecuteTrade() {
    if (tradeOffer.give && tradeOffer.want && tradeOffer.give !== tradeOffer.want) {
      if (bankTrade(0, tradeOffer.give, tradeOffer.want)) {
        tradeOffer = { give: '', want: '' };
      }
    }
  }

  // ====== GAME LOOP ======
  game.setScoreFn(() => score);

  game.onInit = () => {
    game.showOverlay('Settlers Online', 'Click to Start');
    game.setState('waiting');
  };

  game.onUpdate = (dt) => {
    animFrame++;
  };

  game.onDraw = (r, t) => {
    r.fillRect(0, 0, W, H, '#1a1a2e');

    if (gameState === 'title') {
      drawTitle(r, t);
      return;
    }

    drawBoard(r, t);
    drawRoads(r);
    drawHighlights(r);
    drawBuildings(r);
    drawUI(r, t);

    if (gameState === 'over') drawGameOver(r, t);
  };

  game.start();
  return game;
}
