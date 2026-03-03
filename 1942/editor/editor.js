// 1942 Level Editor — Enhanced with Camera Controls & Path Visualization
// No dependencies, no build tools.

// ── Tile Palettes (matching game's TILE_PALETTES) ──
const PALETTES = {
  coral_front: {
    water: { 0: '#1c5d8f', 1: '#2980b9', 2: '#19466b', 3: '#7ee8ff' },
    terrain: { 0: 'transparent', 1: '#e6c88a', 2: '#5daa5d', 3: '#8b8680', 4: '#707070' },
  },
  jungle_spear: {
    water: { 0: '#3a6a4f', 1: '#4d8c65', 2: '#25442f', 3: '#8ed4a0' },
    terrain: { 0: 'transparent', 1: '#8b7355', 2: '#2d6e2d', 3: '#6b6b60', 4: '#555550' },
  },
  dust_convoy: {
    water: { 0: '#91643d', 1: '#b8884d', 2: '#68452b', 3: '#d4a860' },
    terrain: { 0: 'transparent', 1: '#d4a860', 2: '#a08050', 3: '#8b7355', 4: '#808080' },
  },
  iron_monsoon: {
    water: { 0: '#2e3455', 1: '#3d4570', 2: '#1d2238', 3: '#6070a0' },
    terrain: { 0: 'transparent', 1: '#606878', 2: '#4a5260', 3: '#555d6b', 4: '#707880' },
  },
};

const TILE_NAMES = {
  water: { 0: 'deep', 1: 'shallow', 2: 'dark', 3: 'foam' },
  terrain: { 0: 'empty', 1: 'sand', 2: 'grass', 3: 'rock', 4: 'structure' },
};

// Enemy path colors for visualization
const ENEMY_COLORS = {
  fighter: '#ff4444',
  bomber: '#44ff44', 
  scout: '#4444ff',
  formation: '#ffff44',
  boss: '#ff44ff'
};

const COLS = 15;
const TILE_SIZE = 64;
const DEFAULT_ROWS = 150;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.25;

// ── Enhanced State with Camera System ──
let state = {
  campaign: 'coral_front',
  rows: DEFAULT_ROWS,
  layers: { water: null, terrain: null },
  activeLayer: 'water',
  selectedTile: 0,
  tool: 'brush',
  showGrid: true,
  showPaths: true,
  
  // Camera system
  camera: {
    x: 0,
    y: 0,
    zoom: 1.0,
    viewportWidth: 0,
    viewportHeight: 0
  },
  
  // Navigation state
  keys: {},
  painting: false,
  undoStack: [],
  redoStack: [],
  layerVisibility: { water: true, terrain: true },
  
  // Enemy paths for visualization
  enemyPaths: [],
  
  // Hover state
  _hoverCol: -1,
  _hoverRow: -1,
};

// ── DOM refs ──
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');
const paletteDiv = document.getElementById('palette');
const statusText = document.getElementById('statusText');
const posInfo = document.getElementById('posInfo');
const layerInfo = document.getElementById('layerInfo');
const tileInfo = document.getElementById('tileInfo');
const cameraInfo = document.getElementById('cameraInfo');

// ── Init ──
function newLevel(campaign, rows) {
  state.campaign = campaign;
  state.rows = rows || DEFAULT_ROWS;
  state.layers.water = new Int8Array(COLS * state.rows).fill(0);
  state.layers.terrain = new Int8Array(COLS * state.rows).fill(0);
  state.layers.water.fill(0); // 0 = deep water
  state.undoStack = [];
  state.redoStack = [];
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.zoom = 1.0;
  
  generateSampleEnemyPaths(); // Generate some demo paths
  setupCanvas();
  buildPalette();
  render();
  renderMinimap();
  setStatus(`New level: ${campaign} (${COLS}×${rows})`);
}

function setupCanvas() {
  updateViewportSize();
  const worldWidth = COLS * TILE_SIZE;
  const worldHeight = state.rows * TILE_SIZE;
  canvas.width = Math.max(worldWidth * state.camera.zoom, state.camera.viewportWidth);
  canvas.height = Math.max(worldHeight * state.camera.zoom, state.camera.viewportHeight);
  
  // Setup minimap
  const minimapAspect = COLS / state.rows;
  if (minimapAspect > 1) {
    minimap.width = 240;
    minimap.height = 240 / minimapAspect;
  } else {
    minimap.width = 240 * minimapAspect;
    minimap.height = 240;
  }
}

function updateViewportSize() {
  state.camera.viewportWidth = container.clientWidth;
  state.camera.viewportHeight = container.clientHeight;
}

// ── Sample Enemy Paths ──
function generateSampleEnemyPaths() {
  state.enemyPaths = [
    // Fighter formation from top
    {
      type: 'fighter',
      path: [
        { x: 2 * TILE_SIZE, y: -TILE_SIZE, time: 0 },
        { x: 2 * TILE_SIZE, y: 10 * TILE_SIZE, time: 2000 },
        { x: 8 * TILE_SIZE, y: 15 * TILE_SIZE, time: 4000 },
        { x: 12 * TILE_SIZE, y: 25 * TILE_SIZE, time: 6000 }
      ]
    },
    // Bomber sweep
    {
      type: 'bomber',
      path: [
        { x: -TILE_SIZE, y: 5 * TILE_SIZE, time: 0 },
        { x: 4 * TILE_SIZE, y: 5 * TILE_SIZE, time: 2000 },
        { x: 8 * TILE_SIZE, y: 8 * TILE_SIZE, time: 3000 },
        { x: 15 * TILE_SIZE, y: 12 * TILE_SIZE, time: 5000 }
      ]
    },
    // Scout zigzag
    {
      type: 'scout',
      path: [
        { x: 6 * TILE_SIZE, y: -TILE_SIZE, time: 0 },
        { x: 3 * TILE_SIZE, y: 8 * TILE_SIZE, time: 1500 },
        { x: 9 * TILE_SIZE, y: 16 * TILE_SIZE, time: 3000 },
        { x: 5 * TILE_SIZE, y: 24 * TILE_SIZE, time: 4500 }
      ]
    }
  ];
}

// ── Camera Functions ──
function screenToWorld(screenX, screenY) {
  return {
    x: (screenX + state.camera.x) / state.camera.zoom,
    y: (screenY + state.camera.y) / state.camera.zoom
  };
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * state.camera.zoom - state.camera.x,
    y: worldY * state.camera.zoom - state.camera.y
  };
}

function moveCamera(dx, dy) {
  const worldWidth = COLS * TILE_SIZE * state.camera.zoom;
  const worldHeight = state.rows * TILE_SIZE * state.camera.zoom;
  
  state.camera.x = Math.max(0, Math.min(worldWidth - state.camera.viewportWidth, state.camera.x + dx));
  state.camera.y = Math.max(0, Math.min(worldHeight - state.camera.viewportHeight, state.camera.y + dy));
  
  container.scrollLeft = state.camera.x;
  container.scrollTop = state.camera.y;
  
  updateCameraInfo();
  render();
  renderMinimap();
}

function setZoom(newZoom) {
  const oldZoom = state.camera.zoom;
  state.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  
  // Adjust camera position to zoom towards center
  const centerX = state.camera.x + state.camera.viewportWidth / 2;
  const centerY = state.camera.y + state.camera.viewportHeight / 2;
  
  const zoomRatio = state.camera.zoom / oldZoom;
  state.camera.x = centerX * zoomRatio - state.camera.viewportWidth / 2;
  state.camera.y = centerY * zoomRatio - state.camera.viewportHeight / 2;
  
  setupCanvas();
  updateCameraInfo();
  render();
  renderMinimap();
}

function fitToScreen() {
  const worldWidth = COLS * TILE_SIZE;
  const worldHeight = state.rows * TILE_SIZE;
  const zoomX = state.camera.viewportWidth / worldWidth;
  const zoomY = state.camera.viewportHeight / worldHeight;
  
  setZoom(Math.min(zoomX, zoomY));
  state.camera.x = 0;
  state.camera.y = 0;
  
  container.scrollLeft = 0;
  container.scrollTop = 0;
}

function updateCameraInfo() {
  const worldPos = screenToWorld(state.camera.viewportWidth / 2, state.camera.viewportHeight / 2);
  const col = Math.floor(worldPos.x / TILE_SIZE);
  const row = Math.floor(worldPos.y / TILE_SIZE);
  cameraInfo.textContent = `Camera: (${col}, ${row}) | Zoom: ${Math.round(state.camera.zoom * 100)}%`;
  document.getElementById('zoomLevel').textContent = `${Math.round(state.camera.zoom * 100)}%`;
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

// ── Render Main Canvas ──
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const z = state.camera.zoom;
  const ts = TILE_SIZE * z;
  
  // Calculate visible range
  const startCol = Math.max(0, Math.floor(state.camera.x / ts));
  const startRow = Math.max(0, Math.floor(state.camera.y / ts));
  const endCol = Math.min(COLS, Math.ceil((state.camera.x + state.camera.viewportWidth) / ts));
  const endRow = Math.min(state.rows, Math.ceil((state.camera.y + state.camera.viewportHeight) / ts));

  // Draw each visible layer
  for (const layerName of ['water', 'terrain']) {
    if (!state.layerVisibility[layerName]) continue;
    const data = state.layers[layerName];
    if (!data) continue;
    const pal = PALETTES[state.campaign][layerName];
    const isActive = layerName === state.activeLayer;
    const alpha = isActive ? 1.0 : 0.5;

    ctx.globalAlpha = alpha;
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tileId = data[r * COLS + c];
        const color = pal[tileId];
        if (!color || color === 'transparent') continue;
        ctx.fillStyle = color;
        const x = c * ts - state.camera.x;
        const y = r * ts - state.camera.y;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Grid overlay
  if (state.showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let c = startCol; c <= endCol; c++) {
      const x = c * ts - state.camera.x;
      if (x >= -1 && x <= state.camera.viewportWidth + 1) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.camera.viewportHeight);
        ctx.stroke();
      }
    }
    
    // Horizontal grid lines
    for (let r = startRow; r <= endRow; r++) {
      const y = r * ts - state.camera.y;
      if (y >= -1 && y <= state.camera.viewportHeight + 1) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.camera.viewportWidth, y);
        ctx.stroke();
      }
    }
  }

  // Enemy paths
  if (state.showPaths) {
    drawEnemyPaths();
  }

  // Highlight hovered cell
  if (state._hoverCol >= 0 && state._hoverRow >= 0) {
    const x = state._hoverCol * ts - state.camera.x;
    const y = state._hoverRow * ts - state.camera.y;
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
    
    // Show coordinates
    if (state.showGrid) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x + 4, y + 4, 60, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(`${state._hoverCol},${state._hoverRow}`, x + 8, y + 16);
    }
  }
}

// ── Enemy Path Visualization ──
function drawEnemyPaths() {
  state.enemyPaths.forEach(enemyPath => {
    const color = ENEMY_COLORS[enemyPath.type] || '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    // Draw path line
    ctx.beginPath();
    enemyPath.path.forEach((point, i) => {
      const screenPos = worldToScreen(point.x, point.y);
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });
    ctx.stroke();
    
    // Draw timing markers
    ctx.fillStyle = color;
    enemyPath.path.forEach((point, i) => {
      const screenPos = worldToScreen(point.x, point.y);
      
      // Draw marker circle
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw time label
      if (i > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(screenPos.x + 8, screenPos.y - 8, 30, 16);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`${point.time}ms`, screenPos.x + 10, screenPos.y + 2);
        ctx.fillStyle = color;
      }
    });
  });
}

// ── Render Minimap ──
function renderMinimap() {
  minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
  
  const scaleX = minimap.width / (COLS * TILE_SIZE);
  const scaleY = minimap.height / (state.rows * TILE_SIZE);
  
  // Draw layers on minimap
  for (const layerName of ['water', 'terrain']) {
    if (!state.layerVisibility[layerName]) continue;
    const data = state.layers[layerName];
    if (!data) continue;
    const pal = PALETTES[state.campaign][layerName];
    const alpha = layerName === state.activeLayer ? 1.0 : 0.5;

    minimapCtx.globalAlpha = alpha;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tileId = data[r * COLS + c];
        const color = pal[tileId];
        if (!color || color === 'transparent') continue;
        minimapCtx.fillStyle = color;
        minimapCtx.fillRect(
          c * TILE_SIZE * scaleX,
          r * TILE_SIZE * scaleY,
          TILE_SIZE * scaleX,
          TILE_SIZE * scaleY
        );
      }
    }
    minimapCtx.globalAlpha = 1.0;
  }
  
  // Draw enemy paths on minimap
  if (state.showPaths) {
    state.enemyPaths.forEach(enemyPath => {
      const color = ENEMY_COLORS[enemyPath.type] || '#fff';
      minimapCtx.strokeStyle = color;
      minimapCtx.lineWidth = 2;
      
      minimapCtx.beginPath();
      enemyPath.path.forEach((point, i) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        if (i === 0) {
          minimapCtx.moveTo(x, y);
        } else {
          minimapCtx.lineTo(x, y);
        }
      });
      minimapCtx.stroke();
    });
  }
  
  // Draw viewport indicator
  const viewX = (state.camera.x / state.camera.zoom) * scaleX;
  const viewY = (state.camera.y / state.camera.zoom) * scaleY;
  const viewW = (state.camera.viewportWidth / state.camera.zoom) * scaleX;
  const viewH = (state.camera.viewportHeight / state.camera.zoom) * scaleY;
  
  minimapCtx.strokeStyle = '#e94560';
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(viewX, viewY, viewW, viewH);
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
  renderMinimap();
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
  renderMinimap();
  setStatus('Redo');
}

// ── Tools ──
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const worldPos = screenToWorld(screenX, screenY);
  return { 
    col: Math.floor(worldPos.x / TILE_SIZE), 
    row: Math.floor(worldPos.y / TILE_SIZE) 
  };
}

function cellFromMinimap(e) {
  const rect = minimap.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const scaleX = minimap.width / (COLS * TILE_SIZE);
  const scaleY = minimap.height / (state.rows * TILE_SIZE);
  return { 
    col: Math.floor(x / scaleX / TILE_SIZE), 
    row: Math.floor(y / scaleY / TILE_SIZE) 
  };
}

function placeTile(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= state.rows) return;
  const idx = row * COLS + col;
  const layer = state.layers[state.activeLayer];
  const val = state.tool === 'eraser' ? 0 : state.selectedTile;
  if (layer[idx] === val) return;
  layer[idx] = val;
  render();
  renderMinimap();
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
  renderMinimap();
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
    },
    enemyPaths: state.enemyPaths,
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
    state.enemyPaths = data.enemyPaths || [];
    state.undoStack = [];
    state.redoStack = [];
    
    document.getElementById('campaignSelect').value = state.campaign;
    setupCanvas();
    buildPalette();
    render();
    renderMinimap();
    setStatus(`Loaded: ${data.meta?.name || 'level'}`);
  } catch (e) {
    setStatus(`Load error: ${e.message}`);
  }
}

// ── Status ──
function setStatus(msg) { 
  statusText.textContent = msg; 
}

// ── Navigation Update Loop ──
function updateNavigation() {
  const speed = 200 * (1 / state.camera.zoom); // Adjust speed based on zoom
  let moved = false;
  
  if (state.keys['KeyW'] || state.keys['ArrowUp']) {
    moveCamera(0, -speed);
    moved = true;
  }
  if (state.keys['KeyS'] || state.keys['ArrowDown']) {
    moveCamera(0, speed);
    moved = true;
  }
  if (state.keys['KeyA'] || state.keys['ArrowLeft']) {
    moveCamera(-speed, 0);
    moved = true;
  }
  if (state.keys['KeyD'] || state.keys['ArrowRight']) {
    moveCamera(speed, 0);
    moved = true;
  }
  
  requestAnimationFrame(updateNavigation);
}

// ── Event Handlers ──

// Main Canvas Events
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
  pushUndo();
  state.painting = true;
  state._rectStart = { col, row };
  placeTile(col, row);
});

canvas.addEventListener('mousemove', (e) => {
  const { col, row } = cellFromEvent(e);
  state._hoverCol = col;
  state._hoverRow = row;
  
  const worldPos = screenToWorld(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
  posInfo.textContent = `Col: ${col} Row: ${row} | Coords: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`;

  if (state.painting && (state.tool === 'brush' || state.tool === 'eraser')) {
    placeTile(col, row);
  }
  if (!state.painting) render();
});

canvas.addEventListener('mouseup', () => {
  state.painting = false;
  if (state._prevTool) { 
    state.tool = state._prevTool; 
    state._prevTool = null; 
  }
});

canvas.addEventListener('mouseleave', () => {
  state._hoverCol = -1;
  state._hoverRow = -1;
  state.painting = false;
  render();
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Minimap Events
minimap.addEventListener('click', (e) => {
  const { col, row } = cellFromMinimap(e);
  const worldX = col * TILE_SIZE;
  const worldY = row * TILE_SIZE;
  
  state.camera.x = worldX * state.camera.zoom - state.camera.viewportWidth / 2;
  state.camera.y = worldY * state.camera.zoom - state.camera.viewportHeight / 2;
  
  const worldWidth = COLS * TILE_SIZE * state.camera.zoom;
  const worldHeight = state.rows * TILE_SIZE * state.camera.zoom;
  state.camera.x = Math.max(0, Math.min(worldWidth - state.camera.viewportWidth, state.camera.x));
  state.camera.y = Math.max(0, Math.min(worldHeight - state.camera.viewportHeight, state.camera.y));
  
  container.scrollLeft = state.camera.x;
  container.scrollTop = state.camera.y;
  
  updateCameraInfo();
  render();
  renderMinimap();
});

// Mouse wheel zoom
container.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(state.camera.zoom + delta);
  }
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  state.keys[e.code] = true;
  
  // Tool shortcuts
  if (e.key === 'b') selectTool('brush');
  if (e.key === 'e') selectTool('eraser');
  if (e.key === 'g' && !e.ctrlKey) selectTool('fill');
  if (e.key === 'r') selectTool('rect');
  
  // Toggle shortcuts
  if (e.shiftKey && e.key === 'G') {
    state.showGrid = !state.showGrid;
    document.getElementById('gridBtn').textContent = `Grid: ${state.showGrid ? 'ON' : 'OFF'}`;
    render();
  }
  if (e.shiftKey && e.key === 'P') {
    state.showPaths = !state.showPaths;
    document.getElementById('pathsBtn').textContent = `Paths: ${state.showPaths ? 'ON' : 'OFF'}`;
    render();
    renderMinimap();
  }
  
  // Zoom shortcuts
  if (e.key === '=' || e.key === '+') setZoom(state.camera.zoom + ZOOM_STEP);
  if (e.key === '-') setZoom(state.camera.zoom - ZOOM_STEP);
  if (e.key === '0') setZoom(1.0);
  
  // Standard shortcuts
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveLevel(); }
});

document.addEventListener('keyup', (e) => {
  state.keys[e.code] = false;
});

// Toolbar Events
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
  renderMinimap();
});

document.getElementById('gridBtn').addEventListener('click', (e) => {
  state.showGrid = !state.showGrid;
  e.target.textContent = `Grid: ${state.showGrid ? 'ON' : 'OFF'}`;
  render();
});

document.getElementById('pathsBtn').addEventListener('click', (e) => {
  state.showPaths = !state.showPaths;
  e.target.textContent = `Paths: ${state.showPaths ? 'ON' : 'OFF'}`;
  render();
  renderMinimap();
});

// Zoom controls
document.getElementById('zoomOutBtn').addEventListener('click', () => {
  setZoom(state.camera.zoom - ZOOM_STEP);
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  setZoom(state.camera.zoom + ZOOM_STEP);
});

document.getElementById('zoomFitBtn').addEventListener('click', fitToScreen);

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

['waterVis', 'terrainVis'].forEach(id => {
  const layerMap = { waterVis: 'water', terrainVis: 'terrain' };
  document.getElementById(id).addEventListener('change', (e) => {
    state.layerVisibility[layerMap[id]] = e.target.checked;
    render();
    renderMinimap();
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

function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.tool === tool);
  });
}

// Container resize handling
window.addEventListener('resize', () => {
  updateViewportSize();
  setupCanvas();
  render();
  renderMinimap();
});

// ── Boot ──
window.addEventListener('load', () => {
  updateViewportSize();
  newLevel('coral_front', DEFAULT_ROWS);
  updateCameraInfo();
  updateNavigation(); // Start navigation loop
});