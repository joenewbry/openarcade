// ── ARCADE-073: Tile Map System ──
// Proper tile-based scrolling backgrounds using a JSON-like tilemap format.
// Each level has a full scrollable tile-based map with multiple layers.
//
// Architecture:
//   - TILE_SIZE: 64px base tile size
//   - Map width: 15 tiles (960px / 64px)
//   - Map height: variable (longer maps = longer levels)
//   - 3 parallax layers with different scroll speeds:
//     Layer 0 (water): scrolls at 0.2x — deep water base
//     Layer 1 (terrain): scrolls at 0.5x — islands, land masses
//     Layer 2 (clouds): scrolls at 2.0x — cloud cover overlay
//
// Tile types per layer:
//   Water layer: 0=deep water, 1=shallow water, 2=dark water, 3=foam/surf
//   Terrain layer: 0=empty, 1=sand/beach, 2=grass/vegetation, 3=rock, 4=structure
//   Cloud layer: 0=empty, 1=thin cloud, 2=thick cloud, 3=storm cloud

export const TILE_SIZE = 64;
export const MAP_COLS = 15; // 960 / 64
export const MAP_VISIBLE_ROWS = 20; // 1280 / 64

// ── Tile color palettes per campaign ──
const TILE_PALETTES = {
  coral_front: {
    water: ['#19466b', '#1c5d8f', '#16547a', '#22729e'],
    terrain: ['transparent', '#d5bc84', '#4b7c45', '#8a7a5e', '#6b5d42'],
    cloud: ['transparent', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.25)', 'rgba(200,220,255,0.20)'],
    reef: '#3a8a6e',
    sand: '#e8d5a0',
    shore: '#7ec4d6',
  },
  jungle_spear: {
    water: ['#25442f', '#3a6a4f', '#1e3a28', '#2d5a3e'],
    terrain: ['transparent', '#5a8842', '#2d5420', '#6e7c55', '#4a3f2d'],
    cloud: ['transparent', 'rgba(200,255,200,0.12)', 'rgba(180,220,180,0.20)', 'rgba(150,180,150,0.18)'],
    reef: '#5f90bd',
    sand: '#8a7a52',
    shore: '#4a8a62',
  },
  dust_convoy: {
    water: ['#68452b', '#91643d', '#7a5530', '#a47848'],
    terrain: ['transparent', '#be8a52', '#d4a065', '#9a7040', '#786030'],
    cloud: ['transparent', 'rgba(255,240,200,0.12)', 'rgba(255,220,180,0.20)', 'rgba(220,180,140,0.18)'],
    reef: '#6e5743',
    sand: '#d4b878',
    shore: '#a08450',
  },
  iron_monsoon: {
    water: ['#1d2238', '#2e3455', '#252b42', '#3a4268'],
    terrain: ['transparent', '#4b5578', '#596286', '#3d4560', '#68739a'],
    cloud: ['transparent', 'rgba(180,200,255,0.15)', 'rgba(160,180,240,0.25)', 'rgba(140,160,220,0.30)'],
    reef: '#68739a',
    sand: '#5a6080',
    shore: '#3a4a68',
  },
};

// ── Procedural map generator ──
// Generates a tilemap for a campaign with predefined island layouts, channels, and terrain features.
// Returns { waterLayer, terrainLayer, cloudLayer, cols, rows, groundEnemies }

function seededRand(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

// Generate island shapes (clusters of terrain tiles)
function generateIsland(rng, cols, startRow, width, height) {
  const tiles = [];
  const cx = Math.floor(rng() * (cols - width - 2)) + 1;
  const cy = startRow;

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      // Elliptical shape with noise
      const nx = (dx - width / 2) / (width / 2);
      const ny = (dy - height / 2) / (height / 2);
      const dist = nx * nx + ny * ny;
      const noise = rng() * 0.3;
      if (dist + noise < 1.0) {
        // Edge = sand(1), inner = vegetation(2), center sometimes rock(3)
        let type;
        if (dist > 0.6) type = 1; // sand/beach edge
        else if (dist > 0.3) type = 2; // vegetation
        else type = rng() < 0.3 ? 3 : 2; // rock or vegetation
        tiles.push({ col: cx + dx, row: cy + dy, type });
      }
    }
  }
  return tiles;
}

// Generate a long channel of water variation
function generateChannel(rng, cols, startRow, length) {
  const tiles = [];
  let cx = Math.floor(rng() * (cols - 4)) + 2;
  for (let i = 0; i < length; i++) {
    cx += Math.floor(rng() * 3) - 1;
    cx = Math.max(1, Math.min(cols - 3, cx));
    const width = 2 + Math.floor(rng() * 2);
    for (let dx = 0; dx < width; dx++) {
      tiles.push({ col: cx + dx, row: startRow + i, type: 1 }); // shallow water
    }
  }
  return tiles;
}

export function generateTilemap(campaignId, mapRows = 120) {
  const seed = campaignId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRand(seed * 7919);

  // Initialize empty layers
  const waterLayer = [];
  const terrainLayer = [];
  const cloudLayer = [];
  const groundEnemySlots = []; // { col, row, type: 'bunker'|'ship' }

  for (let r = 0; r < mapRows; r++) {
    const waterRow = [];
    const terrainRow = [];
    const cloudRow = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Water: mix of deep(0) and shallow(1) with some variation
      waterRow.push(rng() < 0.3 ? 1 : (rng() < 0.1 ? 2 : 0));
      terrainRow.push(0); // empty by default
      cloudRow.push(0);
    }
    waterLayer.push(waterRow);
    terrainLayer.push(terrainRow);
    cloudLayer.push(cloudRow);
  }

  // Water channels — create visual flow
  const channelCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < channelCount; i++) {
    const startRow = Math.floor(rng() * (mapRows - 20));
    const length = 10 + Math.floor(rng() * 20);
    const tiles = generateChannel(rng, MAP_COLS, startRow, length);
    for (const t of tiles) {
      if (t.row >= 0 && t.row < mapRows && t.col >= 0 && t.col < MAP_COLS) {
        waterLayer[t.row][t.col] = t.type;
      }
    }
  }

  // Islands — main terrain features
  const islandCount = 8 + Math.floor(rng() * 6);
  for (let i = 0; i < islandCount; i++) {
    const startRow = Math.floor(rng() * (mapRows - 10));
    const width = 3 + Math.floor(rng() * 5);
    const height = 2 + Math.floor(rng() * 4);
    const island = generateIsland(rng, MAP_COLS, startRow, width, height);
    for (const t of island) {
      if (t.row >= 0 && t.row < mapRows && t.col >= 0 && t.col < MAP_COLS) {
        terrainLayer[t.row][t.col] = t.type;
      }
    }

    // Place ground enemy slots on some islands
    if (island.length > 4 && rng() < 0.6) {
      // Pick a central tile for a bunker
      const center = island[Math.floor(island.length / 2)];
      if (center) {
        groundEnemySlots.push({
          col: center.col,
          row: center.row,
          type: 'bunker',
        });
      }
    }
  }

  // Ships on water — place in open water areas
  const shipCount = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < shipCount; i++) {
    const row = 10 + Math.floor(rng() * (mapRows - 20));
    const col = 1 + Math.floor(rng() * (MAP_COLS - 3));
    // Only place ships on water tiles
    if (terrainLayer[row][col] === 0) {
      groundEnemySlots.push({
        col,
        row,
        type: rng() < 0.4 ? 'battleship' : 'ship', // battleship = 3 turrets
      });
    }
  }

  // Cloud layer — scattered cloud patches
  for (let i = 0; i < 30; i++) {
    const row = Math.floor(rng() * mapRows);
    const col = Math.floor(rng() * MAP_COLS);
    const cloudW = 2 + Math.floor(rng() * 4);
    const cloudH = 1 + Math.floor(rng() * 2);
    const cloudType = 1 + Math.floor(rng() * 2);
    for (let dy = 0; dy < cloudH; dy++) {
      for (let dx = 0; dx < cloudW; dx++) {
        const r = row + dy;
        const c = col + dx;
        if (r >= 0 && r < mapRows && c >= 0 && c < MAP_COLS) {
          cloudLayer[r][c] = cloudType;
        }
      }
    }
  }

  return {
    campaignId,
    cols: MAP_COLS,
    rows: mapRows,
    tileSize: TILE_SIZE,
    waterLayer,
    terrainLayer,
    cloudLayer,
    groundEnemySlots,
  };
}

// ── Tilemap Renderer ──
// Draws a section of the tilemap visible on screen, with parallax per layer.

export function drawTilemapLayer(renderer, tilemap, layerName, palette, scrollY, alpha = 1) {
  const layer = tilemap[layerName];
  const ts = TILE_SIZE;
  const colors = layerName === 'waterLayer' ? palette.water
    : layerName === 'terrainLayer' ? palette.terrain
    : palette.cloud;

  // Calculate which rows are visible
  const startRow = Math.floor(scrollY / ts) - 1;
  const endRow = startRow + MAP_VISIBLE_ROWS + 3;

  for (let r = startRow; r <= endRow; r++) {
    // Wrap row index for infinite scrolling
    const mapRow = ((r % tilemap.rows) + tilemap.rows) % tilemap.rows;
    const screenY = r * ts - scrollY;

    if (screenY > 1280 + ts || screenY < -ts) continue;

    const row = layer[mapRow];
    if (!row) continue;

    for (let c = 0; c < tilemap.cols; c++) {
      const tileType = row[c];
      if (tileType === 0 && layerName !== 'waterLayer') continue; // skip empty non-water tiles

      const color = colors[tileType] || colors[0];
      if (color === 'transparent') continue;

      const screenX = c * ts;

      if (layerName === 'terrainLayer') {
        // Terrain tiles get more detail
        renderer.fillRect(screenX, screenY, ts, ts, color);
        // Add subtle edge highlights
        if (tileType === 1) {
          // Sand edge — lighter top
          renderer.fillRect(screenX, screenY, ts, 3, palette.sand || color);
        } else if (tileType === 2) {
          // Vegetation — darker spots
          renderer.fillRect(screenX + 8, screenY + 8, ts - 16, ts - 16,
            colors[Math.min(tileType + 1, colors.length - 1)] || color);
        }
        // Shore effect around terrain
        if (tileType >= 1) {
          renderer.fillRect(screenX - 2, screenY - 2, ts + 4, ts + 4,
            palette.shore ? palette.shore.replace(')', ',0.15)').replace('rgb', 'rgba') : 'rgba(100,200,255,0.08)');
        }
      } else if (layerName === 'cloudLayer') {
        // Clouds: soft rectangles with alpha
        const cloudAlpha = tileType === 1 ? 0.12 : tileType === 2 ? 0.22 : 0.18;
        renderer.fillRect(screenX - 8, screenY - 4, ts + 16, ts + 8,
          `rgba(255,255,255,${(cloudAlpha * alpha).toFixed(2)})`);
      } else {
        // Water tiles
        renderer.fillRect(screenX, screenY, ts, ts, color);
      }
    }
  }
}

// Draw ground enemies (bunkers/ships) that are attached to the terrain layer
export function drawGroundEnemies(renderer, text, tilemap, palette, scrollY, tick) {
  const ts = TILE_SIZE;
  for (const slot of tilemap.groundEnemySlots) {
    const screenX = slot.col * ts;
    const screenY = slot.row * ts - scrollY;

    if (screenY > 1280 + ts || screenY < -ts * 2) continue;

    if (slot.type === 'bunker') {
      // Concrete bunker on island
      const bx = screenX + 8;
      const by = screenY + 8;
      const bw = ts - 16;
      const bh = ts - 16;
      renderer.fillRect(bx, by, bw, bh, '#5a5a5a');
      renderer.fillRect(bx + 4, by + 4, bw - 8, bh - 8, '#4a4a4a');
      // Gun slit
      renderer.fillRect(bx + bw / 2 - 6, by + bh / 2 - 2, 12, 4, '#222');
      // Rotating turret barrel (aims toward player roughly)
      const angle = Math.sin(tick * 0.02 + slot.col) * 0.5;
      const barrelLen = 14;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      const ex = cx + Math.sin(angle) * barrelLen;
      const ey = cy + Math.cos(angle) * barrelLen;
      renderer.fillRect(Math.min(cx, ex), Math.min(cy, ey),
        Math.abs(ex - cx) + 3, Math.abs(ey - cy) + 3, '#333');
    } else if (slot.type === 'ship' || slot.type === 'battleship') {
      // Ship on water
      const sx = screenX;
      const sy = screenY;
      const sw = ts;
      const sh = slot.type === 'battleship' ? ts * 2 : ts * 1.5;

      // Hull
      renderer.fillRect(sx + 8, sy, sw - 16, sh, '#6a6a6a');
      renderer.fillRect(sx + 12, sy + 4, sw - 24, sh - 8, '#5a5a5a');
      // Bow
      renderer.fillRect(sx + sw / 2 - 6, sy - 8, 12, 12, '#6a6a6a');

      // Turrets
      const turretCount = slot.type === 'battleship' ? 3 : 1;
      for (let t = 0; t < turretCount; t++) {
        const ty = sy + 12 + t * (sh / (turretCount + 1));
        const tx = sx + sw / 2;
        // Turret base
        renderer.fillRect(tx - 8, ty - 8, 16, 16, '#4a4a4a');
        // Rotating barrel
        const angle = Math.sin(tick * 0.025 + slot.col + t * 2) * Math.PI * 0.4;
        const barrelLen = 12;
        const ex = tx + Math.sin(angle) * barrelLen;
        const ey = ty + Math.cos(angle) * barrelLen;
        renderer.fillRect(Math.min(tx, ex), Math.min(ty, ey),
          Math.abs(ex - tx) + 2, Math.abs(ey - ty) + 2, '#333');
      }

      // Wake (foam behind ship)
      renderer.fillRect(sx + sw / 2 - 4, sy + sh, 8, 16, 'rgba(255,255,255,0.2)');
      renderer.fillRect(sx + sw / 2 - 6, sy + sh + 12, 12, 8, 'rgba(255,255,255,0.1)');
    }
  }
}

// Get the palette for a campaign
export function getTilePalette(campaignId) {
  return TILE_PALETTES[campaignId] || TILE_PALETTES.coral_front;
}

// ── Campaign Tilemap Configs ──
// Each campaign specifies map length. Longer maps = longer levels (F12).
export const CAMPAIGN_MAP_ROWS = {
  coral_front: 120,    // Tutorial — moderate length
  jungle_spear: 150,   // Longer — more terrain before boss
  dust_convoy: 180,    // Endurance — very long
  iron_monsoon: 200,   // The gauntlet — longest map
};
