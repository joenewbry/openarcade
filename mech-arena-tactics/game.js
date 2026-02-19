// mech-arena-tactics/game.js — Mech Arena Tactics for WebGL2 engine

import { Game } from '../engine/core.js';

// ============================================================
// CONSTANTS
// ============================================================
const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL = 44;
const GRID_OX = 40;
const GRID_OY = 28;
const THEME = '#8af';

const WEAPONS = {
  laser:   { name:'Laser',   dmg:18, range:6, heat:12, accuracy:0.92, splash:false, color:'#f44' },
  missile: { name:'Missile', dmg:22, range:5, heat:18, accuracy:0.75, splash:true,  color:'#fa0' },
  cannon:  { name:'Cannon',  dmg:30, range:4, heat:22, accuracy:0.80, splash:false, color:'#ff0' },
  mg:      { name:'MG',      dmg:10, range:3, heat:6,  accuracy:0.88, splash:false, color:'#0f8', shots:3 }
};

const ARMORS = {
  light:  { name:'Light',  hp:60,  move:4, heatCap:50, coolRate:18, color:'#5f5' },
  medium: { name:'Medium', hp:85,  move:3, heatCap:65, coolRate:14, color:'#8af' },
  heavy:  { name:'Heavy',  hp:120, move:2, heatCap:80, coolRate:10, color:'#c8f' }
};

const WEAPON_KEYS = Object.keys(WEAPONS);
const ARMOR_KEYS = Object.keys(ARMORS);

// ============================================================
// MODULE-SCOPE STATE
// ============================================================
let gameState = 'menu'; // menu, loadout, combat, gameover
let score = 0;
let turnNumber = 0;

let grid = [];
let mechs = [];
let currentMechIdx = 0;
let phase = 'move';
let selectedCell = null;
let validMoves = [];
let validTargets = [];
let animations = [];
let combatLog = [];
let playerLoadout = [{weapon:'laser',armor:'medium'},{weapon:'missile',armor:'medium'}];
let loadoutSlot = 0;
let aiThinking = false;

// Loadout UI
let loadoutButtons = [];
let loadoutHover = null;

// Pending mouse events
let pendingClicks = [];
let pendingMoves = [];

// DOM refs (updated in updateHUD)
const scoreEl = document.getElementById('score-display');
const turnEl  = document.getElementById('turn-display');
const phaseEl = document.getElementById('phase-display');
const statusBar = document.getElementById('status-bar');
const overlayEl = document.getElementById('overlay');

// ============================================================
// HUD / STATUS
// ============================================================
function setStatus(txt) {
  if (statusBar) statusBar.textContent = txt;
}

function updateHUD() {
  if (scoreEl) scoreEl.textContent = score;
  if (turnEl)  turnEl.textContent = turnNumber || '-';
  if (phaseEl) phaseEl.textContent =
    gameState === 'loadout' ? 'LOADOUT' :
    gameState === 'combat'  ? 'COMBAT'  :
    gameState === 'gameover'? 'GAME OVER' : 'MENU';
}

// ============================================================
// GRID GENERATION
// ============================================================
function generateGrid() {
  grid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) grid[r][c] = 0;
  }
  let wallCount = 10 + Math.floor(Math.random() * 6);
  let coverCount = 6 + Math.floor(Math.random() * 4);
  let forbidden = new Set();
  for (let i = 0; i < 2; i++) {
    forbidden.add(`0,${i}`); forbidden.add(`1,${i}`);
    forbidden.add(`${GRID_COLS-1},${GRID_ROWS-1-i}`); forbidden.add(`${GRID_COLS-2},${GRID_ROWS-1-i}`);
  }
  function placeRandom(type, count) {
    let placed = 0;
    while (placed < count) {
      let c = Math.floor(Math.random() * GRID_COLS);
      let r = Math.floor(Math.random() * GRID_ROWS);
      if (grid[r][c] === 0 && !forbidden.has(`${c},${r}`)) {
        grid[r][c] = type;
        placed++;
      }
    }
  }
  placeRandom(1, wallCount);
  placeRandom(2, coverCount);
}

// ============================================================
// MECH CREATION
// ============================================================
function createMech(id, owner, x, y, weaponKey, armorKey) {
  let w = WEAPONS[weaponKey];
  let a = ARMORS[armorKey];
  return {
    id, owner, x, y,
    weapon: weaponKey, armor: armorKey,
    hp: a.hp, maxHp: a.hp,
    heat: 0, heatCap: a.heatCap, coolRate: a.coolRate,
    move: a.move, range: w.range,
    overheated: false, alive: true,
    hasMoved: false, hasAttacked: false
  };
}

// ============================================================
// PATHFINDING / MOVEMENT
// ============================================================
function isBlocked(c, r) {
  if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return true;
  if (grid[r][c] === 1) return true;
  for (let m of mechs) {
    if (m.alive && m.x === c && m.y === r) return true;
  }
  return false;
}

function getReachable(mech) {
  let start = `${mech.x},${mech.y}`;
  let visited = new Map();
  visited.set(start, 0);
  let queue = [{x:mech.x, y:mech.y, dist:0}];
  let result = [];
  while (queue.length) {
    let cur = queue.shift();
    if (cur.dist > 0) result.push({x:cur.x, y:cur.y});
    if (cur.dist >= mech.move) continue;
    for (let [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      let nx = cur.x+dx, ny = cur.y+dy;
      let key = `${nx},${ny}`;
      if (!isBlocked(nx,ny) && !visited.has(key)) {
        visited.set(key, cur.dist+1);
        queue.push({x:nx,y:ny,dist:cur.dist+1});
      }
    }
  }
  return result;
}

// ============================================================
// LINE OF SIGHT
// ============================================================
function hasLOS(x1,y1,x2,y2) {
  let dx = x2-x1, dy = y2-y1;
  let steps = Math.max(Math.abs(dx),Math.abs(dy));
  if (steps === 0) return true;
  for (let i = 1; i < steps; i++) {
    let cx = Math.round(x1 + dx*i/steps);
    let cy = Math.round(y1 + dy*i/steps);
    if (grid[cy] && grid[cy][cx] === 1) return false;
  }
  return true;
}

function dist(x1,y1,x2,y2) { return Math.abs(x2-x1)+Math.abs(y2-y1); }

function getTargets(mech) {
  let targets = [];
  let w = WEAPONS[mech.weapon];
  for (let m of mechs) {
    if (!m.alive || m.owner === mech.owner) continue;
    let d = dist(mech.x, mech.y, m.x, m.y);
    if (d <= w.range && hasLOS(mech.x, mech.y, m.x, m.y)) {
      targets.push(m);
    }
  }
  return targets;
}

// ============================================================
// COMBAT RESOLUTION
// ============================================================
function resolveAttack(attacker, target) {
  let w = WEAPONS[attacker.weapon];
  let inCover = grid[target.y][target.x] === 2;
  let acc = w.accuracy * (inCover ? 0.6 : 1.0);
  let results = [];
  let shots = w.shots || 1;

  for (let s = 0; s < shots; s++) {
    let hit = Math.random() < acc;
    if (hit) {
      let dmg = w.dmg + Math.floor(Math.random()*5) - 2;
      if (w.shots) dmg = Math.floor(dmg);
      target.hp -= dmg;
      score += dmg;
      results.push({hit:true, dmg});
      if (target.hp <= 0) { target.hp = 0; target.alive = false; }
    } else {
      results.push({hit:false, dmg:0});
    }
  }

  // Splash damage
  if (w.splash) {
    for (let m of mechs) {
      if (!m.alive || m.id === target.id || m.owner === attacker.owner) continue;
      if (dist(target.x,target.y,m.x,m.y) <= 1) {
        let sdmg = Math.floor(w.dmg * 0.4);
        m.hp -= sdmg;
        score += sdmg;
        if (m.hp <= 0) { m.hp = 0; m.alive = false; }
        results.push({hit:true, dmg:sdmg, splash:true, targetId:m.id});
      }
    }
  }

  // Destroy cover at target if splash
  if (w.splash && grid[target.y][target.x] === 2) {
    grid[target.y][target.x] = 3;
  }

  // Heat
  attacker.heat += w.heat;
  if (attacker.heat >= attacker.heatCap) attacker.overheated = true;

  // Beam animation
  animations.push({
    type: 'beam',
    x1: attacker.x, y1: attacker.y,
    x2: target.x, y2: target.y,
    color: w.color,
    timer: 20,
    results
  });

  return results;
}

// ============================================================
// AI LOGIC
// ============================================================
function aiChooseLoadout() {
  let combos = [
    {weapon:'cannon', armor:'heavy'},
    {weapon:'laser', armor:'medium'},
    {weapon:'missile', armor:'medium'},
    {weapon:'mg', armor:'light'},
    {weapon:'cannon', armor:'medium'},
    {weapon:'laser', armor:'light'},
    {weapon:'missile', armor:'heavy'}
  ];
  let picks = [];
  let used = new Set();
  let shuffled = combos.sort(() => Math.random()-0.5);
  for (let c of shuffled) {
    let key = c.weapon+c.armor;
    if (!used.has(key) && picks.length < 2) {
      picks.push({...c});
      used.add(key);
    }
  }
  while (picks.length < 2) picks.push({weapon:'laser', armor:'medium'});
  return picks;
}

function aiTakeTurn(mech) {
  aiThinking = true;
  setTimeout(() => {
    if (!mech.alive || mech.overheated) {
      aiThinking = false;
      advanceTurn();
      return;
    }

    let reachable = getReachable(mech);
    reachable.push({x:mech.x, y:mech.y});

    let bestScore = -Infinity;
    let bestPos = {x:mech.x, y:mech.y};
    let bestTarget = null;
    let w = WEAPONS[mech.weapon];

    for (let pos of reachable) {
      let posScore = 0;
      let tempX = mech.x, tempY = mech.y;
      mech.x = pos.x; mech.y = pos.y;

      let targets = getTargets(mech);
      let bestTgtScore = 0;
      let bestTgt = null;

      for (let t of targets) {
        let d = dist(pos.x, pos.y, t.x, t.y);
        let tScore = w.dmg * w.accuracy * (w.shots||1);
        if (t.hp <= w.dmg * (w.shots||1)) tScore += 40;
        tScore += (w.range - d) * 2;
        if (grid[t.y][t.x] === 2) tScore *= 0.6;
        if (tScore > bestTgtScore) { bestTgtScore = tScore; bestTgt = t; }
      }
      posScore += bestTgtScore;

      let inCover = grid[pos.y][pos.x] === 2;
      if (inCover) posScore += 15;

      for (let em of mechs) {
        if (!em.alive || em.owner === mech.owner) continue;
        let ed = dist(pos.x, pos.y, em.x, em.y);
        if (mech.hp < mech.maxHp * 0.3) {
          posScore += ed * 3;
        } else {
          if (ed <= w.range) posScore += 8;
          if (ed <= 1) posScore -= 5;
        }
      }

      if (mech.heat + w.heat >= mech.heatCap && bestTgtScore < 25) {
        bestTgt = null;
        bestTgtScore = 0;
      }

      if (bestTgt) posScore += 10;

      mech.x = tempX; mech.y = tempY;

      if (posScore > bestScore) {
        bestScore = posScore;
        bestPos = pos;
        bestTarget = bestTgt;
      }
    }

    if (bestPos.x !== mech.x || bestPos.y !== mech.y) {
      mech.x = bestPos.x;
      mech.y = bestPos.y;
    }
    mech.hasMoved = true;

    setTimeout(() => {
      if (bestTarget && bestTarget.alive) {
        let results = resolveAttack(mech, bestTarget);
        let totalDmg = results.reduce((s,r) => s + r.dmg, 0);
        let msg = `AI ${WEAPONS[mech.weapon].name} -> Mech ${bestTarget.id}: `;
        msg += results.some(r=>r.hit) ? `${totalDmg} dmg` : 'MISS';
        combatLog.unshift(msg);
        if (combatLog.length > 6) combatLog.pop();
      }
      mech.hasAttacked = true;

      setTimeout(() => {
        aiThinking = false;
        checkWinCondition();
        if (gameState === 'combat') advanceTurn();
      }, 400);
    }, 500);
  }, 600);
}

// ============================================================
// TURN MANAGEMENT
// ============================================================
function startCombat() {
  gameState = 'combat';
  if (overlayEl) overlayEl.style.display = 'none';
  turnNumber = 1;

  generateGrid();

  let aiLoadout = aiChooseLoadout();
  mechs = [
    createMech(1, 'player', 0, 0, playerLoadout[0].weapon, playerLoadout[0].armor),
    createMech(2, 'player', 1, 1, playerLoadout[1].weapon, playerLoadout[1].armor),
    createMech(3, 'ai', GRID_COLS-1, GRID_ROWS-1, aiLoadout[0].weapon, aiLoadout[0].armor),
    createMech(4, 'ai', GRID_COLS-2, GRID_ROWS-2, aiLoadout[1].weapon, aiLoadout[1].armor),
  ];

  for (let m of mechs) { grid[m.y][m.x] = 0; }

  currentMechIdx = 0;
  startMechTurn();
  updateHUD();
  setStatus('Your turn! Select a mech to move.');
}

function startMechTurn() {
  let mech = mechs[currentMechIdx];
  if (!mech) return;

  if (mech.overheated) {
    mech.heat = Math.max(0, mech.heat - mech.coolRate * 2);
    if (mech.heat <= mech.heatCap * 0.3) mech.overheated = false;
    else {
      combatLog.unshift(`Mech ${mech.id} cooling down (${mech.heat}/${mech.heatCap})`);
      if (combatLog.length > 6) combatLog.pop();
      advanceTurn();
      return;
    }
  } else {
    mech.heat = Math.max(0, mech.heat - mech.coolRate);
  }

  if (!mech.alive) {
    advanceTurn();
    return;
  }

  mech.hasMoved = false;
  mech.hasAttacked = false;
  phase = 'move';
  selectedCell = null;
  validMoves = getReachable(mech);
  validTargets = [];

  if (mech.owner === 'ai') {
    setStatus('AI is thinking...');
    aiTakeTurn(mech);
  } else {
    setStatus(`Mech ${mech.id}: Click a blue cell to move, or click mech to skip move.`);
  }
}

function advanceTurn() {
  currentMechIdx++;
  if (currentMechIdx >= mechs.length) {
    currentMechIdx = 0;
    turnNumber++;
    if (Math.random() < 0.15) {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (grid[r][c] === 2 && Math.random() < 0.1) grid[r][c] = 3;
        }
      }
    }
  }
  updateHUD();
  startMechTurn();
}

function checkWinCondition() {
  let playerAlive = mechs.filter(m => m.owner === 'player' && m.alive).length;
  let aiAlive = mechs.filter(m => m.owner === 'ai' && m.alive).length;

  if (aiAlive === 0) {
    gameState = 'gameover';
    score += 100;
    updateHUD();
    showGameOver(true);
  } else if (playerAlive === 0) {
    gameState = 'gameover';
    updateHUD();
    showGameOver(false);
  }
}

function showGameOver(won) {
  if (overlayEl) {
    overlayEl.style.display = 'flex';
    overlayEl.innerHTML = `
      <h1>${won ? 'VICTORY!' : 'DEFEATED'}</h1>
      <h2>Score: ${score}</h2>
      <p>${won ? 'All enemy mechs destroyed! Superior tactics prevail.' : 'Your mechs have been destroyed. Regroup and try again.'}</p>
      <p style="font-size:11px;color:#889;">Turns: ${turnNumber} | Damage dealt: ${score}</p>
      <button id="redeploy-btn">REDEPLOY</button>
    `;
    const btn = document.getElementById('redeploy-btn');
    if (btn) btn.addEventListener('click', () => startNewGame());
  }
}

// ============================================================
// GAME START / RESET
// ============================================================
function startNewGame() {
  score = 0;
  turnNumber = 0;
  mechs = [];
  animations = [];
  combatLog = [];
  currentMechIdx = 0;
  loadoutSlot = 0;
  playerLoadout = [{weapon:'laser',armor:'medium'},{weapon:'missile',armor:'medium'}];
  validMoves = [];
  validTargets = [];
  aiThinking = false;

  gameState = 'loadout';
  if (overlayEl) overlayEl.style.display = 'none';
  buildLoadoutButtons();
  updateHUD();
  setStatus('Choose weapons and armor for your 2 mechs, then click DEPLOY!');
}

// ============================================================
// MOUSE INPUT
// ============================================================
function getCellFromPixel(px, py) {
  let c = Math.floor((px - GRID_OX) / CELL);
  let r = Math.floor((py - GRID_OY) / CELL);
  if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) return {c, r};
  return {c:-1, r:-1};
}

function handleCombatClick(px, py) {
  if (aiThinking) return;

  let {c, r} = getCellFromPixel(px, py);
  if (c < 0) return;

  let mech = mechs[currentMechIdx];
  if (!mech || mech.owner !== 'player' || !mech.alive) return;

  if (phase === 'move') {
    if (c === mech.x && r === mech.y) {
      mech.hasMoved = true;
      phase = 'attack';
      validMoves = [];
      validTargets = getTargets(mech);
      if (validTargets.length === 0) {
        setStatus(`Mech ${mech.id}: No targets in range. Turn ends.`);
        setTimeout(() => { checkWinCondition(); if (gameState==='combat') advanceTurn(); }, 400);
      } else {
        setStatus(`Mech ${mech.id}: Click an enemy to attack, or click own mech to skip.`);
      }
      return;
    }
    let valid = validMoves.find(m => m.x === c && m.y === r);
    if (valid) {
      mech.x = c;
      mech.y = r;
      mech.hasMoved = true;
      phase = 'attack';
      validMoves = [];
      validTargets = getTargets(mech);
      if (validTargets.length === 0) {
        setStatus(`Mech ${mech.id}: No targets in range. Turn ends.`);
        setTimeout(() => { checkWinCondition(); if (gameState==='combat') advanceTurn(); }, 400);
      } else {
        setStatus(`Mech ${mech.id}: Click an enemy to attack, or click own mech to skip.`);
      }
    }
  } else if (phase === 'attack') {
    if (c === mech.x && r === mech.y) {
      mech.hasAttacked = true;
      validTargets = [];
      setTimeout(() => { checkWinCondition(); if (gameState==='combat') advanceTurn(); }, 200);
      return;
    }
    let target = validTargets.find(t => t.x === c && t.y === r);
    if (target) {
      let results = resolveAttack(mech, target);
      let totalDmg = results.reduce((s,r) => s + r.dmg, 0);
      let msg = `Mech ${mech.id} ${WEAPONS[mech.weapon].name} -> Mech ${target.id}: `;
      msg += results.some(r=>r.hit) ? `${totalDmg} dmg` : 'MISS';
      combatLog.unshift(msg);
      if (combatLog.length > 6) combatLog.pop();
      setStatus(msg);
      mech.hasAttacked = true;
      validTargets = [];
      updateHUD();
      setTimeout(() => { checkWinCondition(); if (gameState==='combat') advanceTurn(); }, 600);
    }
  }
}

function handleLoadoutClickPx(px, py) {
  for (let btn of loadoutButtons) {
    if (px >= btn.x && px <= btn.x+btn.w && py >= btn.y && py <= btn.y+btn.h) {
      if (btn.type === 'tab') {
        loadoutSlot = btn.id === 'slot0' ? 0 : 1;
      } else if (btn.type === 'weapon') {
        playerLoadout[loadoutSlot].weapon = btn.key;
      } else if (btn.type === 'armor') {
        playerLoadout[loadoutSlot].armor = btn.key;
      } else if (btn.type === 'deploy') {
        startCombat();
      }
      return;
    }
  }
}

function handleLoadoutMovePx(px, py) {
  loadoutHover = null;
  for (let btn of loadoutButtons) {
    if (px >= btn.x && px <= btn.x+btn.w && py >= btn.y && py <= btn.y+btn.h) {
      loadoutHover = btn.id;
      break;
    }
  }
}

// ============================================================
// LOADOUT BUTTONS
// ============================================================
function buildLoadoutButtons() {
  loadoutButtons = [];
  let x0 = 50, y0 = 100;

  loadoutButtons.push({id:'slot0', x:180, y:40, w:100, h:30, label:'Mech 1', type:'tab'});
  loadoutButtons.push({id:'slot1', x:320, y:40, w:100, h:30, label:'Mech 2', type:'tab'});

  let wy = y0 + 30;
  WEAPON_KEYS.forEach((k, i) => {
    let w = WEAPONS[k];
    loadoutButtons.push({
      id:'w_'+k, x:x0, y:wy + i*52, w:240, h:44,
      label:`${w.name}`, sub:`DMG:${w.dmg} RNG:${w.range} HEAT:${w.heat}${w.shots?' x'+w.shots:''}`,
      type:'weapon', key:k, color:w.color
    });
  });

  let ay = y0 + 30;
  ARMOR_KEYS.forEach((k, i) => {
    let a = ARMORS[k];
    loadoutButtons.push({
      id:'a_'+k, x:320, y:ay + i*52, w:240, h:44,
      label:`${a.name}`, sub:`HP:${a.hp} MOV:${a.move} COOL:${a.coolRate}`,
      type:'armor', key:k, color:a.color
    });
  });

  loadoutButtons.push({id:'deploy', x:200, y:410, w:200, h:44, label:'DEPLOY!', type:'deploy'});
}

// ============================================================
// RENDERING — LOADOUT
// ============================================================
function drawLoadout(renderer, text) {
  renderer.fillRect(0, 0, 600, 500, '#1a1a2e');

  text.drawText('MECH LOADOUT', 300, 12, 22, '#8af', 'center');
  text.drawText('Choose weapon and armor for each mech', 300, 76, 12, '#889', 'center');

  text.drawText('WEAPONS', 170, 108, 14, '#8af', 'center');
  text.drawText('ARMOR', 440, 108, 14, '#8af', 'center');

  for (let btn of loadoutButtons) {
    let selected = false;
    if (btn.type === 'weapon') selected = playerLoadout[loadoutSlot].weapon === btn.key;
    if (btn.type === 'armor')  selected = playerLoadout[loadoutSlot].armor  === btn.key;
    if (btn.type === 'tab')    selected = (btn.id === 'slot'+loadoutSlot);

    let hover = loadoutHover === btn.id;
    let borderColor = selected ? '#8af' : (hover ? '#8aff88' : '#445577');
    let bgColor = selected ? 'rgba(136,170,255,0.15)' : (hover ? 'rgba(136,170,255,0.07)' : 'rgba(30,30,50,0.8)');

    renderer.fillRect(btn.x, btn.y, btn.w, btn.h, bgColor);

    // Border using drawLine
    let bw = selected ? 2 : 1;
    renderer.drawLine(btn.x, btn.y, btn.x+btn.w, btn.y, borderColor, bw);
    renderer.drawLine(btn.x+btn.w, btn.y, btn.x+btn.w, btn.y+btn.h, borderColor, bw);
    renderer.drawLine(btn.x+btn.w, btn.y+btn.h, btn.x, btn.y+btn.h, borderColor, bw);
    renderer.drawLine(btn.x, btn.y+btn.h, btn.x, btn.y, borderColor, bw);

    if (selected && (btn.type === 'weapon' || btn.type === 'armor')) {
      renderer.setGlow('#8af', 0.5);
      renderer.drawLine(btn.x, btn.y, btn.x+btn.w, btn.y, '#8af', 2);
      renderer.drawLine(btn.x+btn.w, btn.y, btn.x+btn.w, btn.y+btn.h, '#8af', 2);
      renderer.drawLine(btn.x+btn.w, btn.y+btn.h, btn.x, btn.y+btn.h, '#8af', 2);
      renderer.drawLine(btn.x, btn.y+btn.h, btn.x, btn.y, '#8af', 2);
      renderer.setGlow(null);
    }

    if (btn.type === 'deploy' || btn.type === 'tab') {
      let col = selected ? '#8af' : '#cccccc';
      text.drawText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 - 7, 16, col, 'center');
    } else {
      // Colored dot
      renderer.fillCircle(btn.x + 16, btn.y + 15, 5, btn.color || '#8af');
      text.drawText(btn.label, btn.x + 28, btn.y + 5, 14, '#eeeeee', 'left');
      text.drawText(btn.sub,   btn.x + 28, btn.y + 23, 11, '#889999', 'left');
    }
  }

  // Loadout summary
  for (let i = 0; i < 2; i++) {
    let lo = playerLoadout[i];
    let w = WEAPONS[lo.weapon], a = ARMORS[lo.armor];
    let col = i === loadoutSlot ? '#8af' : '#667788';
    let ly = 370 + i * 18;
    text.drawText(`Mech ${i+1}: ${w.name} + ${a.name} (HP:${a.hp} DMG:${w.dmg} RNG:${w.range})`, 300, ly, 12, col, 'center');
  }
}

// ============================================================
// RENDERING — GRID
// ============================================================
function drawGrid(renderer, text) {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      let x = GRID_OX + c * CELL;
      let y = GRID_OY + r * CELL;

      // Base cell
      let baseColor = (r+c)%2 === 0 ? '#181830' : '#1e1e3a';
      renderer.fillRect(x, y, CELL, CELL, baseColor);

      if (grid[r][c] === 1) {
        // Wall
        renderer.fillRect(x+2, y+2, CELL-4, CELL-4, '#445566');
        // Brick pattern rows
        for (let by = 0; by < 3; by++) {
          let bxoff = (by%2)*8;
          let bTop = y+3+by*13;
          // Two bricks per row
          renderer.drawLine(x+3+bxoff,      bTop,      x+3+bxoff+16,    bTop,      '#778899', 1);
          renderer.drawLine(x+3+bxoff+16,   bTop,      x+3+bxoff+16,    bTop+12,   '#778899', 1);
          renderer.drawLine(x+3+bxoff+16,   bTop+12,   x+3+bxoff,       bTop+12,   '#778899', 1);
          renderer.drawLine(x+3+bxoff,      bTop+12,   x+3+bxoff,       bTop,      '#778899', 1);

          renderer.drawLine(x+3+bxoff+16,   bTop,      x+3+bxoff+32,    bTop,      '#778899', 1);
          renderer.drawLine(x+3+bxoff+32,   bTop,      x+3+bxoff+32,    bTop+12,   '#778899', 1);
          renderer.drawLine(x+3+bxoff+32,   bTop+12,   x+3+bxoff+16,    bTop+12,   '#778899', 1);
        }
      } else if (grid[r][c] === 2) {
        // Cover
        renderer.fillRect(x+4, y+4, CELL-8, CELL-8, '#2a3a2a');
        renderer.drawLine(x+4,      y+4,       x+4+CELL-8, y+4,       '#4a6a4a', 1);
        renderer.drawLine(x+4+CELL-8, y+4,     x+4+CELL-8, y+4+CELL-8, '#4a6a4a', 1);
        renderer.drawLine(x+4+CELL-8, y+4+CELL-8, x+4,   y+4+CELL-8, '#4a6a4a', 1);
        renderer.drawLine(x+4,      y+4+CELL-8, x+4,     y+4,         '#4a6a4a', 1);
        text.drawText('CVR', x+CELL/2, y+CELL/2-5, 9, '#4a6a4a', 'center');
      } else if (grid[r][c] === 3) {
        // Destroyed
        renderer.fillRect(x+2, y+2, CELL-4, CELL-4, '#1a1410');
        renderer.fillRect(x+8, y+12, 10, 8, '#332a20');
        renderer.fillRect(x+22, y+20, 12, 6, '#332a20');
      }

      // Grid lines
      renderer.drawLine(x,      y,      x+CELL, y,      '#2a2a4a', 0.5);
      renderer.drawLine(x+CELL, y,      x+CELL, y+CELL, '#2a2a4a', 0.5);
      renderer.drawLine(x+CELL, y+CELL, x,      y+CELL, '#2a2a4a', 0.5);
      renderer.drawLine(x,      y+CELL, x,      y,      '#2a2a4a', 0.5);
    }
  }
}

// ============================================================
// RENDERING — HIGHLIGHTS
// ============================================================
function drawHighlights(renderer) {
  // Valid moves
  for (let m of validMoves) {
    let x = GRID_OX + m.x * CELL;
    let y = GRID_OY + m.y * CELL;
    renderer.fillRect(x+1, y+1, CELL-2, CELL-2, 'rgba(136,170,255,0.18)');
    renderer.drawLine(x+2,      y+2,       x+2+CELL-4, y+2,       'rgba(136,170,255,0.5)', 1);
    renderer.drawLine(x+2+CELL-4, y+2,     x+2+CELL-4, y+2+CELL-4, 'rgba(136,170,255,0.5)', 1);
    renderer.drawLine(x+2+CELL-4, y+2+CELL-4, x+2,   y+2+CELL-4, 'rgba(136,170,255,0.5)', 1);
    renderer.drawLine(x+2,      y+2+CELL-4, x+2,     y+2,         'rgba(136,170,255,0.5)', 1);
  }

  // Valid targets
  for (let t of validTargets) {
    let x = GRID_OX + t.x * CELL;
    let y = GRID_OY + t.y * CELL;
    renderer.fillRect(x+1, y+1, CELL-2, CELL-2, 'rgba(255,68,68,0.2)');
    renderer.drawLine(x+2,      y+2,       x+2+CELL-4, y+2,       '#f44444', 2);
    renderer.drawLine(x+2+CELL-4, y+2,     x+2+CELL-4, y+2+CELL-4, '#f44444', 2);
    renderer.drawLine(x+2+CELL-4, y+2+CELL-4, x+2,   y+2+CELL-4, '#f44444', 2);
    renderer.drawLine(x+2,      y+2+CELL-4, x+2,     y+2,         '#f44444', 2);
    // Crosshair
    let cx = x + CELL/2, cy = y + CELL/2;
    renderer.drawLine(cx-8, cy, cx+8, cy, '#f44444', 1);
    renderer.drawLine(cx, cy-8, cx, cy+8, '#f44444', 1);
  }

  // Current mech highlight
  if (gameState === 'combat' && currentMechIdx < mechs.length) {
    let cm = mechs[currentMechIdx];
    if (cm && cm.alive) {
      let x = GRID_OX + cm.x * CELL;
      let y = GRID_OY + cm.y * CELL;
      renderer.setGlow('#ffff00', 0.5);
      renderer.drawLine(x+1, y+1, x+1+CELL-2, y+1, '#ffff00', 2);
      renderer.drawLine(x+1+CELL-2, y+1, x+1+CELL-2, y+1+CELL-2, '#ffff00', 2);
      renderer.drawLine(x+1+CELL-2, y+1+CELL-2, x+1, y+1+CELL-2, '#ffff00', 2);
      renderer.drawLine(x+1, y+1+CELL-2, x+1, y+1, '#ffff00', 2);
      renderer.setGlow(null);
    }
  }
}

// ============================================================
// RENDERING — MECHS
// ============================================================
function drawMechs(renderer, text) {
  for (let m of mechs) {
    if (!m.alive) continue;
    let cx = GRID_OX + m.x * CELL + CELL/2;
    let cy = GRID_OY + m.y * CELL + CELL/2;
    let aColor = ARMORS[m.armor].color;
    let isPlayer = m.owner === 'player';

    // Glow
    if (m.overheated) {
      renderer.setGlow('#ff8800', 0.7);
    } else {
      renderer.setGlow(isPlayer ? '#88aaff' : '#ff6666', 0.4);
    }

    // Hexagonal body — pre-compute 6 vertices
    let s = 16;
    let hexPts = [];
    for (let i = 0; i < 6; i++) {
      let angle = Math.PI/6 + i * Math.PI/3;
      hexPts.push({ x: cx + Math.cos(angle)*s, y: cy + Math.sin(angle)*s });
    }
    renderer.fillPoly(hexPts, isPlayer ? '#2244aa' : '#882244');
    renderer.strokePoly(hexPts, aColor, 2, true);
    renderer.setGlow(null);

    // Weapon dot
    let wColor = WEAPONS[m.weapon].color;
    renderer.fillCircle(cx, cy-3, 4, wColor);

    // Mech ID
    text.drawText(String(m.id), cx, cy-4, 11, '#ffffff', 'center');

    // Owner tag
    let ownerTag = isPlayer ? 'PLR' : 'AI';
    let ownerCol = isPlayer ? '#88aaff' : '#ff8888';
    text.drawText(ownerTag, cx, cy+6, 8, ownerCol, 'center');

    // HP bar
    let barW = 32, barH = 4;
    let bx = cx - barW/2;
    let hpBarY = GRID_OY + m.y * CELL - 2;
    renderer.fillRect(bx, hpBarY, barW, barH, '#333333');
    let hpPct = m.hp / m.maxHp;
    let hpCol = hpPct > 0.6 ? '#44ff44' : (hpPct > 0.3 ? '#ffaa00' : '#ff4444');
    renderer.fillRect(bx, hpBarY, barW * hpPct, barH, hpCol);

    // Heat bar
    let hby = GRID_OY + m.y * CELL + CELL + 1;
    renderer.fillRect(bx, hby, barW, 3, '#222222');
    let heatPct = m.heat / m.heatCap;
    let heatCol = m.overheated ? '#ff4444' : (heatPct > 0.7 ? '#ffaa00' : '#4444aa');
    renderer.fillRect(bx, hby, barW * heatPct, 3, heatCol);
  }
}

// ============================================================
// RENDERING — ANIMATIONS
// ============================================================
function drawAnimations(renderer, text) {
  for (let i = animations.length-1; i >= 0; i--) {
    let a = animations[i];
    a.timer--;
    if (a.timer <= 0) { animations.splice(i, 1); continue; }

    if (a.type === 'beam') {
      let x1 = GRID_OX + a.x1*CELL + CELL/2;
      let y1 = GRID_OY + a.y1*CELL + CELL/2;
      let x2 = GRID_OX + a.x2*CELL + CELL/2;
      let y2 = GRID_OY + a.y2*CELL + CELL/2;

      let alpha = a.timer / 20;
      // Encode alpha into color
      let alphaHex = Math.round(alpha * 255).toString(16).padStart(2,'0');
      let beamColor = a.color + alphaHex;

      renderer.setGlow(a.color, 0.6);
      renderer.drawLine(x1, y1, x2, y2, beamColor, 3);
      renderer.setGlow(null);

      // Impact flash
      if (a.timer > 14) {
        let flashAlpha = (a.timer-14)/6;
        let fa = Math.round(flashAlpha * 255).toString(16).padStart(2,'0');
        renderer.fillCircle(x2, y2, 12, '#ffffff' + fa);
      }

      // Damage numbers
      if (a.timer > 8 && a.timer < 16) {
        for (let res of a.results) {
          let floatY = y2 - 20 + (16 - a.timer) * 2;
          if (res.hit) {
            text.drawText('-'+res.dmg, x2, floatY, 14, '#ffff44', 'center');
          } else {
            text.drawText('MISS', x2, floatY, 14, '#888888', 'center');
          }
        }
      }
    }

    if (a.type === 'explode') {
      let ex = GRID_OX + a.x*CELL + CELL/2;
      let ey = GRID_OY + a.y*CELL + CELL/2;
      let alpha = a.timer / 15;
      let radius = (15 - a.timer) * 2 + 5;
      let ea = Math.round(alpha * 255).toString(16).padStart(2,'0');
      renderer.fillCircle(ex, ey, radius, a.color + ea);
    }
  }
}

// ============================================================
// RENDERING — COMBAT INFO PANEL
// ============================================================
function drawCombatInfo(renderer, text) {
  let infoX = GRID_OX + GRID_COLS * CELL + 10;
  let infoY = GRID_OY;
  let panelW = 600 - infoX - 5;

  if (panelW < 80) return;

  renderer.fillRect(infoX-4, infoY-4, panelW+8, GRID_ROWS*CELL+8, 'rgba(26,26,46,0.9)');

  let ly = infoY + 10;
  for (let m of mechs) {
    let isPlayer = m.owner === 'player';
    let col = m.alive ? (isPlayer ? '#88aaff' : '#ff8888') : '#444444';
    let prefix = isPlayer ? 'P' : 'A';
    text.drawText(`${prefix}${m.id} ${WEAPONS[m.weapon].name.substr(0,4)}`, infoX, ly, 10, col, 'left');
    ly += 12;
    let infCol = m.alive ? '#aaaaaa' : '#444444';
    text.drawText(`HP:${m.hp}/${m.maxHp}`, infoX, ly, 10, infCol, 'left');
    ly += 12;
    let heatStr = m.overheated ? 'OVRHEAT' : `H:${m.heat}/${m.heatCap}`;
    let heatCol = m.overheated ? '#ff4444' : '#889999';
    text.drawText(heatStr, infoX, ly, 10, heatCol, 'left');
    ly += 16;
  }

  // Combat log
  ly += 4;
  text.drawText('-- LOG --', infoX, ly, 9, '#667788', 'left');
  ly += 12;
  for (let log of combatLog) {
    let txt = log.length > 16 ? log.substr(0,16) : log;
    text.drawText(txt, infoX, ly, 9, '#778899', 'left');
    ly += 11;
    if (log.length > 16) {
      text.drawText(log.substr(16), infoX, ly, 9, '#778899', 'left');
      ly += 11;
    }
    if (ly > infoY + GRID_ROWS*CELL - 5) break;
  }
}

// ============================================================
// EXPORT
// ============================================================
export function createGame() {
  const game = new Game('game');

  const canvasEl = document.getElementById('game');

  // Canvas click handler
  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    pendingClicks.push({ px, py });
  });

  // Canvas mousemove handler
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    pendingMoves.push({ px, py });
  });

  game.onInit = () => {
    score = 0;
    turnNumber = 0;
    mechs = [];
    animations = [];
    combatLog = [];
    currentMechIdx = 0;
    loadoutSlot = 0;
    playerLoadout = [{weapon:'laser',armor:'medium'},{weapon:'missile',armor:'medium'}];
    validMoves = [];
    validTargets = [];
    aiThinking = false;
    loadoutHover = null;
    pendingClicks = [];
    pendingMoves = [];

    buildLoadoutButtons();
    updateHUD();

    game.showOverlay('MECH ARENA TACTICS',
      'Customize your mechs with weapons and armor, then battle on a destructible grid. Outmaneuver the AI to win!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // Process pending mouse moves (last one wins)
    if (pendingMoves.length > 0) {
      const mv = pendingMoves[pendingMoves.length - 1];
      pendingMoves = [];
      if (gameState === 'loadout') {
        handleLoadoutMovePx(mv.px, mv.py);
      }
    }

    // Process pending clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();

      if (game.state === 'waiting') {
        // "DEPLOY MECHS" button is in the overlay HTML — handled by onclick below.
        // But if we get a click anywhere while waiting, start the game.
        gameState = 'loadout';
        game.hideOverlay();
        buildLoadoutButtons();
        updateHUD();
        setStatus('Choose weapons and armor for your 2 mechs, then click DEPLOY!');
        continue;
      }

      if (gameState === 'loadout') {
        handleLoadoutClickPx(click.px, click.py);
      } else if (gameState === 'combat') {
        handleCombatClick(click.px, click.py);
      } else if (gameState === 'gameover') {
        // clicking anywhere after gameover restarts
        startNewGame();
      }
    }

    // Check keyboard: Space or Enter on waiting screen
    if (game.state === 'waiting' && (game.input.wasPressed(' ') || game.input.wasPressed('Enter'))) {
      gameState = 'loadout';
      game.hideOverlay();
      buildLoadoutButtons();
      updateHUD();
      setStatus('Choose weapons and armor for your 2 mechs, then click DEPLOY!');
    }
  };

  game.onDraw = (renderer, text) => {
    renderer.fillRect(0, 0, 600, 500, '#1a1a2e');

    if (gameState === 'loadout') {
      drawLoadout(renderer, text);
    } else if (gameState === 'combat' || gameState === 'gameover') {
      drawGrid(renderer, text);
      drawHighlights(renderer);
      drawMechs(renderer, text);
      drawAnimations(renderer, text);
      drawCombatInfo(renderer, text);
    }
  };

  // Wire up the HTML overlay button
  const deployBtn = document.getElementById('deploy-btn');
  if (deployBtn) {
    deployBtn.addEventListener('click', () => {
      gameState = 'loadout';
      game.hideOverlay();
      buildLoadoutButtons();
      updateHUD();
      setStatus('Choose weapons and armor for your 2 mechs, then click DEPLOY!');
    });
  }

  game.start();
  return game;
}
