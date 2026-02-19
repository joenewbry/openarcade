// simcity/game.js — SimCity game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// Grid
const GRID = 30;
const MAP_SIZE = 40; // 40x40 world grid
const VIEW_COLS = Math.floor(W / GRID); // 20 visible
const VIEW_ROWS = Math.floor(H / GRID); // 20 visible

// Zone types
const ZONE = {
  EMPTY: 0,
  RESIDENTIAL: 1,
  COMMERCIAL: 2,
  INDUSTRIAL: 3,
  ROAD: 4,
  POWER: 5,
  PARK: 6
};

const ZONE_NAMES = ['Empty', 'Residential', 'Commercial', 'Industrial', 'Road', 'Power Plant', 'Park'];
const ZONE_COSTS = [0, 10, 15, 15, 5, 50, 20];
const ZONE_COLORS = [
  '#1a1a2e',   // empty
  '#0c4',      // residential - green
  '#28f',      // commercial - blue
  '#ec0',      // industrial - yellow
  '#666',      // road - gray
  '#f33',      // power - red
  '#3b3',      // park - bright green
];

// ── State ──
let score, best;
let money, population, happiness, tick;
let map, levelMap, poweredMap;
let selectedZone, viewX, viewY;
let mouseX, mouseY;
let scrollSpeed;
let taxTimer, growthTimer, bankruptTimer;
let placeFeedback, particles;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Mouse/click event queue ──
let pendingClicks = [];

// ── Helper functions ──

function nearRoad(x, y) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.some(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    return nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE && map[ny][nx] === ZONE.ROAD;
  });
}

function updatePower() {
  for (let y = 0; y < MAP_SIZE; y++)
    for (let x = 0; x < MAP_SIZE; x++)
      poweredMap[y][x] = false;

  const POWER_RANGE = 6;
  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      if (map[py][px] === ZONE.POWER) {
        const visited = new Set();
        const queue = [{ x: px, y: py, dist: 0 }];
        visited.add(px + ',' + py);
        poweredMap[py][px] = true;

        while (queue.length > 0) {
          const { x, y, dist } = queue.shift();
          if (dist >= POWER_RANGE) continue;

          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            const key = nx + ',' + ny;
            if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
            if (visited.has(key)) continue;
            if (map[ny][nx] === ZONE.EMPTY) continue;
            visited.add(key);
            poweredMap[ny][nx] = true;
            queue.push({ x: nx, y: ny, dist: dist + 1 });
          }
        }
      }
    }
  }
}

function calcHappiness() {
  let totalHappy = 0;
  let resCount = 0;

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x] === ZONE.RESIDENTIAL && levelMap[y][x] > 0) {
        resCount++;
        let cellHappy = 40;

        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
              if (map[ny][nx] === ZONE.PARK) cellHappy += 12;
            }
          }
        }

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
              if (map[ny][nx] === ZONE.INDUSTRIAL) cellHappy -= 8;
            }
          }
        }

        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
              if (map[ny][nx] === ZONE.COMMERCIAL && levelMap[ny][nx] > 0) cellHappy += 5;
            }
          }
        }

        totalHappy += Math.max(0, Math.min(100, cellHappy));
      }
    }
  }

  return resCount > 0 ? Math.round(totalHappy / resCount) : 50;
}

function countZones(type) {
  let c = 0;
  for (let y = 0; y < MAP_SIZE; y++)
    for (let x = 0; x < MAP_SIZE; x++)
      if (map[y][x] === type) c++;
  return c;
}

function countJobs() {
  let jobs = 0;
  for (let y = 0; y < MAP_SIZE; y++)
    for (let x = 0; x < MAP_SIZE; x++)
      if (map[y][x] === ZONE.INDUSTRIAL) jobs += levelMap[y][x] * 8;
  return jobs;
}

function countCommerce() {
  let comm = 0;
  for (let y = 0; y < MAP_SIZE; y++)
    for (let x = 0; x < MAP_SIZE; x++)
      if (map[y][x] === ZONE.COMMERCIAL) comm += levelMap[y][x] * 5;
  return comm;
}

function spawnGrowthParticles(gx, gy, color) {
  const px = (gx - Math.floor(viewX)) * GRID + GRID / 2;
  const py = (gy - Math.floor(viewY)) * GRID + GRID / 2;
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2 - 1,
      life: 20 + Math.random() * 10,
      color: color
    });
  }
}

function doGrowth() {
  const jobs = countJobs();
  const commerce = countCommerce();

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const zone = map[y][x];
      if (zone === ZONE.EMPTY || zone === ZONE.ROAD || zone === ZONE.PARK) continue;

      const road = nearRoad(x, y);
      const powered = poweredMap[y][x];

      if (zone === ZONE.RESIDENTIAL) {
        if (road && powered && levelMap[y][x] < 5) {
          const demandMet = jobs >= population * 0.5 && commerce >= population * 0.3;
          const growChance = demandMet ? 0.15 : 0.03;
          const happyBonus = happiness > 60 ? 0.1 : 0;
          if (Math.random() < growChance + happyBonus) {
            levelMap[y][x]++;
            spawnGrowthParticles(x, y, ZONE_COLORS[ZONE.RESIDENTIAL]);
          }
        }
        if ((!road || !powered) && levelMap[y][x] > 0 && Math.random() < 0.05) {
          levelMap[y][x]--;
        }
      }

      if (zone === ZONE.COMMERCIAL) {
        if (road && powered && levelMap[y][x] < 4) {
          const growChance = population > 10 ? 0.12 : 0.02;
          if (Math.random() < growChance) {
            levelMap[y][x]++;
            spawnGrowthParticles(x, y, ZONE_COLORS[ZONE.COMMERCIAL]);
          }
        }
        if ((!road || !powered) && levelMap[y][x] > 0 && Math.random() < 0.05) {
          levelMap[y][x]--;
        }
      }

      if (zone === ZONE.INDUSTRIAL) {
        if (road && powered && levelMap[y][x] < 3) {
          const growChance = population > 5 ? 0.1 : 0.02;
          if (Math.random() < growChance) {
            levelMap[y][x]++;
            spawnGrowthParticles(x, y, ZONE_COLORS[ZONE.INDUSTRIAL]);
          }
        }
        if ((!road || !powered) && levelMap[y][x] > 0 && Math.random() < 0.05) {
          levelMap[y][x]--;
        }
      }

      if (zone === ZONE.POWER) {
        levelMap[y][x] = 1;
      }
    }
  }
}

function collectTaxes() {
  const taxIncome = population * 2 + countCommerce() * 1;
  const roadCost = countZones(ZONE.ROAD) * 0.5;
  const powerCost = countZones(ZONE.POWER) * 3;
  const net = Math.round(taxIncome - roadCost - powerCost);
  money += net;
}

function placeZone(gx, gy, game) {
  if (game.state !== 'playing') return;
  const wx = Math.floor(viewX) + gx;
  const wy = Math.floor(viewY) + gy;

  if (wx < 0 || wx >= MAP_SIZE || wy < 0 || wy >= MAP_SIZE) return;
  if (map[wy][wx] !== ZONE.EMPTY) return;

  const cost = ZONE_COSTS[selectedZone];
  if (money < cost) return;

  money -= cost;
  map[wy][wx] = selectedZone;
  levelMap[wy][wx] = (selectedZone === ZONE.ROAD || selectedZone === ZONE.PARK) ? 1 :
                      (selectedZone === ZONE.POWER) ? 1 : 0;

  if (selectedZone === ZONE.POWER) updatePower();

  placeFeedback.push({
    x: gx * GRID + GRID / 2,
    y: gy * GRID + GRID / 2,
    text: '-$' + cost,
    life: 40
  });

  for (let i = 0; i < 6; i++) {
    particles.push({
      x: gx * GRID + GRID / 2,
      y: gy * GRID + GRID / 2,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 15,
      color: ZONE_COLORS[selectedZone]
    });
  }
}

function updateZoneKeyIndicators() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById('zk' + i);
    if (!el) continue;
    if (i === selectedZone) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

// Expand #rgb to #rrggbb so we can append alpha hex
function expandHex(color) {
  if (color.length === 4) { // #rgb
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color; // already #rrggbb or longer
}

// ── Drawing helpers ──

function drawZoneCell(r, text, sx, sy, zone, level, powered, wx, wy) {
  const pulse = Math.sin(tick * 0.05) * 0.15 + 0.85;

  if (zone === ZONE.ROAD) {
    r.fillRect(sx + 1, sy + 1, GRID - 2, GRID - 2, '#444');
    // Center line markings
    if ((wx > 0 && map[wy][wx - 1] === ZONE.ROAD) || (wx < MAP_SIZE - 1 && map[wy][wx + 1] === ZONE.ROAD)) {
      r.fillRect(sx + GRID / 2 - 1, sy + GRID / 4, 2, GRID / 2, '#666');
    }
    if ((wy > 0 && map[wy - 1][wx] === ZONE.ROAD) || (wy < MAP_SIZE - 1 && map[wy + 1][wx] === ZONE.ROAD)) {
      r.fillRect(sx + GRID / 4, sy + GRID / 2 - 1, GRID / 2, 2, '#666');
    }
    return;
  }

  if (zone === ZONE.PARK) {
    r.fillRect(sx + 1, sy + 1, GRID - 2, GRID - 2, '#1a3a1a');
    r.setGlow('#3b3', 0.4);
    r.fillCircle(sx + 10, sy + 12, 5, '#3b3');
    r.fillCircle(sx + 22, sy + 18, 6, '#3b3');
    r.fillCircle(sx + 14, sy + 24, 4, '#3b3');
    r.setGlow(null);
    // Trunks
    r.fillRect(sx + 9, sy + 16, 2, 5, '#654');
    r.fillRect(sx + 21, sy + 23, 2, 5, '#654');
    return;
  }

  if (zone === ZONE.POWER) {
    r.fillRect(sx + 1, sy + 1, GRID - 2, GRID - 2, '#411');
    const glowStr = pulse * 0.6;
    r.setGlow('#f33', glowStr);
    // Building shape
    r.fillRect(sx + 4, sy + 8, 10, 18, '#f33');
    r.fillRect(sx + 16, sy + 4, 10, 22, '#f33');
    r.setGlow(null);
    // Chimney smoke
    const smokeAlpha = Math.floor(pulse * 0.6 * 255).toString(16).padStart(2, '0');
    r.fillCircle(sx + 21, sy + 2, 3, '#ff6464' + smokeAlpha);
    // Lightning icon
    text.drawText('\u26A1', sx + GRID / 2, sy + GRID / 2 - 6, 12, '#ff0', 'center');
    return;
  }

  // Building zones (Residential, Commercial, Industrial)
  const dimColor = powered ? ZONE_COLORS[zone] : '#333';
  const bgColor = zone === ZONE.RESIDENTIAL ? '#0a2a0a' :
                  zone === ZONE.COMMERCIAL ? '#0a0a2a' :
                  '#2a2a0a';
  r.fillRect(sx + 1, sy + 1, GRID - 2, GRID - 2, bgColor);

  if (level === 0) {
    // Empty lot - dashed border effect using small segments
    const dashLen = 3;
    const gap = 3;
    const x0 = sx + 3, y0 = sy + 3, w = GRID - 6, h = GRID - 6;
    // Top edge
    for (let d = 0; d < w; d += dashLen + gap) {
      const segW = Math.min(dashLen, w - d);
      r.fillRect(x0 + d, y0, segW, 1, dimColor);
    }
    // Bottom edge
    for (let d = 0; d < w; d += dashLen + gap) {
      const segW = Math.min(dashLen, w - d);
      r.fillRect(x0 + d, y0 + h, segW, 1, dimColor);
    }
    // Left edge
    for (let d = 0; d < h; d += dashLen + gap) {
      const segH = Math.min(dashLen, h - d);
      r.fillRect(x0, y0 + d, 1, segH, dimColor);
    }
    // Right edge
    for (let d = 0; d < h; d += dashLen + gap) {
      const segH = Math.min(dashLen, h - d);
      r.fillRect(x0 + w, y0 + d, 1, segH, dimColor);
    }
    // Zone letter
    const letter = zone === ZONE.RESIDENTIAL ? 'R' : zone === ZONE.COMMERCIAL ? 'C' : 'I';
    text.drawText(letter, sx + GRID / 2, sy + GRID / 2 - 5, 10, expandHex(dimColor) + '66', 'center');
    return;
  }

  // Buildings based on level
  r.setGlow(dimColor, 0.3);

  if (level === 1) {
    // Small house/shop/factory
    r.fillRect(sx + 8, sy + 14, 14, 12, dimColor);
    // Roof triangle
    r.fillPoly([
      { x: sx + 6, y: sy + 14 },
      { x: sx + 15, y: sy + 6 },
      { x: sx + 24, y: sy + 14 }
    ], dimColor);
  } else if (level === 2) {
    // Medium building
    r.fillRect(sx + 6, sy + 8, 18, 18, dimColor);
    // Windows
    const winColor = powered ? '#ff8' : '#333';
    r.fillRect(sx + 9, sy + 11, 3, 3, winColor);
    r.fillRect(sx + 18, sy + 11, 3, 3, winColor);
    r.fillRect(sx + 9, sy + 18, 3, 3, winColor);
    r.fillRect(sx + 18, sy + 18, 3, 3, winColor);
  } else if (level === 3) {
    // Tall building
    r.fillRect(sx + 7, sy + 3, 16, 23, dimColor);
    const winColor = powered ? '#ff8' : '#333';
    for (let wy2 = 0; wy2 < 4; wy2++) {
      r.fillRect(sx + 10, sy + 5 + wy2 * 5, 3, 3, winColor);
      r.fillRect(sx + 17, sy + 5 + wy2 * 5, 3, 3, winColor);
    }
  } else if (level === 4) {
    // High rise
    r.fillRect(sx + 5, sy + 2, 12, 24, dimColor);
    r.fillRect(sx + 13, sy + 6, 12, 20, dimColor);
    const winColor = powered ? '#ff8' : '#333';
    for (let wy2 = 0; wy2 < 5; wy2++) {
      r.fillRect(sx + 8, sy + 4 + wy2 * 4, 2, 2, winColor);
      r.fillRect(sx + 16, sy + 8 + wy2 * 4, 2, 2, winColor);
    }
  } else {
    // Skyscraper (level 5)
    r.fillRect(sx + 6, sy + 1, 18, 25, dimColor);
    const winColor = powered ? '#ff8' : '#333';
    for (let wy2 = 0; wy2 < 6; wy2++) {
      for (let wx2 = 0; wx2 < 3; wx2++) {
        r.fillRect(sx + 9 + wx2 * 5, sy + 3 + wy2 * 4, 2, 2, winColor);
      }
    }
    // Antenna
    r.fillRect(sx + 14, sy - 3, 2, 5, dimColor);
    // Blinking light
    if (Math.sin(tick * 0.1) > 0) {
      r.fillRect(sx + 14, sy - 4, 2, 2, '#f00');
    }
  }
  r.setGlow(null);

  // Unpowered indicator
  if (!powered && level > 0) {
    text.drawText('!', sx + GRID / 2, sy + GRID - 12, 10, '#ff00004d', 'center');
  }
}

function drawHUD(r, text) {
  // Top HUD bar
  r.fillRect(0, 0, W, 32, '#16213eda');
  r.drawLine(0, 32, W, 32, '#ffaa004d', 1);

  // Population
  r.setGlow('#0c4', 0.4);
  text.drawText('\u263A ' + population, 10, 4, 12, '#0c4', 'left');
  r.setGlow(null);

  // Money
  const moneyColor = money < 0 ? '#f44' : '#fa0';
  r.setGlow(moneyColor, 0.4);
  text.drawText('$' + money, 120, 4, 12, moneyColor, 'left');
  r.setGlow(null);

  // Happiness
  const happyColor = happiness >= 60 ? '#0c4' : happiness >= 40 ? '#ec0' : '#f44';
  r.setGlow(happyColor, 0.4);
  text.drawText('\u2665 ' + happiness + '%', 240, 4, 12, happyColor, 'left');
  r.setGlow(null);

  // Selected tool
  r.setGlow(ZONE_COLORS[selectedZone], 0.4);
  text.drawText('[' + ZONE_NAMES[selectedZone].toUpperCase() + ' $' + ZONE_COSTS[selectedZone] + ']', W - 10, 4, 12, ZONE_COLORS[selectedZone], 'right');
  r.setGlow(null);

  // Bankruptcy warning
  if (money < 0) {
    const flash = Math.sin(tick * 0.15) > 0;
    if (flash) {
      r.setGlow('#f44', 0.8);
      text.drawText('GOING BANKRUPT!', W / 2, 2, 14, '#f44', 'center');
      r.setGlow(null);
    }
  }

  // Bottom HUD bar
  r.fillRect(0, H - 24, W, 24, '#16213eda');
  r.drawLine(0, H - 24, W, H - 24, '#ffaa004d', 1);

  // Jobs bar
  const jobs = countJobs();
  const jobDemand = Math.max(1, Math.floor(population * 0.5));
  const jobRatio = Math.min(1, jobs / jobDemand);
  text.drawText('Jobs:', 10, H - 22, 10, '#ec0', 'left');
  r.fillRect(55, H - 17, 80, 10, '#333');
  r.fillRect(55, H - 17, 80 * jobRatio, 10, jobRatio > 0.5 ? '#ec0' : '#f44');

  // Commerce bar
  const comm = countCommerce();
  const commDemand = Math.max(1, Math.floor(population * 0.3));
  const commRatio = Math.min(1, comm / commDemand);
  text.drawText('Shop:', 155, H - 22, 10, '#28f', 'left');
  r.fillRect(200, H - 17, 80, 10, '#333');
  r.fillRect(200, H - 17, 80 * commRatio, 10, commRatio > 0.5 ? '#28f' : '#f44');

  // Power coverage
  let poweredCount = 0, totalBuildings = 0;
  for (let y = 0; y < MAP_SIZE; y++)
    for (let x = 0; x < MAP_SIZE; x++)
      if (map[y][x] >= 1 && map[y][x] <= 3) {
        totalBuildings++;
        if (poweredMap[y][x]) poweredCount++;
      }
  const powerRatio = totalBuildings > 0 ? poweredCount / totalBuildings : 1;
  text.drawText('Pwr:', 300, H - 22, 10, '#f33', 'left');
  r.fillRect(340, H - 17, 80, 10, '#333');
  r.fillRect(340, H - 17, 80 * powerRatio, 10, powerRatio > 0.7 ? '#f33' : '#f44');

  // Time counter
  const minutes = Math.floor(tick / 3600);
  const seconds = Math.floor((tick % 3600) / 60);
  text.drawText('Time: ' + minutes + ':' + String(seconds).padStart(2, '0'), W - 10, H - 22, 10, '#888', 'right');
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  best = 0;

  const canvasEl = document.getElementById('game');

  // Mouse handlers
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvasEl.addEventListener('mouseleave', () => {
    mouseX = -1;
    mouseY = -1;
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    pendingClicks.push({ x: mx, y: my });
  });

  game.onInit = () => {
    score = 0;
    money = 500;
    population = 0;
    happiness = 50;
    tick = 0;
    taxTimer = 0;
    growthTimer = 0;
    bankruptTimer = 0;
    selectedZone = ZONE.RESIDENTIAL;
    viewX = 10;
    viewY = 10;
    mouseX = -1;
    mouseY = -1;
    scrollSpeed = 3;
    placeFeedback = [];
    particles = [];
    pendingClicks = [];

    // Initialize maps
    map = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(ZONE.EMPTY));
    levelMap = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(0));
    poweredMap = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(false));

    // Place starter roads in center
    const cx = 20, cy = 20;
    for (let i = -3; i <= 3; i++) {
      map[cy][cx + i] = ZONE.ROAD;
      map[cy + i][cx] = ZONE.ROAD;
    }
    // Starter power plant
    map[cy - 1][cx - 1] = ZONE.POWER;
    // Starter residential
    map[cy - 1][cx + 1] = ZONE.RESIDENTIAL;
    map[cy + 1][cx + 1] = ZONE.RESIDENTIAL;
    // Starter commercial
    map[cy + 1][cx - 1] = ZONE.COMMERCIAL;

    scoreEl.textContent = '0';
    updateZoneKeyIndicators();
    game.showOverlay('SIMCITY', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;

    // Zone selection keys
    if (input.wasPressed('1')) { selectedZone = ZONE.RESIDENTIAL; updateZoneKeyIndicators(); }
    if (input.wasPressed('2')) { selectedZone = ZONE.COMMERCIAL; updateZoneKeyIndicators(); }
    if (input.wasPressed('3')) { selectedZone = ZONE.INDUSTRIAL; updateZoneKeyIndicators(); }
    if (input.wasPressed('4')) { selectedZone = ZONE.ROAD; updateZoneKeyIndicators(); }
    if (input.wasPressed('5')) { selectedZone = ZONE.POWER; updateZoneKeyIndicators(); }
    if (input.wasPressed('6')) { selectedZone = ZONE.PARK; updateZoneKeyIndicators(); }

    // Scroll with arrow keys (dt is fixed at ~16.67ms in engine, so scale by 1/60)
    const scrollDt = 1 / 60;
    if (input.isDown('ArrowLeft')) viewX = Math.max(0, viewX - scrollSpeed * scrollDt * 10);
    if (input.isDown('ArrowRight')) viewX = Math.min(MAP_SIZE - VIEW_COLS, viewX + scrollSpeed * scrollDt * 10);
    if (input.isDown('ArrowUp')) viewY = Math.max(0, viewY - scrollSpeed * scrollDt * 10);
    if (input.isDown('ArrowDown')) viewY = Math.min(MAP_SIZE - VIEW_ROWS, viewY + scrollSpeed * scrollDt * 10);

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const mx = click.x;
      const my = click.y;

      // Ignore clicks on HUD areas
      if (my < 32 || my > H - 24) continue;

      const offX = (viewX - Math.floor(viewX)) * GRID;
      const offY = (viewY - Math.floor(viewY)) * GRID;
      const gx = Math.floor((mx + offX) / GRID);
      const gy = Math.floor((my + offY) / GRID);
      placeZone(gx, gy, game);
    }

    // Update power every 30 ticks
    if (tick % 30 === 0) {
      updatePower();
    }

    // Growth tick every 60 frames
    growthTimer++;
    if (growthTimer >= 60) {
      growthTimer = 0;
      doGrowth();
    }

    // Tax collection every 300 frames
    taxTimer++;
    if (taxTimer >= 300) {
      taxTimer = 0;
      collectTaxes();
    }

    // Calculate population
    let pop = 0;
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++)
        if (map[y][x] === ZONE.RESIDENTIAL)
          pop += levelMap[y][x] * 4;

    population = pop;
    score = pop;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Update happiness
    if (tick % 60 === 0) {
      happiness = calcHappiness();
    }

    // Bankruptcy check
    if (money < 0) {
      bankruptTimer++;
      if (bankruptTimer > 600) {
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        game.showOverlay('BANKRUPT', 'Population: ' + score + ' -- Press SPACE to restart');
        game.setState('over');
        return;
      }
    } else {
      bankruptTimer = 0;
    }

    // Update place feedback
    for (let i = placeFeedback.length - 1; i >= 0; i--) {
      placeFeedback[i].life--;
      if (placeFeedback[i].life <= 0) placeFeedback.splice(i, 1);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    const vx = Math.floor(viewX);
    const vy = Math.floor(viewY);
    const offX = (viewX - vx) * GRID;
    const offY = (viewY - vy) * GRID;

    // Draw grid lines
    for (let x = 0; x <= VIEW_COLS; x++) {
      const sx = x * GRID - offX;
      renderer.drawLine(sx, 0, sx, H, '#16213e', 0.5);
    }
    for (let y = 0; y <= VIEW_ROWS; y++) {
      const sy = y * GRID - offY;
      renderer.drawLine(0, sy, W, sy, '#16213e', 0.5);
    }

    // Draw zones
    for (let dy = -1; dy <= VIEW_ROWS + 1; dy++) {
      for (let dx = -1; dx <= VIEW_COLS + 1; dx++) {
        const wx = vx + dx;
        const wy = vy + dy;
        if (wx < 0 || wx >= MAP_SIZE || wy < 0 || wy >= MAP_SIZE) continue;

        const zone = map[wy][wx];
        if (zone === ZONE.EMPTY) continue;

        const sx = dx * GRID - offX;
        const sy = dy * GRID - offY;
        const level = levelMap[wy][wx];
        const powered = poweredMap[wy][wx];

        drawZoneCell(renderer, text, sx, sy, zone, level, powered, wx, wy);
      }
    }

    // Cursor / placement preview
    if (game.state === 'playing' && mouseX >= 0 && mouseY >= 0) {
      const gx = Math.floor((mouseX + offX) / GRID);
      const gy = Math.floor((mouseY + offY) / GRID);
      const wx = vx + gx;
      const wy = vy + gy;
      const sx = gx * GRID - offX;
      const sy = gy * GRID - offY;

      if (wx >= 0 && wx < MAP_SIZE && wy >= 0 && wy < MAP_SIZE) {
        const valid = map[wy][wx] === ZONE.EMPTY;
        const affordable = money >= ZONE_COSTS[selectedZone];

        // Preview highlight
        const previewColor = valid && affordable ? '#ffaa0026' : '#ff444426';
        renderer.fillRect(sx, sy, GRID, GRID, previewColor);
        // Border
        const borderColor = valid && affordable ? '#fa0' : '#f44';
        renderer.drawLine(sx, sy, sx + GRID, sy, borderColor, 1.5);
        renderer.drawLine(sx + GRID, sy, sx + GRID, sy + GRID, borderColor, 1.5);
        renderer.drawLine(sx + GRID, sy + GRID, sx, sy + GRID, borderColor, 1.5);
        renderer.drawLine(sx, sy + GRID, sx, sy, borderColor, 1.5);

        // Zone type preview text
        text.drawText(ZONE_NAMES[selectedZone] + ' $' + ZONE_COSTS[selectedZone],
          sx + GRID / 2, sy - 12, 9, borderColor, 'center');

        // Power range preview for power plants
        if (selectedZone === ZONE.POWER && valid && affordable) {
          // Draw power range as a circle of small segments
          const centerX = sx + GRID / 2;
          const centerY = sy + GRID / 2;
          const radius = 6 * GRID;
          const segments = 32;
          for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i + 1) / segments) * Math.PI * 2;
            renderer.drawLine(
              centerX + Math.cos(a1) * radius,
              centerY + Math.sin(a1) * radius,
              centerX + Math.cos(a2) * radius,
              centerY + Math.sin(a2) * radius,
              '#ff333333', 1
            );
          }
        }
      }
    }

    // Place feedback (cost text floating up)
    for (const f of placeFeedback) {
      const alpha = Math.floor((f.life / 40) * 255).toString(16).padStart(2, '0');
      text.drawText(f.text, f.x, f.y - (40 - f.life) * 0.8 - 6, 12, '#ffaa00' + alpha, 'center');
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 15);
      const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, expandHex(p.color) + alphaHex);
    }

    // HUD (drawn last, on top)
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
