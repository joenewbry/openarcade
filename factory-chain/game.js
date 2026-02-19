// factory-chain/game.js — Factory Chain game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ---- Constants ----
const COLS = 10, ROWS = 8, CELL = 27;
const DIV_X = 300;
const P_OX = 8, P_OY = 42;   // player factory pixel offset
const A_OX = 308, A_OY = 42; // AI factory pixel offset
const GAME_SECS = 180;

const MTYPE = {
  smelter:     { name:'Smelter',     cost:5,  w:2, h:2, ticks:80,  input:'ore',   output:'ingot',   col:'#e88030', sym:'S', val:2  },
  assembler:   { name:'Assembler',   cost:8,  w:2, h:2, ticks:110, input:'ingot', output:'part',    col:'#50a0e0', sym:'A', val:5  },
  constructor: { name:'Constructor', cost:12, w:2, h:2, ticks:150, input:'part',  output:'product', col:'#b060e0', sym:'C', val:15 },
};

// ---- Module-scope state ----
let score, pScore, aScore;
let timeLeft, playerMoney, aiMoney;
let pGrid, aGrid;
let pMachines, aMachines;
let pBelts, aBelts;
let selectedTool, beltStart, hoverCell;
let aiTimer, machineIdCounter;
let frameCounter;

// belt animation phase (updated each frame)
let beltPhase = 0;

// ---- DOM refs ----
const scoreEl    = document.getElementById('score');
const aiScoreEl  = document.getElementById('aiScore');
const timerEl    = document.getElementById('timer');
const infoEl     = document.getElementById('infoText');

// ---- Mouse event queues ----
let pendingClicks = [];
let pendingMoves  = [];

// ---- Grid helpers ----
function makeGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    g[r] = [];
    for (let c = 0; c < COLS; c++) g[r][c] = 0;
  }
  return g;
}

function canPlace(grid, gx, gy, type) {
  const t = MTYPE[type];
  if (gx < 0 || gy < 0 || gx + t.w > COLS || gy + t.h > ROWS) return false;
  for (let dy = 0; dy < t.h; dy++)
    for (let dx = 0; dx < t.w; dx++)
      if (grid[gy+dy][gx+dx] !== 0) return false;
  return true;
}

function placeMach(grid, machines, gx, gy, type) {
  const id = machineIdCounter++;
  const m = { id, type, gx, gy, inBuf: 0, progress: 0, outBuf: 0 };
  machines.push(m);
  const t = MTYPE[type];
  for (let dy = 0; dy < t.h; dy++)
    for (let dx = 0; dx < t.w; dx++)
      grid[gy+dy][gx+dx] = 'm' + id;
  return m;
}

function placeBeltLine(grid, belts, x1, y1, x2, y2) {
  let placed = 0;
  let cx = x1, cy = y1;
  const steps = Math.abs(x2-x1) + Math.abs(y2-y1);
  for (let s = 0; s <= steps && s < 40; s++) {
    if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && grid[cy][cx] === 0) {
      grid[cy][cx] = 'b';
      let dir = 0;
      if (cx !== x2) dir = x2 > cx ? 0 : 2;
      else if (cy !== y2) dir = y2 > cy ? 1 : 3;
      belts.push({ gx: cx, gy: cy, dir });
      placed++;
    }
    if (cx !== x2) cx += x2 > cx ? 1 : -1;
    else if (cy !== y2) cy += y2 > cy ? 1 : -1;
    else break;
  }
  return placed;
}

function removeTile(grid, machines, belts, gx, gy) {
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return 0;
  const cell = grid[gy][gx];
  if (cell === 'b') {
    grid[gy][gx] = 0;
    const i = belts.findIndex(b => b.gx === gx && b.gy === gy);
    if (i >= 0) belts.splice(i, 1);
    return 0;
  }
  if (typeof cell === 'string' && cell[0] === 'm') {
    const mid = parseInt(cell.substring(1));
    const mi = machines.findIndex(m => m.id === mid);
    if (mi >= 0) {
      const m = machines[mi];
      const t = MTYPE[m.type];
      for (let dy = 0; dy < t.h; dy++)
        for (let dx = 0; dx < t.w; dx++)
          grid[m.gy+dy][m.gx+dx] = 0;
      machines.splice(mi, 1);
      return Math.floor(t.cost / 2);
    }
  }
  return 0;
}

// ---- Production simulation ----
function getMachineById(machines, id) {
  return machines.find(m => m.id === id);
}

function walkBelts(grid, machines, startX, startY, direction) {
  const dx = direction === 'right' ? 1 : -1;
  let x = startX, y = startY;
  const visited = new Set();
  for (let steps = 0; steps < 30; steps++) {
    const key = x + ',' + y;
    if (visited.has(key)) break;
    visited.add(key);
    const cell = grid[y] && grid[y][x];
    if (cell === undefined) break;

    if (steps > 0 && typeof cell === 'string' && cell[0] === 'm') {
      const mid = parseInt(cell.substring(1));
      return { type: 'machine', machine: getMachineById(machines, mid) };
    }

    if (direction === 'right' && x >= COLS) return { type: 'exit' };
    if (direction === 'left'  && x < 0)    return { type: 'edge' };

    if (steps > 0 && cell !== 'b') break;

    let nx = x + dx, ny = y;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      const nc = grid[ny][nx];
      if (nc === 'b' || (typeof nc === 'string' && nc[0] === 'm')) { x = nx; continue; }
    }
    if (nx >= COLS && direction === 'right') return { type: 'exit' };
    if (nx < 0    && direction === 'left')  return { type: 'edge' };

    let found = false;
    for (const pdy of [1, -1]) {
      const py = y + pdy;
      if (py >= 0 && py < ROWS) {
        const pc = grid[py][x];
        if (pc === 'b' || (typeof pc === 'string' && pc[0] === 'm')) {
          y = py; found = true; break;
        }
      }
    }
    if (!found) break;
  }
  return null;
}

function getInputSource(grid, machines, m) {
  const t = MTYPE[m.type];
  const lx = m.gx - 1;
  if (m.gx === 0) return { type: 'edge' };

  for (let dy = 0; dy < t.h; dy++) {
    if (lx >= 0 && lx < COLS) {
      const cell = grid[m.gy + dy][lx];
      if (cell === 'b') {
        const result = walkBelts(grid, machines, lx, m.gy + dy, 'left');
        if (result) return result;
      }
      if (typeof cell === 'string' && cell[0] === 'm') {
        const mid = parseInt(cell.substring(1));
        const src = getMachineById(machines, mid);
        if (src) return { type: 'machine', machine: src };
      }
    }
  }
  return null;
}

function getOutputDest(grid, machines, m) {
  const t = MTYPE[m.type];
  const rx = m.gx + t.w;
  if (rx >= COLS) return { type: 'exit' };

  for (let dy = 0; dy < t.h; dy++) {
    if (rx >= 0 && rx < COLS) {
      const cell = grid[m.gy + dy][rx];
      if (cell === 'b') {
        const result = walkBelts(grid, machines, rx, m.gy + dy, 'right');
        if (result) return result;
      }
      if (typeof cell === 'string' && cell[0] === 'm') {
        const mid = parseInt(cell.substring(1));
        const dst = getMachineById(machines, mid);
        if (dst) return { type: 'machine', machine: dst };
      }
    }
  }
  return null;
}

function simulate(dt, grid, machines) {
  const tick = dt / (1000 / 60);
  let earned = 0;

  for (const m of machines) {
    const t = MTYPE[m.type];

    if (m.inBuf < 3) {
      const src = getInputSource(grid, machines, m);
      if (src) {
        if (m.type === 'smelter') {
          if (src.type === 'edge') {
            m.inBuf = Math.min(3, m.inBuf + 0.025 * tick);
          } else if (src.type === 'machine' && src.machine) {
            const srcT = MTYPE[src.machine.type];
            if (srcT.output === t.input && src.machine.outBuf >= 1) {
              src.machine.outBuf -= 1;
              m.inBuf += 1;
            }
          }
        } else {
          if (src.type === 'machine' && src.machine) {
            const srcT = MTYPE[src.machine.type];
            if (srcT.output === t.input && src.machine.outBuf >= 1) {
              src.machine.outBuf -= 1;
              m.inBuf += 1;
            }
          }
        }
      }
    }

    if (m.inBuf >= 1 && m.outBuf < 3) {
      m.progress += tick;
      if (m.progress >= t.ticks) {
        m.progress = 0;
        m.inBuf   -= 1;
        m.outBuf  += 1;
      }
    }

    if (m.outBuf >= 1) {
      const dest = getOutputDest(grid, machines, m);
      if (dest) {
        if (dest.type === 'exit') {
          earned  += MTYPE[m.type].val;
          m.outBuf -= 1;
        }
      }
    }
  }

  return earned;
}

// ---- AI Strategy ----
function aiAct() {
  const sm = aMachines.filter(m => m.type === 'smelter');
  const as = aMachines.filter(m => m.type === 'assembler');
  const cs = aMachines.filter(m => m.type === 'constructor');

  if (sm.length === 0 && aiMoney >= 5) {
    const pos = aiFind('smelter', 0, 1);
    if (pos) { aiMoney -= 5; placeMach(aGrid, aMachines, pos.x, pos.y, 'smelter'); return; }
  }

  if (sm.length >= 1 && as.length === 0 && aiMoney >= 10) {
    const pos = aiFind('assembler', 4, 6);
    if (pos) {
      aiMoney -= 8;
      const m = placeMach(aGrid, aMachines, pos.x, pos.y, 'assembler');
      const cost = aiConnectBelt(sm[0], m);
      aiMoney -= cost;
      return;
    }
  }

  if (as.length >= 1 && cs.length === 0) {
    const a = as[0];
    const dest = getOutputDest(aGrid, aMachines, a);
    if (!dest && aiMoney >= 2) {
      const rx = a.gx + MTYPE.assembler.w;
      for (let x = rx; x < COLS && aiMoney >= 1; x++) {
        if (aGrid[a.gy][x] === 0) {
          aGrid[a.gy][x] = 'b';
          aBelts.push({ gx: x, gy: a.gy, dir: 0 });
          aiMoney -= 1;
        }
      }
      return;
    }
  }

  if (as.length >= 1 && cs.length === 0 && aiMoney >= 14) {
    const pos = aiFind('constructor', 7, 8);
    if (pos) {
      aiMoney -= 12;
      const m = placeMach(aGrid, aMachines, pos.x, pos.y, 'constructor');
      const a = as[0];
      const cost = aiConnectBelt(a, m);
      aiMoney -= cost;
      const rx2 = m.gx + MTYPE.constructor.w;
      for (let x = rx2; x < COLS && aiMoney >= 1; x++) {
        if (aGrid[m.gy][x] === 0) {
          aGrid[m.gy][x] = 'b';
          aBelts.push({ gx: x, gy: m.gy, dir: 0 });
          aiMoney -= 1;
        }
      }
      return;
    }
  }

  if (sm.length < 2 && aiMoney >= 6) {
    const pos = aiFind('smelter', 0, 1);
    if (pos) { aiMoney -= 5; placeMach(aGrid, aMachines, pos.x, pos.y, 'smelter'); return; }
  }

  if (sm.length >= 2 && as.length < 2 && aiMoney >= 10) {
    const pos = aiFind('assembler', 3, 6);
    if (pos) {
      aiMoney -= 8;
      const m = placeMach(aGrid, aMachines, pos.x, pos.y, 'assembler');
      const s = sm.find(s2 => !getOutputDest(aGrid, aMachines, s2) || getOutputDest(aGrid, aMachines, s2).type === 'exit') || sm[sm.length - 1];
      const cost = aiConnectBelt(s, m);
      aiMoney -= cost;
      const rx = m.gx + MTYPE.assembler.w;
      for (let x = rx; x < COLS && aiMoney >= 1; x++) {
        if (aGrid[m.gy][x] === 0) {
          aGrid[m.gy][x] = 'b';
          aBelts.push({ gx: x, gy: m.gy, dir: 0 });
          aiMoney -= 1;
        }
      }
      return;
    }
  }

  if (as.length >= 2 && cs.length < 2 && aiMoney >= 14) {
    const pos = aiFind('constructor', 6, 8);
    if (pos) {
      aiMoney -= 12;
      const m = placeMach(aGrid, aMachines, pos.x, pos.y, 'constructor');
      const a = as.find(a2 => {
        const d = getOutputDest(aGrid, aMachines, a2);
        return !d || d.type === 'exit';
      }) || as[as.length - 1];
      const cost = aiConnectBelt(a, m);
      aiMoney -= cost;
      const rx = m.gx + MTYPE.constructor.w;
      for (let x = rx; x < COLS && aiMoney >= 1; x++) {
        if (aGrid[m.gy][x] === 0) {
          aGrid[m.gy][x] = 'b';
          aBelts.push({ gx: x, gy: m.gy, dir: 0 });
          aiMoney -= 1;
        }
      }
      return;
    }
  }

  for (const m of aMachines) {
    const dest = getOutputDest(aGrid, aMachines, m);
    if (!dest && aiMoney >= 1) {
      const t = MTYPE[m.type];
      const rx = m.gx + t.w;
      for (let x = rx; x < COLS && aiMoney >= 1; x++) {
        if (aGrid[m.gy][x] === 0) {
          aGrid[m.gy][x] = 'b';
          aBelts.push({ gx: x, gy: m.gy, dir: 0 });
          aiMoney -= 1;
        }
      }
      return;
    }
  }
}

function aiFind(type, minC, maxC) {
  const t = MTYPE[type];
  for (let c = minC; c <= maxC && c + t.w <= COLS; c++)
    for (let r = 0; r + t.h <= ROWS; r++)
      if (canPlace(aGrid, c, r, type)) return { x: c, y: r };
  for (let c = 0; c + t.w <= COLS; c++)
    for (let r = 0; r + t.h <= ROWS; r++)
      if (canPlace(aGrid, c, r, type)) return { x: c, y: r };
  return null;
}

function aiConnectBelt(src, dst) {
  const srcT = MTYPE[src.type];
  const sx = src.gx + srcT.w;
  const sy = src.gy;
  const dx = dst.gx;
  const dy = dst.gy;
  let cost = 0;
  let x = sx, y = sy;
  const maxSteps = 25;
  for (let s = 0; s < maxSteps; s++) {
    if (x === dx && y === dy) break;
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS && aGrid[y][x] === 0) {
      aGrid[y][x] = 'b';
      aBelts.push({ gx: x, gy: y, dir: 0 });
      cost++;
      if (aiMoney - cost < 0) break;
    }
    if (x < dx) x++;
    else if (x > dx) x--;
    else if (y < dy) y++;
    else if (y > dy) y--;
    else break;
  }
  return cost;
}

// ---- Tool selection ----
function selectTool(tool) {
  selectedTool = (selectedTool === tool) ? null : tool;
  beltStart = null;
  updateButtons();
  updateInfo();
}

function updateInfo() {
  if (!infoEl) return;
  if (selectedTool === 'belt')
    infoEl.textContent = 'Click start, then end to draw belt ($1/tile). Belts carry items right.';
  else if (selectedTool === 'delete')
    infoEl.textContent = 'Click machine (50% refund) or belt to remove';
  else if (selectedTool && MTYPE[selectedTool])
    infoEl.textContent = `${MTYPE[selectedTool].name}: ${MTYPE[selectedTool].input}\u2192${MTYPE[selectedTool].output} ($${MTYPE[selectedTool].cost}, ${MTYPE[selectedTool].w}x${MTYPE[selectedTool].h})`;
  else
    infoEl.textContent = 'Place machines on your factory floor. Connect with belts. Produce goods for points!';
}

function updateButtons() {
  document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
  if (selectedTool) {
    const id = 'btn' + selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1);
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
}

// Expose selectTool globally so toolbar onclick= attributes work
window.selectTool = selectTool;

// ---- Drawing ----

// Parse a hex color string like '#e88030' into [r, g, b] 0-255
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// Build a rgba color string with alpha
function withAlpha(hex, a) {
  const [r,g,b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Build #rrggbbaa string
function hexWithAlpha(hex, a) {
  const ah = Math.round(a * 255).toString(16).padStart(2,'0');
  return hex + ah;
}

function drawFactory(renderer, text, ox, oy, grid, machines, belts, label, money, isPlayer) {
  const fw = COLS * CELL, fh = ROWS * CELL;

  // Background
  renderer.fillRect(ox, oy, fw, fh, '#10102a');

  // Grid lines
  for (let r = 0; r <= ROWS; r++) {
    renderer.drawLine(ox, oy + r * CELL, ox + fw, oy + r * CELL, '#1c1c3a', 0.5);
  }
  for (let c = 0; c <= COLS; c++) {
    renderer.drawLine(ox + c * CELL, oy, ox + c * CELL, oy + fh, '#1c1c3a', 0.5);
  }

  // Edge indicators — left (ore supply, green tint) and right (exit, amber tint)
  renderer.fillRect(ox,            oy, 4, fh, 'rgba(85,204,85,0.12)');
  renderer.fillRect(ox + fw - 4,  oy, 4, fh, 'rgba(255,170,0,0.12)');

  // Ore arrows on left edge
  for (let r = 1; r < ROWS; r += 2) {
    text.drawText('\u25B6', ox + 2, oy + r * CELL - 5, 9, '#55aa55', 'left');
  }

  // Dollar signs on right edge
  for (let r = 1; r < ROWS; r += 2) {
    text.drawText('$', ox + fw - 10, oy + r * CELL - 5, 9, '#ffaa00', 'left');
  }

  // Belts
  for (const b of belts) {
    const bx = ox + b.gx * CELL, by = oy + b.gy * CELL;
    renderer.fillRect(bx + 1, by + 1, CELL - 2, CELL - 2, '#2a2a50');
    // Animated chevron: alternate between two glyphs based on global beltPhase and gx
    const phase = (beltPhase + b.gx) % 2;
    text.drawText(phase < 1 ? '\u00BB' : '\u203A', bx + CELL / 2, by + CELL / 2 - 5, 10, '#484870', 'center');
  }

  // Machines
  for (const m of machines) {
    const t = MTYPE[m.type];
    const mx = ox + m.gx * CELL, my = oy + m.gy * CELL;
    const mw = t.w * CELL, mh = t.h * CELL;

    // Body glow fill
    renderer.fillRect(mx, my, mw, mh, hexWithAlpha(t.col, 0.094)); // ~0x18

    // Body fill
    renderer.fillRect(mx + 2, my + 2, mw - 4, mh - 4, hexWithAlpha(t.col, 0.25)); // ~0x40

    // Border
    renderer.strokePoly([
      {x: mx+2, y: my+2}, {x: mx+mw-2, y: my+2},
      {x: mx+mw-2, y: my+mh-2}, {x: mx+2, y: my+mh-2}
    ], t.col, 2, true);

    // Pulsing glow when processing
    if (m.inBuf >= 1 && m.progress > 0) {
      // Use a fixed low alpha for the pulse since we can't use sin() in draw
      // (we can though — performance.now() is available)
      const pulse = 0.15 + 0.1 * Math.sin(performance.now() / 200);
      renderer.fillRect(mx + 2, my + 2, mw - 4, mh - 4, withAlpha(t.col, pulse));
    }

    // Symbol (large, centered)
    renderer.setGlow(t.col, 0.5);
    text.drawText(t.sym, mx + mw / 2, my + mh / 2 - 12, 16, t.col, 'center');
    renderer.setGlow(null);

    // Type name (small, below symbol)
    text.drawText(t.name.substring(0, 5), mx + mw / 2, my + mh / 2 + 2, 8, '#aaaaaa', 'center');

    // Progress bar (bottom strip)
    if (m.inBuf >= 1) {
      const prog = Math.min(1, m.progress / t.ticks);
      renderer.fillRect(mx + 4, my + mh - 8, mw - 8, 4, '#222222');
      renderer.fillRect(mx + 4, my + mh - 8, (mw - 8) * prog, 4, t.col);
    }

    // Input buffer count (top-left, green)
    if (m.inBuf > 0.1) {
      text.drawText(Math.floor(m.inBuf).toString(), mx + 3, my + 2, 8, '#88aa88', 'left');
    }
    // Output buffer count (top-right, amber)
    if (m.outBuf > 0) {
      text.drawText(m.outBuf.toString(), mx + mw - 3, my + 2, 8, '#ffcc88', 'right');
    }
  }

  // Factory label (top-left)
  const labelColor = isPlayer ? '#ffaa00' : '#ff6666';
  text.drawText(label, ox + 2, oy - 16, 11, labelColor, 'left');

  // Money display (top-right)
  text.drawText('$' + Math.floor(money), ox + fw - 2, oy - 16, 10, '#55cc55', 'right');

  // Hover preview (player side only)
  if (isPlayer && hoverCell && selectedTool) {
    const hx = ox + hoverCell.gx * CELL, hy = oy + hoverCell.gy * CELL;

    if (MTYPE[selectedTool]) {
      const t = MTYPE[selectedTool];
      const ok = canPlace(pGrid, hoverCell.gx, hoverCell.gy, selectedTool);
      renderer.fillRect(hx, hy, t.w * CELL, t.h * CELL, ok ? 'rgba(255,170,0,0.15)' : 'rgba(255,50,50,0.15)');
      const borderCol = ok ? '#ffaa00' : '#ff3333';
      // Dashed border approximation using strokePoly with low alpha
      renderer.strokePoly([
        {x: hx, y: hy}, {x: hx + t.w*CELL, y: hy},
        {x: hx + t.w*CELL, y: hy + t.h*CELL}, {x: hx, y: hy + t.h*CELL}
      ], borderCol, 1, true);

    } else if (selectedTool === 'belt') {
      renderer.fillRect(hx, hy, CELL, CELL, 'rgba(255,170,0,0.12)');
      // Show path preview from beltStart if set
      if (beltStart) {
        const sx = ox + beltStart.gx * CELL + CELL / 2;
        const sy = oy + beltStart.gy * CELL + CELL / 2;
        const ex = ox + hoverCell.gx * CELL + CELL / 2;
        const ey = oy + hoverCell.gy * CELL + CELL / 2;
        // L-shaped path: horizontal then vertical
        renderer.drawLine(sx, sy, ex, sy, 'rgba(255,170,0,0.6)', 1.5);
        renderer.drawLine(ex, sy, ex, ey, 'rgba(255,170,0,0.6)', 1.5);
      }

    } else if (selectedTool === 'delete') {
      renderer.fillRect(hx, hy, CELL, CELL, 'rgba(255,50,50,0.2)');
    }
  }

  // Belt start marker (circle at start point)
  if (isPlayer && beltStart && selectedTool === 'belt') {
    const bsx = ox + beltStart.gx * CELL + CELL / 2;
    const bsy = oy + beltStart.gy * CELL + CELL / 2;
    renderer.fillCircle(bsx, bsy, 4, '#ffaa00');
  }
}

function doDraw(renderer, text) {
  // Background
  renderer.fillRect(0, 0, W, H, '#1a1a2e');

  // Section headers
  text.drawText('YOUR FACTORY', P_OX + COLS * CELL / 2, 4, 12, '#ffaa00', 'center');
  text.drawText('AI FACTORY',   A_OX + COLS * CELL / 2, 4, 12, '#ff6666', 'center');

  // Divider (dashed approximation with short line segments)
  for (let y = 20; y < H - 40; y += 6) {
    renderer.drawLine(DIV_X, y, DIV_X, y + 3, '#333333', 1);
  }

  // Player factory
  drawFactory(renderer, text, P_OX, P_OY, pGrid, pMachines, pBelts, 'PLAYER', playerMoney, true);
  // AI factory
  drawFactory(renderer, text, A_OX, A_OY, aGrid, aMachines, aBelts, 'AI', aiMoney, false);

  // Bottom legend
  text.drawText('Ore(left) \u2192 Smelter \u2192 Ingot($2) \u2192 Assembler \u2192 Part($5) \u2192 Constructor \u2192 Product($15) \u2192 Exit(right)',
    W / 2, H - 32, 9, '#555555', 'center');
  text.drawText('Keys: 1=Smelter 2=Assembler 3=Constructor 4=Belt 5=Delete  Esc=Cancel',
    W / 2, H - 19, 9, '#555555', 'center');
}

// ---- Handle a canvas click in playing state ----
function handleClick(mx, my, game) {
  if (mx >= DIV_X) return;

  const gx = Math.floor((mx - P_OX) / CELL);
  const gy = Math.floor((my - P_OY) / CELL);
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;

  if (selectedTool === 'delete') {
    const refund = removeTile(pGrid, pMachines, pBelts, gx, gy);
    playerMoney += refund;
    if (infoEl) infoEl.textContent = refund > 0 ? 'Removed! Refunded $' + refund : 'Nothing to remove here';
    return;
  }

  if (selectedTool === 'belt') {
    if (!beltStart) {
      beltStart = { gx, gy };
      if (infoEl) infoEl.textContent = 'Click endpoint to draw belt path (cost: $1/tile)';
    } else {
      const count = placeBeltLine(pGrid, pBelts, beltStart.gx, beltStart.gy, gx, gy);
      if (count > 0 && playerMoney >= count) {
        playerMoney -= count;
        if (infoEl) infoEl.textContent = count + ' belt tiles placed ($' + count + ')';
      } else if (playerMoney < count) {
        if (infoEl) infoEl.textContent = 'Not enough money for belts!';
      }
      beltStart = null;
    }
    return;
  }

  if (selectedTool && MTYPE[selectedTool]) {
    const t = MTYPE[selectedTool];
    if (playerMoney < t.cost) {
      if (infoEl) infoEl.textContent = 'Need $' + t.cost + ' (have $' + Math.floor(playerMoney) + ')';
      return;
    }
    if (canPlace(pGrid, gx, gy, selectedTool)) {
      placeMach(pGrid, pMachines, gx, gy, selectedTool);
      playerMoney -= t.cost;
      if (infoEl) infoEl.textContent = t.name + ' placed! (' + t.input + ' \u2192 ' + t.output + ')';
    } else {
      if (infoEl) infoEl.textContent = 'Cannot place here - blocked';
    }
    return;
  }

  // No tool — inspect cell
  const cell = pGrid[gy][gx];
  if (typeof cell === 'string' && cell[0] === 'm') {
    const mid = parseInt(cell.substring(1));
    const m = pMachines.find(mm => mm.id === mid);
    if (m) {
      const t = MTYPE[m.type];
      const src = getInputSource(pGrid, pMachines, m);
      const dst = getOutputDest(pGrid, pMachines, m);
      const srcStr = src ? (src.type === 'edge' ? 'ore supply' : src.type === 'machine' ? src.machine.type : '?') : 'NONE';
      const dstStr = dst ? (dst.type === 'exit' ? 'sell exit' : dst.type === 'machine' ? dst.machine.type : '?') : 'NONE';
      if (infoEl) infoEl.textContent = `${t.name}: in=${m.inBuf.toFixed(1)} prog=${Math.floor(m.progress)}/${t.ticks} out=${m.outBuf} | feed:${srcStr} \u2192 dest:${dstStr}`;
    }
  } else if (cell === 'b') {
    if (infoEl) infoEl.textContent = 'Belt tile - carries items between machines';
  } else {
    if (infoEl) infoEl.textContent = 'Empty cell. Select a tool to build!';
  }
}

// ---- Export ----
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Prevent context menu
  canvasEl.addEventListener('contextmenu', e => e.preventDefault());

  // Mouse move — track hover cell on player side
  canvasEl.addEventListener('mousemove', e => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    pendingMoves.push({ mx, my });
  });

  // Click events
  canvasEl.addEventListener('click', e => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    pendingClicks.push({ mx, my });
  });

  // ---- onInit ----
  game.onInit = () => {
    score = 0; pScore = 0; aScore = 0;
    playerMoney = 25; aiMoney = 25;
    timeLeft = GAME_SECS;
    pGrid = makeGrid(); aGrid = makeGrid();
    pMachines = []; aMachines = [];
    pBelts = []; aBelts = [];
    selectedTool = null; beltStart = null; hoverCell = null;
    aiTimer = 0; machineIdCounter = 1;
    frameCounter = 0;
    beltPhase = 0;
    pendingClicks = [];
    pendingMoves = [];

    updateButtons();

    if (scoreEl)   scoreEl.textContent   = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    if (timerEl)   timerEl.textContent   = '3:00';
    if (timerEl)   timerEl.style.color   = '#cccccc';
    if (infoEl)    infoEl.textContent    = 'Place machines on your factory floor. Connect with belts. Produce goods for points!';

    game.showOverlay('FACTORY CHAIN',
      'Build production chains faster than the AI!\n\nOre \u2192 Smelter \u2192 Ingot \u2192 Assembler \u2192 Part \u2192 Constructor \u2192 Product\n\nClick to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => Math.floor(score));

  // ---- onUpdate ----
  game.onUpdate = (dt) => {
    const input = game.input;

    // Waiting
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        pendingClicks = [];
        return;
      }
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.setState('playing');
        return;
      }
      return;
    }

    // Game over
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
        return;
      }
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
        return;
      }
      return;
    }

    // ---- Playing ----
    frameCounter++;
    beltPhase = (performance.now() / 300) % 2;

    // Keyboard shortcuts
    if (input.wasPressed('1')) selectTool('smelter');
    if (input.wasPressed('2')) selectTool('assembler');
    if (input.wasPressed('3')) selectTool('constructor');
    if (input.wasPressed('4')) selectTool('belt');
    if (input.wasPressed('5') || input.wasPressed('x')) selectTool('delete');
    if (input.wasPressed('Escape')) { selectedTool = null; beltStart = null; updateButtons(); updateInfo(); }

    // Process mouse moves (just track last hover)
    while (pendingMoves.length > 0) {
      const mv = pendingMoves.pop(); // only care about latest
      pendingMoves = [];
      if (mv.mx < DIV_X) {
        const gx = Math.floor((mv.mx - P_OX) / CELL);
        const gy = Math.floor((mv.my - P_OY) / CELL);
        hoverCell = (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) ? { gx, gy } : null;
      } else {
        hoverCell = null;
      }
    }

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      handleClick(click.mx, click.my, game);
    }

    // Timer
    timeLeft -= dt / 1000;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame(game);
      return;
    }
    const mins = Math.floor(timeLeft / 60);
    const secs = Math.floor(timeLeft % 60);
    if (timerEl) {
      timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      timerEl.style.color = timeLeft < 30 ? '#ff5555' : '#cccccc';
    }

    // Passive income
    const inc = (1 / 3) * (dt / 1000);
    playerMoney += inc;
    aiMoney     += inc;

    // Simulate factories
    pScore += simulate(dt, pGrid, pMachines);
    aScore += simulate(dt, aGrid, aMachines);
    score = pScore;

    if (scoreEl)   scoreEl.textContent   = Math.floor(pScore);
    if (aiScoreEl) aiScoreEl.textContent = Math.floor(aScore);

    // AI acts every 2 seconds (≈120 frames at 60Hz)
    aiTimer += dt;
    if (aiTimer >= 2000) {
      aiTimer = 0;
      aiAct();
    }
  };

  // ---- onDraw ----
  game.onDraw = (renderer, text) => {
    doDraw(renderer, text);
  };

  game.start();
  return game;
}

function endGame(game) {
  score = Math.floor(pScore);
  const ps = Math.floor(pScore), as2 = Math.floor(aScore);
  let title, msg;
  if (ps > as2)      { title = 'YOU WIN!'; }
  else if (as2 > ps) { title = 'AI WINS'; }
  else               { title = 'TIE GAME'; }
  msg = `Your score: ${ps}\nAI score: ${as2}\n\nClick or press any key to play again`;
  game.showOverlay(title, msg);
  game.setState('over');
}
