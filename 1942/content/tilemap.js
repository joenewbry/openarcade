// ── ARCADE-073: Tile Map System ──
// Proper tile-based scrolling backgrounds using a JSON-like tilemap format.
// Each level has a full scrollable tile-based map with multiple layers.
//
// Architecture:
//   - TILE_SIZE: 64px base tile size
//   - Map width: 15 tiles (960px / 64px)
//   - Map height: variable (longer maps = longer levels)
//   - 2 parallax layers with different scroll speeds:
//     Layer 0 (water): scrolls at 0.2x — deep water base
//     Layer 1 (terrain): scrolls at 0.5x — islands, land masses
//
// Tile types per layer:
//   Water layer: 0=deep water, 1=shallow water, 2=dark water, 3=foam/surf
//   Terrain layer: 0=empty, 1=sand/beach, 2=grass/vegetation, 3=rock, 4=structure

export const TILE_SIZE = 64;
export const MAP_COLS = 15; // 960 / 64
export const MAP_VISIBLE_ROWS = 20; // 1280 / 64

// ── Tile color palettes per campaign ──
const TILE_PALETTES = {
  coral_front: {
    water: ['#19466b', '#1c5d8f', '#16547a', '#22729e'],
    terrain: ['transparent', '#d5bc84', '#4b7c45', '#8a7a5e', '#6b5d42'],
    reef: '#3a8a6e',
    sand: '#e8d5a0',
    shore: '#7ec4d6',
  },
  jungle_spear: {
    water: ['#25442f', '#3a6a4f', '#1e3a28', '#2d5a3e'],
    terrain: ['transparent', '#5a8842', '#2d5420', '#6e7c55', '#4a3f2d'],
    reef: '#5f90bd',
    sand: '#8a7a52',
    shore: '#4a8a62',
  },
  dust_convoy: {
    water: ['#68452b', '#91643d', '#7a5530', '#a47848'],
    terrain: ['transparent', '#be8a52', '#d4a065', '#9a7040', '#786030'],
    reef: '#6e5743',
    sand: '#d4b878',
    shore: '#a08450',
  },
  iron_monsoon: {
    water: ['#1d2238', '#2e3455', '#252b42', '#3a4268'],
    terrain: ['transparent', '#4b5578', '#596286', '#3d4560', '#68739a'],
    reef: '#68739a',
    sand: '#5a6080',
    shore: '#3a4a68',
  },
};

// ── Procedural map generator ──
// Generates a tilemap for a campaign with predefined island layouts, channels, and terrain features.
// Returns { waterLayer, terrainLayer, cols, rows, groundEnemies }

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
  const groundEnemySlots = []; // { col, row, type: 'bunker'|'ship' }

  for (let r = 0; r < mapRows; r++) {
    const waterRow = [];
    const terrainRow = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Water: mix of deep(0) and shallow(1) with some variation
      waterRow.push(rng() < 0.3 ? 1 : (rng() < 0.1 ? 2 : 0));
      terrainRow.push(0); // empty by default
    }
    waterLayer.push(waterRow);
    terrainLayer.push(terrainRow);
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
      const shipType = rng() < 0.4 ? 'battleship' : 'ship';
      const slot = {
        col,
        row,
        type: shipType,
        waveEffects: [], // Array to store wave effects for this ship
        lastWaveSpawn: 0, // Timer to control wave spawning frequency
      };

      // Add turrets for ships
      if (shipType === 'battleship') {
        slot.turrets = [
          { x: 16, y: 8, type: 'cannon', hp: 30 },
          { x: 48, y: 8, type: 'cannon', hp: 30 },
          { x: 32, y: 24, type: 'small', hp: 20 }
        ];
      } else if (shipType === 'ship') {
        slot.turrets = [
          { x: 24, y: 12, type: 'small', hp: 20 },
          { x: 40, y: 12, type: 'small', hp: 20 }
        ];
      }

      groundEnemySlots.push(slot);
    }
  }

  // Cloud layer removed per overhaul requirements

  return {
    campaignId,
    cols: MAP_COLS,
    rows: mapRows,
    tileSize: TILE_SIZE,
    waterLayer,
    terrainLayer,
    groundEnemySlots,
  };
}

// ── Tilemap Renderer ──
// Draws a section of the tilemap visible on screen, with parallax per layer.

const TILE_ATLASES = {};
function preloadTileAtlas(campaignId) {
  if (TILE_ATLASES[campaignId]) return;
  const base = `assets/tiles/${campaignId}`;
  const waterImg = new Image();
  waterImg.src = `${base}/water.png`;
  const terrainImg = new Image();
  terrainImg.src = `${base}/terrain.png`;
  // Load metadata asynchronously
  const waterMetaPromise = fetch(`${base}/water.json`).then(r => r.json());
  const terrainMetaPromise = fetch(`${base}/terrain.json`).then(r => r.json());
  Promise.all([waterMetaPromise, terrainMetaPromise]).then(([waterMeta, terrainMeta]) => {
    TILE_ATLASES[campaignId] = {
      water: {img: waterImg, meta: waterMeta},
      terrain: {img: terrainImg, meta: terrainMeta},
    };
  });
}

export function drawTilemapLayer(renderer, tilemap, layerName, palette, scrollY, alpha = 1, tick = 0) {
  const layer = tilemap[layerName];
  const ts = TILE_SIZE;
  const colors = layerName === 'waterLayer' ? palette.water
    : layerName === 'terrainLayer' ? palette.terrain
    : null;

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

      // Enhanced geometric tile rendering
      if (layerName === 'waterLayer') {
        drawGeometricWaterTile(renderer, screenX, screenY, ts, tileType, color, tick);
      } else if (layerName === 'terrainLayer') {
        drawGeometricTerrainTile(renderer, screenX, screenY, ts, tileType, color, c, r);
      } else {
        // Fallback to solid color
        renderer.fillRect(screenX, screenY, ts, ts, color);
      }
    }
  }
}

      // Determine atlas for this layer
      const atlasInfo = TILE_ATLASES[tilemap.campaignId];
      let img = null, meta = null;
      if (layerName === 'terrainLayer' && atlasInfo && atlasInfo.terrain) {
        img = atlasInfo.terrain.img;
        meta = atlasInfo.terrain.meta;
      } else if (layerName === 'waterLayer' && atlasInfo && atlasInfo.water) {
        img = atlasInfo.water.img;
        meta = atlasInfo.water.meta;
      }

      if (img && meta && typeof renderer.drawImageRegion === 'function') {
        const frame = meta.frames[tileType];
        if (frame) {
          renderer.drawImageRegion(img, frame.x, frame.y, frame.w, frame.h,
            screenX, screenY, ts, ts);
        }
      } else {
        // Fallback rendering as before
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
        } else {
          // Water tiles
          renderer.fillRect(screenX, screenY, ts, ts, color);
        }
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
      // Larger naval vessels with destroyable turrets
      const shipScale = slot.type === 'battleship' ? 3.5 : 2.2;
      const sx = screenX - (ts * 0.3); // Center larger ships
      const sy = screenY;
      const sw = ts * shipScale;
      const sh = ts * (shipScale * 0.8);

      // Main hull (dark steel gray)
      renderer.fillRect(sx + 4, sy + 8, sw - 8, sh - 16, '#4a4a4a');
      renderer.fillRect(sx + 8, sy + 12, sw - 16, sh - 24, '#3a3a3a');
      
      // Ship deck (lighter)
      renderer.fillRect(sx + 12, sy + 16, sw - 24, sh - 32, '#5a5a5a');
      
      // Bridge/superstructure (center)
      const bridgeW = sw * 0.3;
      const bridgeX = sx + sw / 2 - bridgeW / 2;
      renderer.fillRect(bridgeX, sy + sh * 0.3, bridgeW, sh * 0.2, '#606060');
      
      // Bow (pointed front)
      renderer.fillRect(sx + sw / 2 - 8, sy - 6, 16, 14, '#4a4a4a');
      renderer.fillRect(sx + sw / 2 - 4, sy - 10, 8, 10, '#4a4a4a');

      // Enhanced wake effects
      const wakeW = sw * 0.6;
      const wakeX = sx + sw / 2 - wakeW / 2;
      renderer.fillRect(wakeX, sy + sh, wakeW, 20, 'rgba(255,255,255,0.25)');
      renderer.fillRect(wakeX + 8, sy + sh + 16, wakeW - 16, 16, 'rgba(255,255,255,0.15)');
      
      // Side wakes
      renderer.fillRect(sx + 8, sy + sh * 0.8, 8, sh * 0.3, 'rgba(255,255,255,0.1)');
      renderer.fillRect(sx + sw - 16, sy + sh * 0.8, 8, sh * 0.3, 'rgba(255,255,255,0.1)');
    }
  }
}

// Get the palette for a campaign
export function getTilePalette(campaignId) {
  return TILE_PALETTES[campaignId] || TILE_PALETTES.coral_front;
}

// ── Wave Effects System ──
// Manages boat wave animations that render ON TOP of water but BEHIND boat sprites

// Spawn a new wave effect for a ship
export function spawnWaveEffect(ship, type, offsetX = 0, offsetY = 0) {
  // Limit to 3-4 wave effects per ship for performance
  if (ship.waveEffects.length >= 4) {
    // Remove oldest wave effect
    ship.waveEffects.shift();
  }
  
  const ts = TILE_SIZE;
  const shipX = ship.col * ts + offsetX;
  const shipY = ship.row * ts + offsetY;
  
  const waveEffect = {
    type: type, // 'wake', 'splash', 'foam'
    x: shipX,
    y: shipY,
    life: 60, // Fade out over 60 frames (1 second at 60fps)
    maxLife: 60,
    velocityX: Math.random() * 2 - 1, // Small random drift
    velocityY: 1 + Math.random() * 2,  // Drift away from ship
  };
  
  ship.waveEffects.push(waveEffect);
}

// Update wave effects lifecycle and position
export function updateWaveEffects(tilemap, tick) {
  for (const ship of tilemap.groundEnemySlots) {
    if (ship.type !== 'ship' && ship.type !== 'battleship') continue;
    
    // Spawn new wave effects periodically
    if (tick - ship.lastWaveSpawn > 30 + Math.random() * 30) {
      // Spawn wake effect behind ship
      const shipScale = ship.type === 'battleship' ? 3.5 : 2.2;
      const shipHeight = TILE_SIZE * (shipScale * 0.8);
      spawnWaveEffect(ship, 'wake', 0, shipHeight);
      
      // Occasionally spawn splash effects at ship sides
      if (Math.random() < 0.3) {
        const shipWidth = TILE_SIZE * shipScale;
        spawnWaveEffect(ship, 'splash', -shipWidth * 0.4, shipHeight * 0.6);
        spawnWaveEffect(ship, 'splash', shipWidth * 0.4, shipHeight * 0.6);
      }
      
      // Spawn foam effects around ship
      if (Math.random() < 0.4) {
        spawnWaveEffect(ship, 'foam', 
          (Math.random() - 0.5) * TILE_SIZE * 2, 
          shipHeight + Math.random() * 20);
      }
      
      ship.lastWaveSpawn = tick;
    }
    
    // Update existing wave effects
    for (let i = ship.waveEffects.length - 1; i >= 0; i--) {
      const wave = ship.waveEffects[i];
      wave.life--;
      wave.x += wave.velocityX;
      wave.y += wave.velocityY;
      
      // Remove expired waves
      if (wave.life <= 0) {
        ship.waveEffects.splice(i, 1);
      }
    }
  }
}

// Draw wave effects at Z-index 400 (after ground enemies, before powerups)
export function drawWaveEffects(renderer, tilemap, scrollY) {
  const ts = TILE_SIZE;
  
  for (const ship of tilemap.groundEnemySlots) {
    if (ship.type !== 'ship' && ship.type !== 'battleship') continue;
    
    for (const wave of ship.waveEffects) {
      const screenX = wave.x;
      const screenY = wave.y - scrollY;
      
      // Skip waves outside screen bounds
      if (screenY > 1280 + 32 || screenY < -32) continue;
      
      // Calculate fade alpha (0 to 1 based on remaining life)
      const alpha = Math.max(0, Math.min(1, wave.life / wave.maxLife));
      
      // Draw wave effect based on type
      if (wave.type === 'wake') {
        drawWakeEffect(renderer, screenX, screenY, alpha);
      } else if (wave.type === 'splash') {
        drawSplashEffect(renderer, screenX, screenY, alpha);
      } else if (wave.type === 'foam') {
        drawFoamEffect(renderer, screenX, screenY, alpha);
      }
    }
  }
}

// Draw individual wave effect types with geometric patterns
function drawWakeEffect(renderer, x, y, alpha) {
  // V-shaped wake pattern (32x16px)
  const fadeAlpha = (alpha * 0.8).toFixed(2);
  const lightAlpha = (alpha * 0.4).toFixed(2);
  
  // Main V-shape
  for (let i = 0; i < 8; i++) {
    // Left side of V
    renderer.fillRect(x + 8 - i, y + 8 + i, 2, 1, `rgba(255,255,255,${fadeAlpha})`);
    // Right side of V
    renderer.fillRect(x + 24 + i, y + 8 + i, 2, 1, `rgba(255,255,255,${fadeAlpha})`);
  }
  
  // Lighter foam trails
  for (let i = 0; i < 6; i++) {
    renderer.fillRect(x + 10 - i, y + 10 + i, 1, 1, `rgba(255,255,255,${lightAlpha})`);
    renderer.fillRect(x + 22 + i, y + 10 + i, 1, 1, `rgba(255,255,255,${lightAlpha})`);
  }
}

function drawSplashEffect(renderer, x, y, alpha) {
  // Circular splash pattern (32x16px)
  const centerX = x + 16;
  const centerY = y + 8;
  
  const outerAlpha = (alpha * 0.6).toFixed(2);
  const innerAlpha = (alpha * 0.8).toFixed(2);
  const coreAlpha = alpha.toFixed(2);
  
  // Outer splash ring
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const px = Math.floor(centerX + Math.cos(angle) * 7);
    const py = Math.floor(centerY + Math.sin(angle) * 4);
    renderer.fillRect(px, py, 2, 2, `rgba(255,255,255,${outerAlpha})`);
  }
  
  // Middle ring
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const px = Math.floor(centerX + Math.cos(angle) * 4);
    const py = Math.floor(centerY + Math.sin(angle) * 2);
    renderer.fillRect(px, py, 2, 1, `rgba(255,255,255,${innerAlpha})`);
  }
  
  // Center splash
  renderer.fillRect(centerX - 1, centerY - 1, 3, 2, `rgba(255,255,255,${coreAlpha})`);
}

function drawFoamEffect(renderer, x, y, alpha) {
  // Scattered foam pattern (32x16px)
  const foamAlpha = (alpha * 0.9).toFixed(2);
  const lightFoam = (alpha * 0.7).toFixed(2);
  const speckleAlpha = (alpha * 0.5).toFixed(2);
  
  // Large foam patches
  const patches = [
    {x: x + 2, y: y + 2, w: 4, h: 3},
    {x: x + 8, y: y + 1, w: 6, h: 2},
    {x: x + 18, y: y + 3, w: 5, h: 4},
    {x: x + 26, y: y + 1, w: 4, h: 3},
    {x: x + 1, y: y + 8, w: 5, h: 3},
    {x: x + 12, y: y + 10, w: 7, h: 4},
    {x: x + 22, y: y + 9, w: 6, h: 4},
  ];
  
  patches.forEach(patch => {
    renderer.fillRect(patch.x, patch.y, patch.w, patch.h, `rgba(255,255,255,${foamAlpha})`);
  });
  
  // Smaller foam dots
  const dots = [
    {x: x + 7, y: y + 5, w: 2, h: 2},
    {x: x + 15, y: y + 1, w: 2, h: 1},
    {x: x + 25, y: y + 6, w: 2, h: 2},
    {x: x + 11, y: y + 7, w: 1, h: 2},
  ];
  
  dots.forEach(dot => {
    renderer.fillRect(dot.x, dot.y, dot.w, dot.h, `rgba(255,255,255,${lightFoam})`);
  });
  
  // Fine foam speckles
  for (let i = 0; i < 8; i++) {
    const px = x + Math.floor(Math.random() * 32);
    const py = y + Math.floor(Math.random() * 16);
    renderer.fillRect(px, py, 1, 1, `rgba(255,255,255,${speckleAlpha})`);
  }
}

// ── Campaign Tilemap Configs ──
// Each campaign specifies map length. Longer maps = longer levels (F12).
export const CAMPAIGN_MAP_ROWS = {
  coral_front: 120,    // Tutorial — moderate length
  jungle_spear: 150,   // Longer — more terrain before boss
  dust_convoy: 180,    // Endurance — very long
  iron_monsoon: 200,   // The gauntlet — longest map
};

// ── Enhanced Geometric Tile Rendering ──

function drawGeometricWaterTile(renderer, x, y, size, tileType, baseColor, tick) {
  // Base water tile
  renderer.fillRect(x, y, size, size, baseColor);

  // Add geometric patterns based on tile type
  switch (tileType) {
    case 0: // Deep water - subtle current lines
      if ((x + y + tick) % 120 < 20) {
        const currentY = y + (tick * 0.3) % size;
        renderer.fillRect(x + 8, currentY, size - 16, 2, 'rgba(255,255,255,0.05)');
        renderer.fillRect(x + 16, currentY + 8, size - 32, 1, 'rgba(255,255,255,0.03)');
      }
      break;
      
    case 1: // Shallow water - lighter with subtle ripples
      const ripple = Math.sin(tick * 0.1 + x * 0.02 + y * 0.03) * 0.1;
      const lightColor = adjustColorBrightness(baseColor, ripple);
      renderer.fillRect(x, y, size, size, lightColor);
      break;
      
    case 2: // Dark water - deeper shadows
      renderer.fillRect(x, y, size, size, baseColor);
      // Add dark geometric patches
      const patchSize = 16 + Math.sin(tick * 0.05 + x * 0.01) * 4;
      renderer.fillRect(x + 8, y + 8, patchSize, patchSize, 'rgba(0,0,0,0.15)');
      break;
      
    case 3: // Foam/surf - dynamic white caps
      renderer.fillRect(x, y, size, size, baseColor);
      if ((tick + x + y) % 80 < 40) {
        // Animated foam lines
        const foamY = y + (tick % 32);
        renderer.fillRect(x + 4, foamY, size - 8, 3, 'rgba(255,255,255,0.4)');
        renderer.fillRect(x + 12, foamY + 6, size - 24, 2, 'rgba(255,255,255,0.2)');
      }
      break;
  }
}

function drawGeometricTerrainTile(renderer, x, y, size, tileType, baseColor, col, row) {
  // Base terrain tile
  renderer.fillRect(x, y, size, size, baseColor);

  // Add geometric details based on terrain type
  switch (tileType) {
    case 1: // Sand/beach - geometric dune patterns
      // Diagonal stripes for wind pattern
      for (let i = 0; i < 3; i++) {
        const stripeY = y + i * 16 + 8;
        const stripeOffset = (col + row + i) % 8;
        renderer.fillRect(x + stripeOffset, stripeY, size - stripeOffset - 4, 2, adjustColorBrightness(baseColor, 0.15));
      }
      break;
      
    case 2: // Vegetation - geometric leaf patterns
      // Square "leaf" clusters
      const leafSize = 8;
      for (let ly = 0; ly < 2; ly++) {
        for (let lx = 0; lx < 2; lx++) {
          const leafX = x + 12 + lx * 20 + ((col + row) % 4) * 2;
          const leafY = y + 12 + ly * 20 + ((col + row) % 3) * 2;
          renderer.fillRect(leafX, leafY, leafSize, leafSize, adjustColorBrightness(baseColor, 0.2));
          // Smaller highlight
          renderer.fillRect(leafX + 1, leafY + 1, 3, 3, adjustColorBrightness(baseColor, 0.4));
        }
      }
      break;
      
    case 3: // Rock - sharp geometric facets
      // Angular rock face pattern
      renderer.fillRect(x, y, size, size, baseColor);
      // Triangular facets
      const facetColor = adjustColorBrightness(baseColor, 0.25);
      renderer.fillPoly([
        { x: x + 8, y: y + 8 },
        { x: x + 24, y: y + 4 },
        { x: x + 32, y: y + 20 }
      ], facetColor);
      renderer.fillPoly([
        { x: x + 40, y: y + 16 },
        { x: x + 56, y: y + 8 },
        { x: x + 52, y: y + 32 }
      ], facetColor);
      // Sharp highlights
      renderer.fillRect(x + 12, y + 6, 2, 8, adjustColorBrightness(baseColor, 0.5));
      renderer.fillRect(x + 44, y + 10, 2, 6, adjustColorBrightness(baseColor, 0.5));
      break;
      
    case 4: // Structures - clean architectural lines
      // Base structure
      renderer.fillRect(x, y, size, size, baseColor);
      // Architectural elements
      const borderColor = adjustColorBrightness(baseColor, -0.2);
      const highlightColor = adjustColorBrightness(baseColor, 0.3);
      
      // Border frame
      renderer.fillRect(x, y, size, 4, borderColor);
      renderer.fillRect(x, y + size - 4, size, 4, borderColor);
      renderer.fillRect(x, y, 4, size, borderColor);
      renderer.fillRect(x + size - 4, y, 4, size, borderColor);
      
      // Interior geometric pattern
      renderer.fillRect(x + 12, y + 12, 16, 16, highlightColor);
      renderer.fillRect(x + 36, y + 12, 16, 16, highlightColor);
      renderer.fillRect(x + 24, y + 36, 16, 16, highlightColor);
      break;
  }
}

// Utility function to adjust color brightness
function adjustColorBrightness(hexColor, factor) {
  // Parse hex color
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Apply brightness factor
  const newR = Math.min(255, Math.max(0, r + (factor * 255)));
  const newG = Math.min(255, Math.max(0, g + (factor * 255)));
  const newB = Math.min(255, Math.max(0, b + (factor * 255)));
  
  // Convert back to hex
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}
