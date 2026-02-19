// tile-kingdoms/game.js — Tile Kingdoms ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 600;
const TILE_SIZE = 40;

// ── DOM refs ──
const scoreEl         = document.getElementById('score');
const aiScoreEl       = document.getElementById('aiScore');
const playerMeeplesEl = document.getElementById('playerMeeples');
const aiMeeplesEl     = document.getElementById('aiMeeples');
const tilesLeftEl     = document.getElementById('tilesLeft');
const turnInfoEl      = document.getElementById('turnInfo');
const statusEl        = document.getElementById('statusText');
const btnRotate       = document.getElementById('btnRotate');
const btnSkip         = document.getElementById('btnSkip');

// ── Tile definitions ──
const TILE_DEFS = [
  { id:'field',        count:4,  edges:['F','F','F','F'], features:[{type:'field',   edges:[0,1,2,3]}] },
  { id:'city_one',     count:5,  edges:['C','F','F','F'], features:[{type:'city',    edges:[0]},{type:'field',edges:[1,2,3]}] },
  { id:'city_two_opp', count:3,  edges:['C','F','C','F'], features:[{type:'city',    edges:[0]},{type:'city',edges:[2]},{type:'field',edges:[1,3]}] },
  { id:'city_two_adj', count:3,  edges:['C','C','F','F'], features:[{type:'city',    edges:[0,1]},{type:'field',edges:[2,3]}] },
  { id:'city_three',   count:3,  edges:['C','C','F','C'], features:[{type:'city',    edges:[0,1,3]},{type:'field',edges:[2]}] },
  { id:'city_full',    count:1,  edges:['C','C','C','C'], features:[{type:'city',    edges:[0,1,2,3]}] },
  { id:'road_straight',count:4,  edges:['F','R','F','R'], features:[{type:'road',    edges:[1,3]},{type:'field',edges:[0,2]}] },
  { id:'road_turn',    count:9,  edges:['F','F','R','R'], features:[{type:'road',    edges:[2,3]},{type:'field',edges:[0,1]}] },
  { id:'road_t',       count:4,  edges:['F','R','R','R'], features:[{type:'road',    edges:[1,2]},{type:'road',edges:[3]},{type:'field',edges:[0]}] },
  { id:'road_cross',   count:1,  edges:['R','R','R','R'], features:[{type:'road',    edges:[0,1]},{type:'road',edges:[2,3]}] },
  { id:'city_road',    count:3,  edges:['C','R','F','R'], features:[{type:'city',    edges:[0]},{type:'road',edges:[1,3]},{type:'field',edges:[2]}] },
  { id:'city_road_bend',count:3, edges:['C','F','R','R'], features:[{type:'city',    edges:[0]},{type:'road',edges:[2,3]},{type:'field',edges:[1]}] },
  { id:'monastery',    count:4,  edges:['F','F','F','F'], features:[{type:'monastery',edges:[]},{type:'field',edges:[0,1,2,3]}] },
  { id:'monastery_road',count:2, edges:['F','F','R','F'], features:[{type:'monastery',edges:[]},{type:'road',edges:[2]},{type:'field',edges:[0,1,3]}] },
];

// ── Game state ──
let gamePhase = 'waiting'; // 'waiting' | 'playing' | 'over'
let score = 0;
let board = {};
let tilePool = [];
let currentTile = null;
let currentPlayer = 0;
let players = [
  { score: 0, meeples: 7, color: '#48f' },
  { score: 0, meeples: 7, color: '#8d4' },
];
let phase = 'draw';
let validPlacements = [];
let hoverPos = null;
let viewOffsetX = 0, viewOffsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragViewStartX = 0, dragViewStartY = 0;
let featureGroups = [];
let nextFeatureId = 0;
let followerOptions = [];
let hoverFollower = -1;
let placedTilePos = null;
let leftDragStart = null;

// ── Helpers ──
function rotateEdges(edges, rot) {
  const r = ((rot % 4) + 4) % 4;
  const e = [...edges];
  for (let i = 0; i < r; i++) {
    const last = e.pop(); e.unshift(last);
  }
  return e;
}

function rotateFeatureEdges(featureEdges, rot) {
  const r = ((rot % 4) + 4) % 4;
  return featureEdges.map(e => (e + r) % 4);
}

function getEffectiveEdges(defIdx, rotation) {
  return rotateEdges(TILE_DEFS[defIdx].edges, rotation);
}

function boardKey(x, y) { return x + ',' + y; }

function getNeighbors(x, y) {
  return [
    { x, y: y - 1, edge: 0, oppEdge: 2 },
    { x: x + 1, y, edge: 1, oppEdge: 3 },
    { x, y: y + 1, edge: 2, oppEdge: 0 },
    { x: x - 1, y, edge: 3, oppEdge: 1 },
  ];
}

function buildTilePool() {
  tilePool = [];
  for (let i = 0; i < TILE_DEFS.length; i++) {
    for (let c = 0; c < TILE_DEFS[i].count; c++) tilePool.push(i);
  }
  for (let i = tilePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tilePool[i], tilePool[j]] = [tilePool[j], tilePool[i]];
  }
}

function drawTileFromPool() {
  if (tilePool.length === 0) return null;
  return tilePool.pop();
}

function getValidPlacements(defIdx, rotation) {
  const edges = getEffectiveEdges(defIdx, rotation);
  const candidates = new Set();
  if (Object.keys(board).length === 0) {
    candidates.add('0,0');
  }
  for (const key of Object.keys(board)) {
    const [bx, by] = key.split(',').map(Number);
    for (const n of getNeighbors(bx, by)) {
      if (!board[boardKey(n.x, n.y)]) candidates.add(boardKey(n.x, n.y));
    }
  }
  const valid = [];
  for (const key of candidates) {
    const [cx, cy] = key.split(',').map(Number);
    if (canPlaceAt(defIdx, rotation, cx, cy)) valid.push({ x: cx, y: cy });
  }
  return valid;
}

function canPlaceAt(defIdx, rotation, x, y) {
  if (board[boardKey(x, y)]) return false;
  const edges = getEffectiveEdges(defIdx, rotation);
  let hasNeighbor = false;
  for (const n of getNeighbors(x, y)) {
    const nb = board[boardKey(n.x, n.y)];
    if (nb) {
      hasNeighbor = true;
      const nbEdges = getEffectiveEdges(nb.defIdx, nb.rotation);
      if (edges[n.edge] !== nbEdges[n.oppEdge]) return false;
    }
  }
  return hasNeighbor || Object.keys(board).length === 0;
}

function placeTileOnBoard(defIdx, rotation, x, y) {
  const entry = { defIdx, rotation, followers: [] };
  board[boardKey(x, y)] = entry;

  const def = TILE_DEFS[defIdx];
  const tileFeatureIds = [];

  for (let fi = 0; fi < def.features.length; fi++) {
    const feat = def.features[fi];
    const rotEdges = rotateFeatureEdges(feat.edges, rotation);
    const fid = nextFeatureId++;
    featureGroups.push({ id: fid, type: feat.type, tiles: [{ x, y, featureIdx: fi }], owners: {}, complete: false, scored: false });
    tileFeatureIds.push(fid);
  }
  entry.featureIds = tileFeatureIds;

  for (const n of getNeighbors(x, y)) {
    const nb = board[boardKey(n.x, n.y)];
    if (!nb) continue;
    const edges = getEffectiveEdges(defIdx, rotation);
    const edgeType = edges[n.edge];
    if (edgeType === 'F') continue;

    const myFeatIdx = findFeatureForEdge(def, rotation, n.edge);
    if (myFeatIdx < 0) continue;
    const myGroupId = tileFeatureIds[myFeatIdx];

    const nbDef = TILE_DEFS[nb.defIdx];
    const nbFeatIdx = findFeatureForEdge(nbDef, nb.rotation, n.oppEdge);
    if (nbFeatIdx < 0) continue;
    const nbGroupId = nb.featureIds[nbFeatIdx];

    if (myGroupId !== nbGroupId) mergeFeatureGroups(myGroupId, nbGroupId);
  }
}

function findFeatureForEdge(def, rotation, edgeIdx) {
  for (let fi = 0; fi < def.features.length; fi++) {
    const feat = def.features[fi];
    const rotEdges = rotateFeatureEdges(feat.edges, rotation);
    if (rotEdges.includes(edgeIdx)) return fi;
  }
  return -1;
}

function mergeFeatureGroups(keepId, mergeId) {
  if (keepId === mergeId) return;
  const keepGroup = featureGroups.find(g => g.id === keepId);
  const mergeGroup = featureGroups.find(g => g.id === mergeId);
  if (!keepGroup || !mergeGroup) return;

  for (const t of mergeGroup.tiles) {
    if (!keepGroup.tiles.some(kt => kt.x === t.x && kt.y === t.y && kt.featureIdx === t.featureIdx)) {
      keepGroup.tiles.push(t);
    }
  }
  for (const [pid, count] of Object.entries(mergeGroup.owners)) {
    keepGroup.owners[pid] = (keepGroup.owners[pid] || 0) + count;
  }
  for (const key of Object.keys(board)) {
    const entry = board[key];
    if (entry.featureIds) {
      entry.featureIds = entry.featureIds.map(fid => fid === mergeId ? keepId : fid);
    }
  }
  const idx = featureGroups.indexOf(mergeGroup);
  if (idx >= 0) featureGroups.splice(idx, 1);
}

function getFeatureGroup(x, y, featureIdx) {
  const entry = board[boardKey(x, y)];
  if (!entry || !entry.featureIds) return null;
  const gid = entry.featureIds[featureIdx];
  return featureGroups.find(g => g.id === gid);
}

// ── Completion checks ──
function checkCompletions() {
  const completed = [];
  for (const group of featureGroups) {
    if (group.complete || group.scored || group.type === 'field') continue;
    if (group.type === 'monastery' && isMonasteryComplete(group)) { group.complete = true; completed.push(group); }
    else if (group.type === 'city' && isCityComplete(group)) { group.complete = true; completed.push(group); }
    else if (group.type === 'road' && isRoadComplete(group)) { group.complete = true; completed.push(group); }
  }
  return completed;
}

function isMonasteryComplete(group) {
  if (group.tiles.length === 0) return false;
  const { x, y } = group.tiles[0];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!board[boardKey(x + dx, y + dy)]) return false;
    }
  }
  return true;
}

function isCityComplete(group) {
  const uniqueTiles = getUniqueTilePositions(group);
  for (const { x, y } of uniqueTiles) {
    const entry = board[boardKey(x, y)];
    const edges = getEffectiveEdges(entry.defIdx, entry.rotation);
    const def = TILE_DEFS[entry.defIdx];
    for (let fi = 0; fi < def.features.length; fi++) {
      const gid = entry.featureIds[fi];
      const grp = featureGroups.find(g => g.id === gid);
      if (grp !== group || def.features[fi].type !== 'city') continue;
      const rotEdges = rotateFeatureEdges(def.features[fi].edges, entry.rotation);
      for (const edgeIdx of rotEdges) {
        if (edges[edgeIdx] === 'C') {
          const neighbors = getNeighbors(x, y);
          const n = neighbors[edgeIdx];
          if (!board[boardKey(n.x, n.y)]) return false;
        }
      }
    }
  }
  return true;
}

function isRoadComplete(group) {
  const uniqueTiles = getUniqueTilePositions(group);
  let openEnds = 0;
  for (const { x, y } of uniqueTiles) {
    const entry = board[boardKey(x, y)];
    const edges = getEffectiveEdges(entry.defIdx, entry.rotation);
    const def = TILE_DEFS[entry.defIdx];
    for (let fi = 0; fi < def.features.length; fi++) {
      const gid = entry.featureIds[fi];
      const grp = featureGroups.find(g => g.id === gid);
      if (grp !== group || def.features[fi].type !== 'road') continue;
      const rotEdges = rotateFeatureEdges(def.features[fi].edges, entry.rotation);
      for (const edgeIdx of rotEdges) {
        if (edges[edgeIdx] === 'R') {
          const neighbors = getNeighbors(x, y);
          const n = neighbors[edgeIdx];
          if (!board[boardKey(n.x, n.y)]) openEnds++;
        }
      }
    }
  }
  return openEnds === 0;
}

function getUniqueTilePositions(group) {
  const seen = new Set();
  const result = [];
  for (const t of group.tiles) {
    const key = t.x + ',' + t.y;
    if (!seen.has(key)) { seen.add(key); result.push({ x: t.x, y: t.y }); }
  }
  return result;
}

// ── Scoring ──
function scoreFeature(group, endGame = false) {
  if (group.scored) return;
  group.scored = true;
  const uniqueTiles = getUniqueTilePositions(group);
  let points = 0;
  if (group.type === 'city') points = uniqueTiles.length * (endGame ? 1 : 2);
  else if (group.type === 'road') points = uniqueTiles.length;
  else if (group.type === 'monastery') {
    const { x, y } = group.tiles[0];
    let count = 1;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (board[boardKey(x + dx, y + dy)]) count++;
      }
    }
    points = count;
  }
  if (points === 0) return;

  const entries = Object.entries(group.owners).map(([pid, cnt]) => ({ pid: Number(pid), cnt }));
  if (entries.length === 0) return;
  const maxCnt = Math.max(...entries.map(e => e.cnt));
  const winners = entries.filter(e => e.cnt === maxCnt);
  for (const w of winners) players[w.pid].score += points;
  returnFollowers(group);
}

function returnFollowers(group) {
  for (const t of group.tiles) {
    const entry = board[boardKey(t.x, t.y)];
    if (!entry) continue;
    entry.followers = entry.followers.filter(f => {
      if (f.featureIdx === t.featureIdx) { players[f.player].meeples++; return false; }
      return true;
    });
  }
}

function scoreEndGame() {
  for (const group of featureGroups) {
    if (group.scored || group.type === 'field') continue;
    if (Object.keys(group.owners).length === 0) continue;
    scoreFeature(group, true);
  }
}

// ── Follower placement ──
function getFollowerOptions(x, y) {
  const entry = board[boardKey(x, y)];
  if (!entry) return [];
  const def = TILE_DEFS[entry.defIdx];
  const options = [];
  for (let fi = 0; fi < def.features.length; fi++) {
    const feat = def.features[fi];
    if (feat.type === 'field') continue;
    const group = getFeatureGroup(x, y, fi);
    if (!group || group.complete || group.scored) continue;
    if (Object.keys(group.owners).length > 0) continue;
    options.push({ featureIdx: fi, type: feat.type, group });
  }
  return options;
}

function placeFollower(x, y, featureIdx, playerIdx) {
  const entry = board[boardKey(x, y)];
  if (!entry || players[playerIdx].meeples <= 0) return false;
  const group = getFeatureGroup(x, y, featureIdx);
  if (!group) return false;
  entry.followers.push({ featureIdx, player: playerIdx });
  players[playerIdx].meeples--;
  group.owners[playerIdx] = (group.owners[playerIdx] || 0) + 1;
  return true;
}

// ── Coordinate helpers ──
function worldToScreen(wx, wy) {
  const cx = W / 2 + viewOffsetX;
  const cy = H / 2 + viewOffsetY;
  return { sx: cx + wx * TILE_SIZE, sy: cy + wy * TILE_SIZE };
}

function screenToWorld(sx, sy) {
  const cx = W / 2 + viewOffsetX;
  const cy = H / 2 + viewOffsetY;
  return {
    wx: Math.floor((sx - cx) / TILE_SIZE + 0.5),
    wy: Math.floor((sy - cy) / TILE_SIZE + 0.5),
  };
}

function getFeatureCenter(x, y, featureIdx, defIdx, rotation) {
  const def = TILE_DEFS[defIdx];
  const feat = def.features[featureIdx];
  const rotEdges = rotateFeatureEdges(feat.edges, rotation);
  if (feat.type === 'monastery') return { fx: 0, fy: 0 };
  if (rotEdges.length === 0) return { fx: 0, fy: 0 };
  const edgeCenters = {
    0: { x: 0, y: -0.3 }, 1: { x: 0.3, y: 0 }, 2: { x: 0, y: 0.3 }, 3: { x: -0.3, y: 0 }
  };
  let fx = 0, fy = 0;
  for (const e of rotEdges) { fx += edgeCenters[e].x; fy += edgeCenters[e].y; }
  fx /= rotEdges.length; fy /= rotEdges.length;
  return { fx, fy };
}

// ── Drawing helpers (WebGL renderer) ──

// Draw a filled polygon with absolute coords (no ctx.translate needed)
function fillPolyAbs(renderer, pts, color) {
  renderer.fillPoly(pts.map(p => ({ x: p.x, y: p.y })), color);
}

function strokePolyAbs(renderer, pts, color, width, closed) {
  renderer.strokePoly(pts.map(p => ({ x: p.x, y: p.y })), color, width, closed);
}

function drawTileAt(renderer, text, defIdx, rotation, sx, sy, size, alpha) {
  const def = TILE_DEFS[defIdx];
  const edges = getEffectiveEdges(defIdx, rotation);

  const s = size;
  const hs = s / 2;

  // Alpha suffix for colors
  const a = Math.round((alpha !== undefined ? alpha : 1) * 255).toString(16).padStart(2, '0');

  const fieldColor  = `#2a4a20${a}`;
  const cityColor   = `#c99660${a}`;
  const roadColor   = `#999999${a}`;
  const borderColor = `#555555${a}`;
  const monColor    = `#996644${a}`;
  const crossColor  = `#ffcc88${a}`;
  const roadDotColor= `#777777${a}`;

  // Background field
  renderer.fillRect(sx - hs, sy - hs, s, s, fieldColor);

  // Draw city wedges for each city edge
  for (let i = 0; i < 4; i++) {
    if (edges[i] !== 'C') continue;
    let pts;
    switch (i) {
      case 0: pts = [{x:sx-hs,y:sy-hs},{x:sx+hs,y:sy-hs},{x:sx+hs*0.4,y:sy-hs*0.2},{x:sx-hs*0.4,y:sy-hs*0.2}]; break;
      case 1: pts = [{x:sx+hs,y:sy-hs},{x:sx+hs,y:sy+hs},{x:sx+hs*0.2,y:sy+hs*0.4},{x:sx+hs*0.2,y:sy-hs*0.4}]; break;
      case 2: pts = [{x:sx-hs,y:sy+hs},{x:sx+hs,y:sy+hs},{x:sx+hs*0.4,y:sy+hs*0.2},{x:sx-hs*0.4,y:sy+hs*0.2}]; break;
      case 3: pts = [{x:sx-hs,y:sy-hs},{x:sx-hs,y:sy+hs},{x:sx-hs*0.2,y:sy+hs*0.4},{x:sx-hs*0.2,y:sy-hs*0.4}]; break;
    }
    fillPolyAbs(renderer, pts, cityColor);
  }

  // Fill city center connections
  const cityEdges = [];
  for (let i = 0; i < 4; i++) { if (edges[i] === 'C') cityEdges.push(i); }
  if (cityEdges.length >= 2) {
    const features = def.features;
    for (const feat of features) {
      if (feat.type !== 'city') continue;
      const rotEdges = rotateFeatureEdges(feat.edges, rotation);
      if (rotEdges.length >= 2) {
        if (rotEdges.length === 4) {
          renderer.fillRect(sx - hs, sy - hs, s, s, cityColor);
        } else if (rotEdges.length === 3) {
          renderer.fillRect(sx - hs * 0.6, sy - hs * 0.6, s * 0.6, s * 0.6, cityColor);
          for (const e of rotEdges) {
            switch (e) {
              case 0: renderer.fillRect(sx - hs * 0.4, sy - hs, hs * 0.8, hs * 0.8, cityColor); break;
              case 1: renderer.fillRect(sx + hs * 0.2, sy - hs * 0.4, hs * 0.8, hs * 0.8, cityColor); break;
              case 2: renderer.fillRect(sx - hs * 0.4, sy + hs * 0.2, hs * 0.8, hs * 0.8, cityColor); break;
              case 3: renderer.fillRect(sx - hs, sy - hs * 0.4, hs * 0.8, hs * 0.8, cityColor); break;
            }
          }
        } else if (rotEdges.length === 2) {
          const [ea, eb] = rotEdges;
          if ((ea + 1) % 4 === eb || (eb + 1) % 4 === ea) {
            // Adjacent edges - fill corner
            const corners = {
              '0,1': [sx - hs * 0.4, sy - hs * 0.4, hs * 1.4, hs * 0.8],
              '1,2': [sx + hs * 0.2 - hs * 0.4, sy - hs * 0.4, hs * 0.8, hs * 1.4],
              '2,3': [sx - hs, sy + hs * 0.2 - hs * 0.4, hs * 1.4, hs * 0.8],
              '3,0': [sx - hs * 0.4, sy - hs, hs * 0.8, hs * 1.4],
              '1,0': [sx - hs * 0.4, sy - hs * 0.4, hs * 1.4, hs * 0.8],
              '2,1': [sx + hs * 0.2 - hs * 0.4, sy - hs * 0.4, hs * 0.8, hs * 1.4],
              '3,2': [sx - hs, sy + hs * 0.2 - hs * 0.4, hs * 1.4, hs * 0.8],
              '0,3': [sx - hs * 0.4, sy - hs, hs * 0.8, hs * 1.4],
            };
            const key = ea + ',' + eb;
            if (corners[key]) {
              const [rx, ry, rw, rh] = corners[key];
              renderer.fillRect(rx, ry, rw, rh, cityColor);
            }
          }
        }
      }
    }
  }

  // Draw roads
  const roadW = Math.max(2, s / 8);
  const roadPts = {
    0: { x: sx, y: sy - hs },
    1: { x: sx + hs, y: sy },
    2: { x: sx, y: sy + hs },
    3: { x: sx - hs, y: sy },
  };

  for (const feat of def.features) {
    if (feat.type !== 'road') continue;
    const rotEdges = rotateFeatureEdges(feat.edges, rotation);
    if (rotEdges.length === 2) {
      // Road through center
      renderer.drawLine(roadPts[rotEdges[0]].x, roadPts[rotEdges[0]].y, sx, sy, roadColor, roadW);
      renderer.drawLine(sx, sy, roadPts[rotEdges[1]].x, roadPts[rotEdges[1]].y, roadColor, roadW);
    } else if (rotEdges.length === 1) {
      renderer.drawLine(roadPts[rotEdges[0]].x, roadPts[rotEdges[0]].y, sx, sy, roadColor, roadW);
      // Road end dot
      renderer.fillCircle(sx, sy, s / 10, roadDotColor);
    }
  }

  // Draw monastery
  if (def.id === 'monastery' || def.id === 'monastery_road') {
    renderer.fillRect(sx - s * 0.2, sy - s * 0.2, s * 0.4, s * 0.4, monColor);
    // Cross: vertical and horizontal bars
    renderer.fillRect(sx - s * 0.02, sy - s * 0.15, s * 0.04, s * 0.3, crossColor);
    renderer.fillRect(sx - s * 0.1, sy - s * 0.06, s * 0.2, s * 0.04, crossColor);
  }

  // Tile border
  renderer.drawLine(sx - hs, sy - hs, sx + hs, sy - hs, borderColor, 0.5);
  renderer.drawLine(sx + hs, sy - hs, sx + hs, sy + hs, borderColor, 0.5);
  renderer.drawLine(sx + hs, sy + hs, sx - hs, sy + hs, borderColor, 0.5);
  renderer.drawLine(sx - hs, sy + hs, sx - hs, sy - hs, borderColor, 0.5);
}

function drawMeeple(renderer, sx, sy, color, size) {
  const s = size || 8;
  // Head circle
  renderer.fillCircle(sx, sy - s * 0.5, s * 0.35, color);
  // Body trapezoid
  const bodyPts = [
    { x: sx - s * 0.5, y: sy + s * 0.5 },
    { x: sx - s * 0.3, y: sy - s * 0.1 },
    { x: sx, y: sy + s * 0.1 },
    { x: sx + s * 0.3, y: sy - s * 0.1 },
    { x: sx + s * 0.5, y: sy + s * 0.5 },
  ];
  renderer.fillPoly(bodyPts, color);
  // Outline
  renderer.strokePoly(bodyPts, '#000000', 0.5, true);
}

// ── AI ──
function evaluateAIMove(defIdx, rotation, x, y) {
  let score = 0;
  const edges = getEffectiveEdges(defIdx, rotation);
  for (const n of getNeighbors(x, y)) {
    const nb = board[boardKey(n.x, n.y)];
    if (nb) {
      const nbEdges = getEffectiveEdges(nb.defIdx, nb.rotation);
      if (edges[n.edge] === 'C' && nbEdges[n.oppEdge] === 'C') {
        const nbDef = TILE_DEFS[nb.defIdx];
        const nbFeatIdx = findFeatureForEdge(nbDef, nb.rotation, n.oppEdge);
        if (nbFeatIdx >= 0) {
          const group = getFeatureGroup(n.x, n.y, nbFeatIdx);
          if (group) {
            if (group.owners[1] > 0 && !group.owners[0]) score += 5;
            else if (group.owners[0] > 0 && !group.owners[1]) score -= 1;
            else score += 2;
          }
        }
        score += 3;
      }
      if (edges[n.edge] === 'R' && nbEdges[n.oppEdge] === 'R') score += 1;
    }
  }
  const def = TILE_DEFS[defIdx];
  if (def.id === 'monastery' || def.id === 'monastery_road') {
    let neighbors = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (board[boardKey(x + dx, y + dy)]) neighbors++;
      }
    }
    score += neighbors * 0.5;
  }
  const tilesPlaced = Object.keys(board).length;
  if (tilesPlaced < 15) score -= (Math.abs(x) + Math.abs(y)) * 0.1;
  score += Math.random() * 0.5;
  return score;
}

function aiPlaceFollower(x, y) {
  if (players[1].meeples <= 0) return;
  const options = getFollowerOptions(x, y);
  if (options.length === 0) return;
  let bestOpt = null, bestVal = -1;
  for (const opt of options) {
    let val = 0;
    const tiles = getUniqueTilePositions(opt.group);
    if (opt.type === 'city') { val = tiles.length * 2 + 3; if (tiles.length >= 3) val += 3; }
    else if (opt.type === 'road') val = tiles.length + 1;
    else if (opt.type === 'monastery') {
      const { x: mx, y: my } = opt.group.tiles[0];
      let nbCount = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (board[boardKey(mx + dx, my + dy)]) nbCount++;
        }
      }
      val = nbCount + 2;
      if (nbCount >= 5) val += 5;
    }
    if (players[1].meeples <= 2 && val < 4) continue;
    if (val > bestVal) { bestVal = val; bestOpt = opt; }
  }
  if (bestOpt && bestVal >= 2) placeFollower(x, y, bestOpt.featureIdx, 1);
}

function aiTurn() {
  if (gamePhase !== 'playing') return;
  phase = 'ai_turn';
  turnInfoEl.textContent = 'AI thinking...';
  statusEl.textContent = 'AI is placing a tile...';

  setTimeout(() => {
    const defIdx = drawTileFromPool();
    if (defIdx === null) { endGame(); return; }

    let bestScore = -Infinity, bestMove = null;
    for (let rot = 0; rot < 4; rot++) {
      const valid = getValidPlacements(defIdx, rot);
      for (const pos of valid) {
        const mv = evaluateAIMove(defIdx, rot, pos.x, pos.y);
        if (mv > bestScore) { bestScore = mv; bestMove = { rot, x: pos.x, y: pos.y }; }
      }
    }
    if (!bestMove) { statusEl.textContent = 'AI could not place tile. Skipping.'; setTimeout(() => nextTurn(), 500); return; }

    currentTile = { defIdx, rotation: bestMove.rot };
    placeTileOnBoard(defIdx, bestMove.rot, bestMove.x, bestMove.y);
    placedTilePos = { x: bestMove.x, y: bestMove.y };

    const completed = checkCompletions();
    for (const group of completed) scoreFeature(group);

    setTimeout(() => {
      aiPlaceFollower(bestMove.x, bestMove.y);
      const completed2 = checkCompletions();
      for (const group of completed2) scoreFeature(group);
      setTimeout(() => nextTurn(), 400);
    }, 300);
  }, 400);
}

// ── Game flow ──
function initGame() {
  board = {};
  tilePool = [];
  featureGroups = [];
  nextFeatureId = 0;
  currentPlayer = 0;
  players[0].score = 0; players[0].meeples = 7;
  players[1].score = 0; players[1].meeples = 7;
  score = 0;
  viewOffsetX = 0; viewOffsetY = 0;
  phase = 'draw';
  currentTile = null;
  validPlacements = [];
  hoverPos = null;
  followerOptions = [];
  hoverFollower = -1;
  placedTilePos = null;

  buildTilePool();
  placeTileOnBoard(10, 0, 0, 0); // city_road as start tile

  gamePhase = 'playing';
  btnRotate.disabled = false;
  startPlayerTurn();
}

function startPlayerTurn() {
  currentPlayer = 0;
  turnInfoEl.textContent = 'Your turn';

  const defIdx = drawTileFromPool();
  if (defIdx === null) { endGame(); return; }

  currentTile = { defIdx, rotation: 0 };
  phase = 'place';

  let canPlace = false;
  for (let r = 0; r < 4; r++) {
    if (getValidPlacements(defIdx, r).length > 0) { canPlace = true; break; }
  }
  if (!canPlace) {
    statusEl.textContent = 'Tile cannot be placed anywhere. Drawing new tile...';
    setTimeout(() => startPlayerTurn(), 800);
    return;
  }
  updateValidPlacements();
  statusEl.textContent = 'Place your tile. Press R to rotate.';
  btnSkip.disabled = true;
}

function updateValidPlacements() {
  if (currentTile) validPlacements = getValidPlacements(currentTile.defIdx, currentTile.rotation);
}

function nextTurn() {
  currentTile = null;
  placedTilePos = null;
  followerOptions = [];
  phase = 'draw';

  if (tilePool.length === 0) { endGame(); return; }
  if (currentPlayer === 0) { currentPlayer = 1; aiTurn(); }
  else { startPlayerTurn(); }
}

function endGame() {
  gamePhase = 'over';
  phase = 'draw';
  scoreEndGame();

  const p = players[0].score;
  const ai = players[1].score;
  score = p;
  btnRotate.disabled = true;
  btnSkip.disabled = true;
  statusEl.textContent = '';
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('TILE KINGDOMS', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Canvas mouse events (direct, as per pattern for mouse-driven games)
  const canvas = game.canvas;

  canvas.addEventListener('mousedown', (e) => {
    if (gamePhase === 'waiting') return;
    if (gamePhase === 'over') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (e.button === 1 || e.button === 2) {
      isDragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragViewStartX = viewOffsetX; dragViewStartY = viewOffsetY;
      e.preventDefault();
      return;
    }

    if (phase === 'place' && currentPlayer === 0) {
      const world = screenToWorld(mx, my);
      const isValid = validPlacements.some(v => v.x === world.wx && v.y === world.wy);
      if (isValid) {
        placeTileOnBoard(currentTile.defIdx, currentTile.rotation, world.wx, world.wy);
        placedTilePos = { x: world.wx, y: world.wy };
        const completed = checkCompletions();
        for (const group of completed) scoreFeature(group);
        followerOptions = getFollowerOptions(world.wx, world.wy);
        if (followerOptions.length > 0 && players[0].meeples > 0) {
          phase = 'follower';
          statusEl.textContent = 'Click a feature to place follower, or Skip.';
          btnSkip.disabled = false;
        } else {
          phase = 'draw';
          setTimeout(() => nextTurn(), 200);
        }
      }
    } else if (phase === 'follower' && currentPlayer === 0 && placedTilePos) {
      const entry = board[boardKey(placedTilePos.x, placedTilePos.y)];
      const { sx, sy } = worldToScreen(placedTilePos.x, placedTilePos.y);
      for (let i = 0; i < followerOptions.length; i++) {
        const opt = followerOptions[i];
        const { fx, fy } = getFeatureCenter(placedTilePos.x, placedTilePos.y, opt.featureIdx, entry.defIdx, entry.rotation);
        const px = sx + fx * TILE_SIZE;
        const py = sy + fy * TILE_SIZE;
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < 12) {
          placeFollower(placedTilePos.x, placedTilePos.y, opt.featureIdx, 0);
          phase = 'draw';
          btnSkip.disabled = true;
          statusEl.textContent = '';
          setTimeout(() => nextTurn(), 200);
          return;
        }
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (gamePhase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (isDragging) {
      viewOffsetX = dragViewStartX + (e.clientX - dragStartX);
      viewOffsetY = dragViewStartY + (e.clientY - dragStartY);
      return;
    }

    if (phase === 'place' && currentPlayer === 0) {
      hoverPos = screenToWorld(mx, my);
    } else if (phase === 'follower' && currentPlayer === 0 && placedTilePos) {
      const entry = board[boardKey(placedTilePos.x, placedTilePos.y)];
      const { sx, sy } = worldToScreen(placedTilePos.x, placedTilePos.y);
      hoverFollower = -1;
      for (let i = 0; i < followerOptions.length; i++) {
        const opt = followerOptions[i];
        const { fx, fy } = getFeatureCenter(placedTilePos.x, placedTilePos.y, opt.featureIdx, entry.defIdx, entry.rotation);
        const px = sx + fx * TILE_SIZE;
        const py = sy + fy * TILE_SIZE;
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < 12) { hoverFollower = i; break; }
      }
    }
  });

  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; hoverPos = null; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Left-drag to pan
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gamePhase === 'playing') {
      leftDragStart = { x: e.clientX, y: e.clientY, vx: viewOffsetX, vy: viewOffsetY, moved: false };
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (leftDragStart && !isDragging) {
      const dx = e.clientX - leftDragStart.x;
      const dy = e.clientY - leftDragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        leftDragStart.moved = true;
        viewOffsetX = leftDragStart.vx + dx;
        viewOffsetY = leftDragStart.vy + dy;
      }
    }
  });
  canvas.addEventListener('mouseup', (e) => {
    if (leftDragStart) {
      if (leftDragStart.moved) e.stopImmediatePropagation?.();
      leftDragStart = null;
    }
  }, true);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (gamePhase === 'waiting') {
      if (e.key === 'Enter' || e.key === ' ') {
        initGame();
        game.setState('playing');
      }
      return;
    }
    if (gamePhase === 'over') {
      if (e.key === 'Enter' || e.key === ' ') {
        initGame();
        game.setState('playing');
      }
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (phase === 'place' && currentPlayer === 0 && currentTile) {
        currentTile.rotation = (currentTile.rotation + 1) % 4;
        updateValidPlacements();
      }
    }
  });

  btnRotate.addEventListener('click', () => {
    if (phase === 'place' && currentPlayer === 0 && currentTile) {
      currentTile.rotation = (currentTile.rotation + 1) % 4;
      updateValidPlacements();
    }
  });

  btnSkip.addEventListener('click', () => {
    if (phase === 'follower' && currentPlayer === 0) {
      phase = 'draw';
      btnSkip.disabled = true;
      statusEl.textContent = '';
      setTimeout(() => nextTurn(), 200);
    }
  });

  // Overlay click to start/restart
  const overlay = document.getElementById('overlay');
  overlay.style.cursor = 'pointer';
  overlay.style.pointerEvents = 'auto';
  overlay.addEventListener('click', () => {
    if (gamePhase === 'waiting' || gamePhase === 'over') {
      initGame();
      game.setState('playing');
    }
  });

  game.onUpdate = () => {
    // Update DOM elements each frame
    scoreEl.textContent = players[0].score;
    aiScoreEl.textContent = players[1].score;
    playerMeeplesEl.textContent = players[0].meeples;
    aiMeeplesEl.textContent = players[1].meeples;
    tilesLeftEl.textContent = tilePool.length;

    // Sync game state when over
    if (gamePhase === 'over' && game.state !== 'over') {
      const p = players[0].score;
      const ai = players[1].score;
      const title = p > ai ? 'YOU WIN!' : (p < ai ? 'AI WINS!' : 'TIE GAME!');
      const msg = `Final Score: You ${p} - AI ${ai}\nClick to play again`;
      game.showOverlay(title, msg);
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    if (gamePhase === 'waiting') return;

    // Grid dots
    for (let gx = -20; gx <= 20; gx++) {
      for (let gy = -20; gy <= 20; gy++) {
        const { sx, sy } = worldToScreen(gx, gy);
        if (sx >= -TILE_SIZE && sx <= W + TILE_SIZE && sy >= -TILE_SIZE && sy <= H + TILE_SIZE) {
          renderer.fillRect(sx - 1, sy - 1, 2, 2, '#8dd44414');
        }
      }
    }

    // Valid placement highlights
    if (phase === 'place' && currentPlayer === 0) {
      for (const vp of validPlacements) {
        const { sx, sy } = worldToScreen(vp.x, vp.y);
        renderer.fillRect(sx - TILE_SIZE / 2, sy - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, '#88dd441f');
        renderer.drawLine(sx - TILE_SIZE/2, sy - TILE_SIZE/2, sx + TILE_SIZE/2, sy - TILE_SIZE/2, '#88dd444d', 1);
        renderer.drawLine(sx + TILE_SIZE/2, sy - TILE_SIZE/2, sx + TILE_SIZE/2, sy + TILE_SIZE/2, '#88dd444d', 1);
        renderer.drawLine(sx + TILE_SIZE/2, sy + TILE_SIZE/2, sx - TILE_SIZE/2, sy + TILE_SIZE/2, '#88dd444d', 1);
        renderer.drawLine(sx - TILE_SIZE/2, sy + TILE_SIZE/2, sx - TILE_SIZE/2, sy - TILE_SIZE/2, '#88dd444d', 1);
      }
    }

    // Placed tiles
    for (const key of Object.keys(board)) {
      const [bx, by] = key.split(',').map(Number);
      const entry = board[key];
      const { sx, sy } = worldToScreen(bx, by);
      if (sx < -TILE_SIZE || sx > W + TILE_SIZE || sy < -TILE_SIZE || sy > H + TILE_SIZE) continue;
      drawTileAt(renderer, text, entry.defIdx, entry.rotation, sx, sy, TILE_SIZE, 1);
      for (const f of entry.followers) {
        const { fx, fy } = getFeatureCenter(bx, by, f.featureIdx, entry.defIdx, entry.rotation);
        drawMeeple(renderer, sx + fx * TILE_SIZE, sy + fy * TILE_SIZE, players[f.player].color, 7);
      }
    }

    // Hover preview
    if (phase === 'place' && currentPlayer === 0 && hoverPos && currentTile) {
      const isValid = validPlacements.some(v => v.x === hoverPos.wx && v.y === hoverPos.wy);
      if (isValid) {
        const { sx, sy } = worldToScreen(hoverPos.wx, hoverPos.wy);
        drawTileAt(renderer, text, currentTile.defIdx, currentTile.rotation, sx, sy, TILE_SIZE, 0.6);
      }
    }

    // Follower options
    if (phase === 'follower' && currentPlayer === 0 && placedTilePos) {
      const entry = board[boardKey(placedTilePos.x, placedTilePos.y)];
      const { sx, sy } = worldToScreen(placedTilePos.x, placedTilePos.y);
      for (let i = 0; i < followerOptions.length; i++) {
        const opt = followerOptions[i];
        const { fx, fy } = getFeatureCenter(placedTilePos.x, placedTilePos.y, opt.featureIdx, entry.defIdx, entry.rotation);
        const mx = sx + fx * TILE_SIZE;
        const my = sy + fy * TILE_SIZE;
        const circleColor = i === hoverFollower ? '#4488ff80' : '#4488ff40';
        renderer.fillCircle(mx, my, 8, circleColor);
        // Circle outline via strokePoly approximation (8-gon)
        const pts = [];
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2;
          pts.push({ x: mx + Math.cos(angle) * 8, y: my + Math.sin(angle) * 8 });
        }
        renderer.strokePoly(pts, '#4488ff', 1.5, true);
        // Feature type initial
        text.drawText(opt.type[0].toUpperCase(), mx, my - 4, 10, '#ffffff', 'center');
      }
    }

    // Next tile preview (top-right corner)
    if (currentTile && phase !== 'follower') {
      renderer.fillRect(W - 75, 5, 70, 70, '#16213eE6');
      // Border
      renderer.drawLine(W - 75, 5, W - 5, 5, '#8d4', 1);
      renderer.drawLine(W - 5, 5, W - 5, 75, '#8d4', 1);
      renderer.drawLine(W - 5, 75, W - 75, 75, '#8d4', 1);
      renderer.drawLine(W - 75, 75, W - 75, 5, '#8d4', 1);
      drawTileAt(renderer, text, currentTile.defIdx, currentTile.rotation, W - 40, 40, 50, 1);
      text.drawText('Next Tile', W - 40, 62, 9, '#888888', 'center');
    }
  };

  game.start();
  return game;
}
