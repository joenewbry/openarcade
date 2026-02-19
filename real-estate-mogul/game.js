// real-estate-mogul/game.js — WebGL 2 port via engine/core.js

import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 500;

  // ── Colors ──
  const ORANGE  = '#f90';
  const BG      = '#1a1a2e';
  const PANEL_BG = '#12122a';
  const GRID_BG  = '#0e0e22';

  const PROP_TYPES = {
    residential: { label: 'Residential', color: '#4a9', baseValue: [40000, 80000], baseRent: [2000, 5000] },
    commercial:  { label: 'Commercial',  color: '#49f', baseValue: [60000, 120000], baseRent: [4000, 8000] },
    industrial:  { label: 'Industrial',  color: '#a86', baseValue: [30000, 60000], baseRent: [3000, 6000] },
    luxury:      { label: 'Luxury',      color: '#d4a', baseValue: [100000, 200000], baseRent: [6000, 12000] },
  };
  const PROP_TYPE_KEYS = ['residential', 'commercial', 'industrial', 'luxury'];

  const NEIGHBORHOODS = ['Downtown', 'Suburbia', 'Waterfront', 'Hillside', 'Midtown', 'Eastside'];

  const MARKET_EVENTS = [
    { text: 'Tech Boom!',       desc: 'Commercial +20%', effect: (p) => p.type === 'commercial' ? 1.20 : 1.0 },
    { text: 'Housing Crash',    desc: 'Residential -15%', effect: (p) => p.type === 'residential' ? 0.85 : 1.0 },
    { text: 'Gentrification',   desc: '{hood} values +25%', effect: null, neighborhood: true, mult: 1.25 },
    { text: 'Industrial Boom',  desc: 'Industrial +20%', effect: (p) => p.type === 'industrial' ? 1.20 : 1.0 },
    { text: 'Luxury Tax Hike',  desc: 'Luxury -10%', effect: (p) => p.type === 'luxury' ? 0.90 : 1.0 },
    { text: 'Population Growth',desc: 'All rents +10%', effect: () => 1.0, rentMult: 1.10 },
    { text: 'Recession Fears',  desc: 'All values -8%', effect: () => 0.92 },
    { text: 'New Highway',      desc: 'Suburbia +15%',   effect: null, neighborhoodName: 'Suburbia',   mult: 1.15 },
    { text: 'Beach Festival',   desc: 'Waterfront +18%', effect: null, neighborhoodName: 'Waterfront', mult: 1.18 },
    { text: 'Downtown Revival', desc: 'Downtown +15%',   effect: null, neighborhoodName: 'Downtown',   mult: 1.15 },
    { text: 'Stable Market',    desc: 'No major changes', effect: () => 1.0 },
    { text: 'Build Boom',       desc: 'Dev costs -20%', effect: () => 1.0, devDiscount: 0.8 },
    { text: 'Tax Cut',          desc: 'All values +5%', effect: () => 1.05 },
    { text: 'Investor Exodus',  desc: 'Comm -12%, Ind -10%', effect: (p) => p.type === 'commercial' ? 0.88 : (p.type === 'industrial' ? 0.90 : 1.0) },
    { text: 'Luxury Surge',     desc: 'Luxury +22%', effect: (p) => p.type === 'luxury' ? 1.22 : 1.0 },
  ];

  const PLAYER_COLORS = ['#f90', '#4af', '#f55', '#5d5'];
  const PLAYER_NAMES  = ['You', 'AI-Rex', 'AI-Nova', 'AI-Max'];

  // Layout constants
  const MAP_X = 10, MAP_Y = 10, MAP_W = 340, MAP_H = 310;
  const PANEL_X = 360, PANEL_Y = 10, PANEL_W = 230, PANEL_H = 310;
  const STATS_X = 10, STATS_Y = 330, STATS_W = 580, STATS_H = 70;
  const ACTION_X = 10, ACTION_Y = 408, ACTION_W = 580, ACTION_H = 84;

  const GRID_COLS = 5, GRID_ROWS = 4;
  const CELL_PAD = 6;
  const CELL_W = (MAP_W - CELL_PAD * (GRID_COLS + 1)) / GRID_COLS;
  const CELL_H = (MAP_H - 30 - CELL_PAD * (GRID_ROWS + 1)) / GRID_ROWS;

  // ── Game state ──
  let players = [], properties = [];
  let currentPlayer = 0;
  let round = 1, maxRounds = 20;
  let phase = 'start';
  let currentEvent = null;
  let selectedProperty = null, hoveredProperty = null, hoveredButton = null;
  let actionsTaken = 0, maxActions = 2;
  let eventLog = [];
  let devDiscount = 1.0;
  let animTimer = 0;
  let numPlayers = 4;
  let rentCollected = 0;
  let score = 500000;
  let buttons = []; // rebuilt each draw, hit-tested on click

  // DOM score elements
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  let bestScore = parseInt(localStorage.getItem('realEstateMogulBest') || '0');
  if (bestEl) bestEl.textContent = bestScore.toLocaleString();

  // ── Helpers ──
  function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt$(n)    { return '$' + Math.round(n).toLocaleString(); }

  // ── Game logic ──
  function initGame() {
    players = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push({ name: PLAYER_NAMES[i], cash: 500000, color: PLAYER_COLORS[i], isAI: i > 0 });
    }

    properties = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const type = PROP_TYPE_KEYS[row];
        const info = PROP_TYPES[type];
        const hood = pick(NEIGHBORHOODS);
        const baseVal  = rand(info.baseValue[0],  info.baseValue[1]);
        const baseRent = rand(info.baseRent[0],   info.baseRent[1]);
        properties.push({
          row, col, type, neighborhood: hood,
          value: baseVal, rent: baseRent,
          condition: rand(50, 100),
          devLevel: 0, maxDev: 3,
          owner: -1,
          x: MAP_X + CELL_PAD + col * (CELL_W + CELL_PAD),
          y: MAP_Y + 24 + CELL_PAD + row * (CELL_H + CELL_PAD),
        });
      }
    }

    round = 1; currentPlayer = 0; phase = 'event';
    selectedProperty = null; hoveredProperty = null;
    actionsTaken = 0; eventLog = []; devDiscount = 1.0; rentCollected = 0;
    applyMarketEvent();
    score = 500000;
    updateScoreDisplay();
  }

  function applyMarketEvent() {
    let evt = pick(MARKET_EVENTS);
    let desc = evt.desc;
    let targetHood = null;

    if (evt.neighborhood) {
      targetHood = pick(NEIGHBORHOODS);
      desc = desc.replace('{hood}', targetHood);
    } else if (evt.neighborhoodName) {
      targetHood = evt.neighborhoodName;
    }

    devDiscount = evt.devDiscount || 1.0;

    for (let p of properties) {
      let mult = 1.0;
      if (targetHood) {
        if (p.neighborhood === targetHood) mult = evt.mult;
      } else if (evt.effect) {
        mult = evt.effect(p);
      }
      p.value = Math.max(5000, Math.round(p.value * mult));
      if (evt.rentMult) p.rent = Math.round(p.rent * evt.rentMult);
    }

    currentEvent = { text: evt.text, desc };
    eventLog.unshift('R' + round + ': ' + evt.text);
    if (eventLog.length > 10) eventLog.pop();
  }

  function collectRent(playerIdx) {
    let total = 0;
    for (let p of properties) {
      if (p.owner === playerIdx) {
        let r = Math.round(p.rent * (p.condition / 100));
        total += r;
        players[playerIdx].cash += r;
      }
    }
    return total;
  }

  function getPlayerNetWorth(idx) {
    let worth = players[idx].cash;
    for (let p of properties) if (p.owner === idx) worth += p.value;
    return worth;
  }

  function getPlayerPropertyCount(idx) {
    let count = 0;
    for (let p of properties) if (p.owner === idx) count++;
    return count;
  }

  function getDevCost(prop) {
    return Math.round(prop.value * 0.3 * devDiscount);
  }

  function developProperty(prop) {
    if (prop.devLevel >= prop.maxDev) return false;
    let cost = getDevCost(prop);
    if (players[prop.owner].cash < cost) return false;
    players[prop.owner].cash -= cost;
    prop.devLevel++;
    prop.value = Math.round(prop.value * 1.35);
    prop.rent  = Math.round(prop.rent  * 1.25);
    prop.condition = Math.min(100, prop.condition + 15);
    return true;
  }

  function buyProperty(prop, playerIdx) {
    if (prop.owner !== -1) return false;
    if (players[playerIdx].cash < prop.value) return false;
    players[playerIdx].cash -= prop.value;
    prop.owner = playerIdx;
    return true;
  }

  function sellProperty(prop) {
    if (prop.owner === -1) return false;
    let price = Math.round(prop.value * 0.9);
    players[prop.owner].cash += price;
    prop.owner = -1;
    prop.devLevel = 0;
    return true;
  }

  function aiTurn(playerIdx) {
    let p = players[playerIdx];
    let actions = 0;
    while (actions < maxActions) {
      let owned     = properties.filter(pr => pr.owner === playerIdx);
      let available = properties.filter(pr => pr.owner === -1);
      let acted = false;

      for (let prop of owned) {
        if (prop.condition < 30 && prop.devLevel >= prop.maxDev) {
          sellProperty(prop); acted = true; actions++; break;
        }
        let typeInfo = PROP_TYPES[prop.type];
        let avgBase  = (typeInfo.baseValue[0] + typeInfo.baseValue[1]) / 2;
        if (prop.value > avgBase * 2.0 && Math.random() < 0.35) {
          sellProperty(prop); acted = true; actions++; break;
        }
      }
      if (acted) continue;

      let devCands = owned.filter(pr => pr.devLevel < pr.maxDev && p.cash >= getDevCost(pr));
      if (devCands.length > 0 && Math.random() < 0.55) {
        devCands.sort((a, b) => (b.rent * 1.25 / getDevCost(b)) - (a.rent * 1.25 / getDevCost(a)));
        developProperty(devCands[0]);
        actions++; continue;
      }

      let affordable = available.filter(pr => p.cash >= pr.value);
      if (affordable.length > 0 && p.cash > 80000) {
        affordable.sort((a, b) => (b.rent / b.value) - (a.rent / a.value));
        let best = affordable[0];
        let roi  = best.rent / best.value;
        if (roi > 0.035 || (p.cash > 250000 && roi > 0.02)) {
          buyProperty(best, playerIdx);
          actions++; continue;
        }
      }

      break;
    }
  }

  function advanceTurn() {
    for (let i = 1; i < numPlayers; i++) {
      collectRent(i);
      aiTurn(i);
    }
    for (let p of properties) {
      if (p.owner !== -1) p.condition = Math.max(10, p.condition - rand(2, 5));
    }
    round++;
    if (round > maxRounds) { endGame(); return; }
    currentPlayer = 0;
    actionsTaken = 0;
    selectedProperty = null;
    phase = 'event';
    applyMarketEvent();
  }

  function endGame() {
    phase = 'gameOver';
    let nw = getPlayerNetWorth(0);
    score = nw;
    updateScoreDisplay();

    let rankings = [];
    for (let i = 0; i < numPlayers; i++) rankings.push({ idx: i, nw: getPlayerNetWorth(i) });
    rankings.sort((a, b) => b.nw - a.nw);
    let rank = rankings.findIndex(r => r.idx === 0) + 1;

    if (nw > bestScore) {
      bestScore = nw;
      localStorage.setItem('realEstateMogulBest', bestScore.toString());
      if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    }

    let txt = 'Final Net Worth: ' + fmt$(nw) + '<br>';
    txt += 'You placed #' + rank + ' of ' + numPlayers + '<br><br>';
    for (let r of rankings) {
      let marker = r.idx === 0 ? '  &lt;&lt;' : '';
      txt += PLAYER_NAMES[r.idx] + ': ' + fmt$(r.nw) + marker + '<br>';
    }
    txt += '<br>Click to play again';

    game.setState('over');
    game.showOverlay(rank === 1 ? 'MOGUL SUPREME!' : 'GAME OVER', '');
    // Put rich text in the overlay paragraph
    const overlayText = document.getElementById('overlayText');
    if (overlayText) overlayText.innerHTML = txt;
  }

  function updateScoreDisplay() {
    score = getPlayerNetWorth(0);
    if (scoreEl) scoreEl.textContent = Math.round(score).toLocaleString();
  }

  // ── Property hit testing ──
  function getPropertyAt(mx, my) {
    for (let p of properties) {
      if (mx >= p.x && mx <= p.x + CELL_W && my >= p.y && my <= p.y + CELL_H) return p;
    }
    return null;
  }

  function getButtonAt(mx, my) {
    for (let b of buttons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b;
    }
    return null;
  }

  function handleAction(action) {
    if (phase !== 'action') return;
    if (action === 'endTurn') { selectedProperty = null; advanceTurn(); return; }
    if (!selectedProperty) return;
    let success = false;
    if (action === 'buy')     success = buyProperty(selectedProperty, 0);
    else if (action === 'develop') success = developProperty(selectedProperty);
    else if (action === 'sell') {
      success = sellProperty(selectedProperty);
      if (success) selectedProperty = null;
    }
    if (success) {
      actionsTaken++;
      updateScoreDisplay();
      if (actionsTaken >= maxActions) advanceTurn();
    }
  }

  // ── Mouse input — direct canvas listeners ──
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    hoveredProperty = getPropertyAt(mx, my);
    hoveredButton   = getButtonAt(mx, my);
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
      return;
    }

    if (game.state === 'over') {
      game.showOverlay('REAL ESTATE MOGUL', 'Buy, develop, and sell properties to become the wealthiest tycoon.\n\nClick to Start');
      game.setState('waiting');
      return;
    }

    if (phase === 'event') {
      rentCollected = collectRent(0);
      phase = 'action';
      actionsTaken = 0;
      updateScoreDisplay();
      return;
    }

    if (phase === 'action') {
      const btn = getButtonAt(mx, my);
      if (btn && btn.active) { handleAction(btn.action); return; }
      const prop = getPropertyAt(mx, my);
      if (prop) selectedProperty = prop;
      return;
    }

    if (phase === 'gameOver') {
      game.showOverlay('REAL ESTATE MOGUL', 'Buy, develop, and sell properties to become the wealthiest tycoon.\n\nClick to Start');
      game.setState('waiting');
    }
  });

  // ── Drawing helpers ──

  // fillRect with optional alpha via #rrggbbaa
  function hexAlpha(hex6, alpha) {
    // alpha 0..1 → two hex digits
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return hex6 + a;
  }

  function drawRoundRect(renderer, x, y, w, h, color) {
    // Approximate rounded rect with a plain rect (engine doesn't natively round-corner)
    renderer.fillRect(x, y, w, h, color);
  }

  function drawRoundRectOutline(renderer, x, y, w, h, color, lw = 1) {
    // Four sides via drawLine
    renderer.drawLine(x,     y,     x + w, y,     color, lw);
    renderer.drawLine(x + w, y,     x + w, y + h, color, lw);
    renderer.drawLine(x + w, y + h, x,     y + h, color, lw);
    renderer.drawLine(x,     y + h, x,     y,     color, lw);
  }

  function fillAndStrokeRect(renderer, x, y, w, h, fillColor, strokeColor, lw = 1) {
    renderer.fillRect(x, y, w, h, fillColor);
    drawRoundRectOutline(renderer, x, y, w, h, strokeColor, lw);
  }

  // ── Draw sections ──

  function drawMap(renderer, text) {
    // Background panel
    fillAndStrokeRect(renderer, MAP_X, MAP_Y, MAP_W, MAP_H, GRID_BG, ORANGE + '60', 1);

    // Header text
    renderer.setGlow(ORANGE, 0.6);
    text.drawText('PROPERTY MAP  -  Round ' + round + '/' + maxRounds,
      MAP_X + MAP_W / 2, MAP_Y + 6, 11, ORANGE, 'center');
    renderer.setGlow(null);

    for (let p of properties) {
      const info   = PROP_TYPES[p.type];
      const isHov  = hoveredProperty === p;
      const isSel  = selectedProperty === p;
      const x = p.x, y = p.y;

      // Cell fill
      const cellFill = p.owner >= 0 ? hexAlpha(players[p.owner].color, 0.15) : '#1a1a36';
      renderer.fillRect(x, y, CELL_W, CELL_H, cellFill);

      // Ownership stripe
      if (p.owner >= 0) {
        renderer.fillRect(x, y, CELL_W, 3, hexAlpha(players[p.owner].color, 0.56));
      }

      // Border / glow
      let borderColor, lw;
      if (isSel) {
        renderer.setGlow('#ffffff', 0.8);
        borderColor = '#ffffff'; lw = 2;
      } else if (isHov) {
        renderer.setGlow(info.color, 0.5);
        borderColor = info.color; lw = 2;
      } else {
        renderer.setGlow(null);
        borderColor = hexAlpha(info.color, 0.38); lw = 1;
      }
      drawRoundRectOutline(renderer, x, y, CELL_W, CELL_H, borderColor, lw);
      renderer.setGlow(null);

      // Type initial letter
      text.drawText(info.label[0], x + CELL_W / 2, y + 6, 18, info.color, 'center');

      // Value
      const shortVal = '$' + Math.round(p.value / 1000) + 'k';
      text.drawText(shortVal, x + CELL_W / 2, y + 26, 8, '#aaaaaa', 'center');

      // Dev dots
      for (let d = 0; d < p.maxDev; d++) {
        const dx = x + CELL_W / 2 - 12 + d * 10;
        const dy = y + CELL_H - 12;
        if (d < p.devLevel) {
          renderer.fillCircle(dx + 3, dy + 3, 3, '#ffff00');
        } else {
          drawRoundRectOutline(renderer, dx, dy, 6, 6, '#444444', 1);
        }
      }

      // Neighborhood abbreviation
      text.drawText(p.neighborhood.substring(0, 3), x + CELL_W - 2, y + CELL_H - 10, 7, '#555555', 'right');
    }

    // Legend
    let lx = MAP_X + 8;
    const ly = MAP_Y + MAP_H - 10;
    for (let t of PROP_TYPE_KEYS) {
      const info = PROP_TYPES[t];
      text.drawText('* ' + info.label[0], lx, ly, 8, info.color, 'left');
      lx += 42;
    }
    text.drawText('| Owners:', lx, ly, 8, '#666666', 'left');
    lx += 62;
    for (let i = 0; i < numPlayers; i++) {
      text.drawText('*', lx, ly, 8, players[i].color, 'left');
      lx += 14;
    }
  }

  function drawPanel(renderer, text) {
    fillAndStrokeRect(renderer, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_BG, ORANGE + '40', 1);

    if (phase === 'event' && currentEvent) {
      renderer.setGlow('#ffff00', 0.6);
      text.drawText('! MARKET NEWS !', PANEL_X + PANEL_W / 2, PANEL_Y + 18, 12, '#ffff00', 'center');
      renderer.setGlow(null);

      text.drawText(currentEvent.text, PANEL_X + PANEL_W / 2, PANEL_Y + 48, 13, ORANGE, 'center');
      text.drawText(currentEvent.desc, PANEL_X + PANEL_W / 2, PANEL_Y + 68, 11, '#cccccc', 'center');

      let ey = PANEL_Y + 110;
      for (let i = 1; i < eventLog.length && i < 7; i++) {
        let t = eventLog[i];
        if (t.length > 28) t = t.substring(0, 28) + '..';
        text.drawText(t, PANEL_X + 10, ey, 9, '#555555', 'left');
        ey += 13;
      }

      text.drawText('Click to continue', PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 18, 10, '#777777', 'center');

    } else if (selectedProperty || hoveredProperty) {
      drawPropertyDetail(renderer, text, selectedProperty || hoveredProperty);

    } else {
      text.drawText('- MARKET LOG -', PANEL_X + PANEL_W / 2, PANEL_Y + 14, 11, ORANGE, 'center');

      let ey = PANEL_Y + 38;
      for (let i = 0; i < eventLog.length && i < 10; i++) {
        let t = eventLog[i];
        if (t.length > 28) t = t.substring(0, 28) + '..';
        text.drawText(t, PANEL_X + 10, ey, 9, i === 0 ? '#cccccc' : '#777777', 'left');
        ey += 14;
      }
      if (eventLog.length === 0) {
        text.drawText('Hover a property', PANEL_X + 10, PANEL_Y + 48, 9, '#555555', 'left');
        text.drawText('for details',      PANEL_X + 10, PANEL_Y + 64, 9, '#555555', 'left');
      }
      text.drawText('Hover property for info', PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 18, 9, '#444444', 'center');
    }
  }

  function drawPropertyDetail(renderer, text, prop) {
    const info = PROP_TYPES[prop.type];
    let py = PANEL_Y + 10;
    const lx = PANEL_X + 14;

    renderer.setGlow(info.color, 0.5);
    text.drawText(info.label.toUpperCase(), PANEL_X + PANEL_W / 2, py, 13, info.color, 'center');
    renderer.setGlow(null);
    py += 16;

    text.drawText('@ ' + prop.neighborhood, PANEL_X + PANEL_W / 2, py, 10, '#888888', 'center');
    py += 20;

    // Separator line
    renderer.drawLine(lx, py - 4, PANEL_X + PANEL_W - 14, py - 4, '#333333', 1);

    text.drawText('Value:     ' + fmt$(prop.value), lx, py, 11, '#dddddd', 'left'); py += 18;

    const effRent = Math.round(prop.rent * prop.condition / 100);
    text.drawText('Rent:      ' + fmt$(effRent) + '/turn', lx, py, 11, '#dddddd', 'left'); py += 18;

    // Condition label
    text.drawText('Condition: ', lx, py, 11, '#dddddd', 'left');
    const barX = lx + 90, barW = 80, barH = 8;
    renderer.fillRect(barX, py - 8, barW, barH, '#333333');
    const condCol = prop.condition > 60 ? '#4a9' : (prop.condition > 30 ? '#fa0' : '#f44');
    renderer.fillRect(barX, py - 8, barW * prop.condition / 100, barH, condCol);
    text.drawText(prop.condition + '%', PANEL_X + PANEL_W - 14, py, 9, '#aaaaaa', 'right');
    py += 18;

    // Dev level
    text.drawText('Dev Level: ', lx, py, 11, '#dddddd', 'left');
    for (let d = 0; d < prop.maxDev; d++) {
      const dx = lx + 90 + d * 18;
      text.drawText(d < prop.devLevel ? '*' : 'o', dx, py, 11, d < prop.devLevel ? '#ffff00' : '#444444', 'left');
    }
    py += 22;

    // Owner
    if (prop.owner >= 0) {
      text.drawText('Owner: ' + players[prop.owner].name, lx, py, 11, players[prop.owner].color, 'left');
    } else {
      text.drawText('+ AVAILABLE', lx, py, 11, '#55aa55', 'left');
    }
    py += 22;

    renderer.drawLine(lx, py - 6, PANEL_X + PANEL_W - 14, py - 6, '#333333', 1);

    const roi = ((effRent) / prop.value * 100).toFixed(1);
    text.drawText('ROI: ' + roi + '% per turn', lx, py, 10, '#999999', 'left'); py += 14;

    if (prop.devLevel < prop.maxDev) {
      const dc = getDevCost(prop);
      text.drawText('Dev cost: ' + fmt$(dc), lx, py, 10, '#999999', 'left');
      if (devDiscount < 1.0) {
        text.drawText('(discounted!)', lx + 88, py, 10, '#55dd55', 'left');
      }
      py += 14;
    }

    if (prop.owner === 0) {
      text.drawText('Sell price: ' + fmt$(Math.round(prop.value * 0.9)), lx, py, 10, '#f88888', 'left');
    } else if (prop.owner === -1) {
      text.drawText('Buy price:  ' + fmt$(prop.value), lx, py, 10, '#55aa55', 'left');
    }
  }

  function drawStats(renderer, text) {
    fillAndStrokeRect(renderer, STATS_X, STATS_Y, STATS_W, STATS_H, PANEL_BG, ORANGE + '40', 1);

    const colW = STATS_W / numPlayers;
    for (let i = 0; i < numPlayers; i++) {
      const px = STATS_X + i * colW + 10;
      const py = STATS_Y + 12;
      const pl = players[i];
      const nw = getPlayerNetWorth(i);
      const propCount = getPlayerPropertyCount(i);

      if (i === 0 && phase === 'action') {
        renderer.fillRect(STATS_X + i * colW + 2, STATS_Y + 2, colW - 4, STATS_H - 4, hexAlpha(pl.color, 0.08));
      }

      if (i === 0) renderer.setGlow(pl.color, 0.4);
      text.drawText(pl.name, px, py, 11, pl.color, 'left');
      renderer.setGlow(null);

      text.drawText(fmt$(pl.cash), px, py + 14, 10, '#cccccc', 'left');
      text.drawText('NW:' + fmt$(nw), px, py + 26, 9, '#888888', 'left');
      text.drawText(propCount + ' props', px, py + 38, 9, '#888888', 'left');
    }
  }

  function drawActions(renderer, text) {
    fillAndStrokeRect(renderer, ACTION_X, ACTION_Y, ACTION_W, ACTION_H, PANEL_BG, ORANGE + '40', 1);
    buttons = [];

    if (phase === 'event') {
      renderer.setGlow('#ffff00', 0.5);
      text.drawText('! ' + (currentEvent ? currentEvent.text : '') + ' !',
        ACTION_X + ACTION_W / 2, ACTION_Y + 22, 13, '#ffff00', 'center');
      renderer.setGlow(null);

      text.drawText(currentEvent ? currentEvent.desc : '', ACTION_X + ACTION_W / 2, ACTION_Y + 42, 11, '#bbbbbb', 'center');

      // Pulsing opacity via color alpha channel
      const pulse = Math.floor((Math.sin(animTimer * 3) * 0.3 + 0.7) * 255).toString(16).padStart(2, '0');
      text.drawText('Click anywhere to continue', ACTION_X + ACTION_W / 2, ACTION_Y + 64, 10, '#666666' + pulse, 'center');

    } else if (phase === 'action') {
      const actionsLeft = maxActions - actionsTaken;
      text.drawText(
        'YOUR TURN  |  Actions: ' + actionsLeft + '  |  Cash: ' + fmt$(players[0].cash),
        ACTION_X + 12, ACTION_Y + 14, 11, ORANGE, 'left');

      if (rentCollected > 0) {
        text.drawText('Rent collected: +' + fmt$(rentCollected), ACTION_X + ACTION_W - 12, ACTION_Y + 14, 9, '#55dd55', 'right');
      }

      const bx0 = ACTION_X + 12;
      const by  = ACTION_Y + 26;
      const bw  = 120, bh = 26, gap = 12;
      let bx = bx0;

      const canBuy     = selectedProperty && selectedProperty.owner === -1 && players[0].cash >= selectedProperty.value;
      const canDev     = selectedProperty && selectedProperty.owner === 0 && selectedProperty.devLevel < selectedProperty.maxDev && players[0].cash >= getDevCost(selectedProperty);
      const canSell    = selectedProperty && selectedProperty.owner === 0;

      drawButton(renderer, text, bx, by, bw, bh, '> BUY',      canBuy  ? '#4a9' : '#444', canBuy,  'buy');      bx += bw + gap;
      drawButton(renderer, text, bx, by, bw, bh, '* DEVELOP',  canDev  ? '#49f' : '#444', canDev,  'develop');  bx += bw + gap;
      drawButton(renderer, text, bx, by, bw, bh, '< SELL',     canSell ? '#f55' : '#444', canSell, 'sell');      bx += bw + gap;
      drawButton(renderer, text, bx, by, bw, bh, '>> END TURN', '#f90', true, 'endTurn');

      if (!selectedProperty) {
        text.drawText('Select a property on the map to take action', ACTION_X + 12, ACTION_Y + 70, 9, '#666666', 'left');
      } else {
        const info = PROP_TYPES[selectedProperty.type];
        text.drawText(
          'Selected: ' + info.label + ' in ' + selectedProperty.neighborhood + ' (' + fmt$(selectedProperty.value) + ')',
          ACTION_X + 12, ACTION_Y + 70, 9, info.color, 'left');
      }

    } else if (phase === 'gameOver') {
      renderer.setGlow(ORANGE, 0.6);
      text.drawText('GAME OVER', ACTION_X + ACTION_W / 2, ACTION_Y + 26, 14, ORANGE, 'center');
      renderer.setGlow(null);
      text.drawText('Final Net Worth: ' + fmt$(getPlayerNetWorth(0)), ACTION_X + ACTION_W / 2, ACTION_Y + 48, 11, '#aaaaaa', 'center');
      text.drawText('Click to play again', ACTION_X + ACTION_W / 2, ACTION_Y + 66, 10, '#666666', 'center');
    }
  }

  function drawButton(renderer, text, x, y, w, h, label, color, active, action) {
    const isHov = hoveredButton && hoveredButton.action === action && active;

    const fillColor   = active ? hexAlpha(color, isHov ? 0.38 : 0.15) : '#181830';
    const strokeColor = active ? color : '#333333';
    const lw = isHov ? 2 : 1;

    if (isHov) renderer.setGlow(color, 0.6);
    fillAndStrokeRect(renderer, x, y, w, h, fillColor, strokeColor, lw);
    renderer.setGlow(null);

    const textColor = active ? (isHov ? '#ffffff' : '#dddddd') : '#444444';
    text.drawText(label, x + w / 2, y + h / 2 - 5, 10, textColor, 'center');

    buttons.push({ x, y, w, h, action, active });
  }

  // ── Engine callbacks ──

  game.onInit = () => {
    game.showOverlay('REAL ESTATE MOGUL', 'Buy, develop, and sell properties to become the wealthiest tycoon.\n\nClick to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state === 'playing') {
      animTimer += dt / 1000;
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting' || game.state === 'over') {
      // Just clear — the overlay handles the rest
      return;
    }

    drawMap(renderer, text);
    drawPanel(renderer, text);
    drawStats(renderer, text);
    drawActions(renderer, text);
  };

  game.start();
  return game;
}
