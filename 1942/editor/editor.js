// 1942 Level Editor — Standalone HTML5 Canvas + ES Modules
// No dependencies, no build tools.

// ── Tile Palettes (matching game's TILE_PALETTES) ──
const PALETTES = {
  coral_front: {
    water: { 0: '#1c5d8f', 1: '#2980b9', 2: '#19466b', 3: '#7ee8ff' },
    terrain: { 0: 'transparent', 1: '#e6c88a', 2: '#5daa5d', 3: '#8b8680', 4: '#707070' },
    clouds: { 0: 'transparent', 1: 'rgba(255,255,255,0.15)', 2: 'rgba(255,255,255,0.3)', 3: 'rgba(200,210,230,0.25)' },
  },
  jungle_spear: {
    water: { 0: '#3a6a4f', 1: '#4d8c65', 2: '#25442f', 3: '#8ed4a0' },
    terrain: { 0: 'transparent', 1: '#8b7355', 2: '#2d6e2d', 3: '#6b6b60', 4: '#555550' },
    clouds: { 0: 'transparent', 1: 'rgba(200,230,200,0.12)', 2: 'rgba(200,230,200,0.25)', 3: 'rgba(150,180,150,0.2)' },
  },
  dust_convoy: {
    water: { 0: '#91643d', 1: '#b8884d', 2: '#68452b', 3: '#d4a860' },
    terrain: { 0: 'transparent', 1: '#d4a860', 2: '#a08050', 3: '#8b7355', 4: '#808080' },
    clouds: { 0: 'transparent', 1: 'rgba(255,240,200,0.12)', 2: 'rgba(255,240,200,0.25)', 3: 'rgba(220,200,160,0.2)' },
  },
  iron_monsoon: {
    water: { 0: '#2e3455', 1: '#3d4570', 2: '#1d2238', 3: '#6070a0' },
    terrain: { 0: 'transparent', 1: '#606878', 2: '#4a5260', 3: '#555d6b', 4: '#707880' },
    clouds: { 0: 'transparent', 1: 'rgba(180,190,210,0.15)', 2: 'rgba(150,160,180,0.3)', 3: 'rgba(100,110,130,0.35)' },
  },
};

const TILE_NAMES = {
  water: { 0: 'deep', 1: 'shallow', 2: 'dark', 3: 'foam' },
  terrain: { 0: 'empty', 1: 'sand', 2: 'grass', 3: 'rock', 4: 'structure' },
  clouds: { 0: 'empty', 1: 'thin', 2: 'thick', 3: 'storm' },
};

const COLS = 15;
const TILE_SIZE = 64;
const DEFAULT_ROWS = 150;

// ── State ──
let state = {
  campaign: 'coral_front',
  rows: DEFAULT_ROWS,
  layers: { water: null, terrain: null, clouds: null },
  activeLayer: 'water',
  selectedTile: 0,
  tool: 'brush',
  showGrid: true,
  zoom: 1,
  scrollY: 0,
  painting: false,
  undoStack: [],
  redoStack: [],
  layerVisibility: { water: true, terrain: true, clouds: true },
};

// ── DOM refs ──
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const paletteDiv = document.getElementById('palette');
const statusText = document.getElementById('statusText');
const posInfo = document.getElementById('posInfo');
const layerInfo = document.getElementById('layerInfo');
const tileInfo = document.getElementById('tileInfo');
const zoomInfo = document.getElementById('zoomInfo');

// ── Init ──
function newLevel(campaign, rows) {
  state.campaign = campaign;
  state.rows = rows || DEFAULT_ROWS;
  state.layers.water = new Int8Array(COLS * state.rows).fill(0);
  state.layers.terrain = new Int8Array(COLS * state.rows).fill(0);
  state.layers.clouds = new Int8Array(COLS * state.rows).fill(0);
  // Fill water layer with deep water by default
  state.layers.water.fill(0); // 0 = deep water
  state.undoStack = [];
  state.redoStack = [];
  state.scrollY = 0;
  resizeCanvas();
  buildPalette();
  render();
  setStatus(`New level: ${campaign} (${COLS}×${rows})`);
}

function resizeCanvas() {
  const w = COLS * TILE_SIZE * state.zoom;
  const h = state.rows * TILE_SIZE * state.zoom;
  canvas.width = Math.max(w, container.clientWidth);
  canvas.height = h;
}

// ── Palette ──
function buildPalette() {
  paletteDiv.innerHTML = '';
  const layer = state.activeLayer;
  const pal = PALETTES[state.campaign][layer];
  const names = TILE_NAMES[layer];
  for (const [id, color] of Object.entries(pal)) {
    const div = document.createElement('div');
    div.className = 'palette-tile' + (parseInt(id) === state.selectedTile ? ' selected' : '');
    div.style.background = color === 'transparent'
      ? 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 16px 16px'
      : color;
    div.innerHTML = `<span class="label">${names[id] || id}</span>`;
    div.addEventListener('click', () => {
      state.selectedTile = parseInt(id);
      buildPalette();
    });
    paletteDiv.appendChild(div);
  }
}

// ── Render ──
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const z = state.zoom;
  const ts = TILE_SIZE * z;

  // Draw each visible layer
  for (const layerName of ['water', 'terrain', 'clouds']) {
    if (!state.layerVisibility[layerName]) continue;
    const data = state.layers[layerName];
    if (!data) continue;
    const pal = PALETTES[state.campaign][layerName];
    const isActive = layerName === state.activeLayer;
    const alpha = isActive ? 1.0 : 0.5;

    ctx.globalAlpha = alpha;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tileId = data[r * COLS + c];
        const color = pal[tileId];
        if (!color || color === 'transparent') continue;
        ctx.fillStyle = color;
        ctx.fillRect(c * ts, r * ts, ts, ts);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Grid overlay
  if (state.showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * ts, 0);
      ctx.lineTo(c * ts, state.rows * ts);
      ctx.stroke();
    }
    for (let r = 0; r <= state.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ts);
      ctx.lineTo(COLS * ts, r * ts);
      ctx.stroke();
    }
  }

  // Highlight hovered cell
  if (state._hoverCol >= 0 && state._hoverRow >= 0) {
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(state._hoverCol * ts + 1, state._hoverRow * ts + 1, ts - 2, ts - 2);
  }
}

// ── Undo/Redo ──
function pushUndo() {
  state.undoStack.push({
    layer: state.activeLayer,
    data: new Int8Array(state.layers[state.activeLayer]),
  });
  state.redoStack = [];
  if (state.undoStack.length > 200) state.undoStack.shift();
}

function undo() {
  if (!state.undoStack.length) return;
  const snap = state.undoStack.pop();
  state.redoStack.push({
    layer: snap.layer,
    data: new Int8Array(state.layers[snap.layer]),
  });
  state.layers[snap.layer] = snap.data;
  render();
  setStatus('Undo');
}

function redo() {
  if (!state.redoStack.length) return;
  const snap = state.redoStack.pop();
  state.undoStack.push({
    layer: snap.layer,
    data: new Int8Array(state.layers[snap.layer]),
  });
  state.layers[snap.layer] = snap.data;
  render();
  setStatus('Redo');
}

// ── Tools ──
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left + container.scrollLeft);
  const y = (e.clientY - rect.top + container.scrollTop);
  const ts = TILE_SIZE * state.zoom;
  return { col: Math.floor(x / ts), row: Math.floor(y / ts) };
}

function placeTile(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= state.rows) return;
  const idx = row * COLS + col;
  const layer = state.layers[state.activeLayer];
  const val = state.tool === 'eraser' ? 0 : state.selectedTile;
  if (layer[idx] === val) return;
  layer[idx] = val;
  render();
}

function floodFill(col, row) {
  const layer = state.layers[state.activeLayer];
  const target = layer[row * COLS + col];
  const replacement = state.selectedTile;
  if (target === replacement) return;

  const stack = [[col, row]];
  const visited = new Set();
  while (stack.length) {
    const [c, r] = stack.pop();
    if (c < 0 || c >= COLS || r < 0 || r >= state.rows) continue;
    const key = r * COLS + c;
    if (visited.has(key)) continue;
    if (layer[key] !== target) continue;
    visited.add(key);
    layer[key] = replacement;
    stack.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]);
  }
  render();
}

// ── Save/Load ──
function serializeLevel() {
  return JSON.stringify({
    version: 1,
    meta: {
      id: `${state.campaign}_custom`,
      name: `${state.campaign} (custom)`,
      campaign: state.campaign,
      cols: COLS,
      rows: state.rows,
      tileSize: TILE_SIZE,
    },
    layers: {
      water: { data: Array.from(state.layers.water), encoding: 'raw' },
      terrain: { data: Array.from(state.layers.terrain), encoding: 'raw' },
      clouds: { data: Array.from(state.layers.clouds), encoding: 'raw' },
    },
  }, null, 2);
}

function saveLevel() {
  const json = serializeLevel();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.campaign}_level.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Level saved');
}

function loadLevel(json) {
  try {
    const data = JSON.parse(json);
    if (data.version !== 1 || !data.layers) throw new Error('Invalid format');
    state.campaign = data.meta?.campaign || 'coral_front';
    state.rows = data.meta?.rows || DEFAULT_ROWS;
    state.layers.water = new Int8Array(data.layers.water.data);
    state.layers.terrain = new Int8Array(data.layers.terrain.data);
    state.layers.clouds = new Int8Array(data.layers.clouds.data);
    state.undoStack = [];
    state.redoStack = [];
    document.getElementById('campaignSelect').value = state.campaign;
    resizeCanvas();
    buildPalette();
    render();
    setStatus(`Loaded: ${data.meta?.name || 'level'}`);
  } catch (e) {
    setStatus(`Load error: ${e.message}`);
  }
}

// ── Status ──
function setStatus(msg) { statusText.textContent = msg; }

// ── Event Handlers ──
canvas.addEventListener('mousedown', (e) => {
  const { col, row } = cellFromEvent(e);
  if (e.button === 2 || state.tool === 'eraser') {
    pushUndo();
    state.painting = true;
    state.tool === 'eraser' || (state._prevTool = state.tool, state.tool = 'eraser');
    placeTile(col, row);
    return;
  }
  if (state.tool === 'fill') {
    pushUndo();
    floodFill(col, row);
    return;
  }
  // Brush / rect
  pushUndo();
  state.painting = true;
  state._rectStart = { col, row };
  placeTile(col, row);
});

canvas.addEventListener('mousemove', (e) => {
  const { col, row } = cellFromEvent(e);
  state._hoverCol = col;
  state._hoverRow = row;
  posInfo.textContent = `Col: ${col} Row: ${row}`;

  if (state.painting && (state.tool === 'brush' || state.tool === 'eraser')) {
    placeTile(col, row);
  }
  if (!state.painting) render(); // hover highlight
});

canvas.addEventListener('mouseup', () => {
  state.painting = false;
  if (state._prevTool) { state.tool = state._prevTool; state._prevTool = null; }
});

canvas.addEventListener('mouseleave', () => {
  state._hoverCol = -1;
  state._hoverRow = -1;
  state.painting = false;
  render();
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Scroll zoom
container.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    state.zoom = Math.max(0.25, Math.min(2, state.zoom + delta));
    zoomInfo.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
    resizeCanvas();
    render();
  }
});

// Toolbar
document.getElementById('newBtn').addEventListener('click', () => {
  const rows = parseInt(prompt('Number of rows:', DEFAULT_ROWS));
  if (rows > 0) newLevel(state.campaign, rows);
});

document.getElementById('saveBtn').addEventListener('click', saveLevel);

document.getElementById('loadBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadLevel(reader.result);
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('campaignSelect').addEventListener('change', (e) => {
  state.campaign = e.target.value;
  buildPalette();
  render();
});

document.getElementById('gridBtn').addEventListener('click', (e) => {
  state.showGrid = !state.showGrid;
  e.target.textContent = `Grid: ${state.showGrid ? 'ON' : 'OFF'}`;
  render();
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

// Layer controls
document.querySelectorAll('input[name="activeLayer"]').forEach(radio => {
  radio.addEventListener('change', () => {
    state.activeLayer = radio.value;
    state.selectedTile = 0;
    layerInfo.textContent = `Layer: ${state.activeLayer}`;
    buildPalette();
    render();
  });
});

['waterVis', 'terrainVis', 'cloudsVis'].forEach(id => {
  const layer = id.replace('Vis', '').replace('s$', '');
  const layerMap = { waterVis: 'water', terrainVis: 'terrain', cloudsVis: 'clouds' };
  document.getElementById(id).addEventListener('change', (e) => {
    state.layerVisibility[layerMap[id]] = e.target.checked;
    render();
  });
});

// Tool buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.tool = btn.dataset.tool;
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveLevel(); }
  if (e.key === 'b') selectTool('brush');
  if (e.key === 'e') selectTool('eraser');
  if (e.key === 'g' && !e.ctrlKey) selectTool('fill');
  if (e.key === 'r') selectTool('rect');
});

function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.tool === tool);
  });
}

// ── Boot ──
newLevel('coral_front', DEFAULT_ROWS);
