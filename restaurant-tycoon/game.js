import { Game } from '../engine/core.js';

export function createGame() {
  const canvas = document.getElementById('game');
  const W = 600, H = 500;
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  const THEME = '#e64646';
  const BG = '#1a1a2e';
  const PANEL = '#12122a';
  const DARK = '#0e0e22';
  const PANEL_BORDER = '#333355';

  const MENU_ITEMS = [
    { name: 'Burger', baseCost: 4, baseAppeal: 7, color: '#cc8844' },
    { name: 'Pizza',  baseCost: 5, baseAppeal: 8, color: '#ee9933' },
    { name: 'Sushi',  baseCost: 7, baseAppeal: 6, color: '#ff6699' },
    { name: 'Salad',  baseCost: 3, baseAppeal: 5, color: '#66bb44' }
  ];

  const STAFF_TYPES = [
    { role: 'Chef',    cost: 200, desc: '+Quality' },
    { role: 'Waiter',  cost: 120, desc: '+Speed' },
    { role: 'Cleaner', cost: 80,  desc: '+Hygiene' }
  ];

  const UPGRADES = [
    { name: 'Better Oven',  cost: 500, effect: 'quality',   bonus: 0.15, desc: '+15% Quality' },
    { name: 'Nice Decor',   cost: 400, effect: 'appeal',    bonus: 0.12, desc: '+12% Appeal' },
    { name: 'Advertising',  cost: 350, effect: 'customers', bonus: 0.2,  desc: '+20% Customers' },
    { name: 'AC System',    cost: 300, effect: 'reviews',   bonus: 0.1,  desc: '+10% Reviews' }
  ];

  const EVENTS = [
    { name: 'Food Critic!',     apply: (r) => { r.eventBonus = r.quality > 0.7 ? 0.3 : -0.2;  return r.quality > 0.7 ? 'Great review! +30% cust' : 'Bad review! -20% cust'; }},
    { name: 'Health Check!',    apply: (r) => { let h = r.hygiene; r.eventBonus = h > 0.6 ? 0.1 : -0.4; if (h < 0.3) { r.cash -= 200; return 'Failed! -$200, -40%'; } return h > 0.6 ? 'Passed! +10%' : '-40% cust'; }},
    { name: 'Supply Shortage!', apply: (r) => { let i = Math.floor(Math.random()*4); if (r.menu[i].active) { r.menu[i].shortage = true; return r.menu[i].name+' unavailable!'; } return 'No impact'; }},
    { name: 'Festival!',        apply: (r) => { r.eventBonus = 0.4;  return '+40% customers!'; }},
    { name: 'Rainy Day',        apply: (r) => { r.eventBonus = -0.15; return '-15% foot traffic'; }},
    { name: 'Celebrity!',       apply: (r) => { if (r.quality > 0.75) { r.eventBonus = 0.5; return '+50% customers!'; } r.eventBonus = 0; return 'Celebrity went elsewhere'; }}
  ];

  const RESTAURANT_COLORS = ['#ee6644', '#44aaee', '#44cc66', '#eeaa44'];
  const RESTAURANT_NAMES  = ['Your Place', 'Chez Bot', 'AI Diner', 'RoboEats'];

  const MAX_ROUNDS   = 15;
  const NUM_PLAYERS  = 4;
  const BASE_CUSTOMERS = 30;

  let score     = 0;
  let bestScore = parseInt(localStorage.getItem('restaurantTycoonBest') || '0');
  if (bestEl) bestEl.textContent = bestScore.toLocaleString();

  let restaurants   = [];
  let currentRound  = 0;
  let phase         = 'menu';
  let eventLog      = [];
  let animFrame     = 0;
  let customerAnims = [];
  let roundResults  = null;
  let buttons       = [];  // filled each draw frame

  // ── Game logic ──────────────────────────────────────────────────────────────

  function createRestaurant(index, isHuman) {
    return {
      name: RESTAURANT_NAMES[index],
      color: RESTAURANT_COLORS[index],
      isHuman,
      cash: 2000,
      totalProfit: 0,
      menu: MENU_ITEMS.map((m, i) => ({
        name: m.name, baseCost: m.baseCost, baseAppeal: m.baseAppeal,
        color: m.color, price: m.baseCost + 3, active: i < 2, shortage: false
      })),
      staff: { chefs: 1, waiters: 1, cleaners: 1 },
      upgrades: [false, false, false, false],
      quality: 0.5, speed: 0.5, hygiene: 0.5,
      reviews: 3.0,
      eventBonus: 0,
      roundHistory: [],
      customersToday: 0,
      revenueToday: 0,
      costsToday: 0
    };
  }

  function calcStats(r) {
    let qb = 0.3 + r.staff.chefs   * 0.15;
    let sb = 0.3 + r.staff.waiters  * 0.15;
    let hb = 0.3 + r.staff.cleaners * 0.2;
    if (r.upgrades[0]) qb += UPGRADES[0].bonus;
    if (r.upgrades[3]) hb += UPGRADES[3].bonus;
    r.quality = Math.min(1, qb);
    r.speed   = Math.min(1, sb);
    r.hygiene = Math.min(1, hb);
  }

  function calcAppeal(r) {
    let active = r.menu.filter(m => m.active && !m.shortage);
    if (active.length === 0) return 0;
    let avgPrice    = active.reduce((s, m) => s + m.price, 0)    / active.length;
    let avgBaseCost = active.reduce((s, m) => s + m.baseCost, 0) / active.length;
    let priceRatio  = avgBaseCost / avgPrice;
    let variety     = active.length / 4;
    let qualBonus   = r.quality * 0.3;
    let decorBonus  = r.upgrades[1] ? UPGRADES[1].bonus : 0;
    let reviewBonus = (r.reviews - 2.5) * 0.1;
    return Math.max(0, priceRatio * 0.3 + variety * 0.2 + qualBonus + decorBonus + reviewBonus + 0.15);
  }

  function simulateRound() {
    let totalCustomers = BASE_CUSTOMERS + currentRound * 3;
    let appeals = restaurants.map(r => {
      calcStats(r);
      let a = calcAppeal(r);
      let adBonus = r.upgrades[2] ? UPGRADES[2].bonus : 0;
      let evBonus = r.eventBonus;
      return Math.max(0.05, a * (1 + adBonus) * (1 + evBonus));
    });
    let totalAppeal = appeals.reduce((s, v) => s + v, 0);

    restaurants.forEach((r, i) => {
      let share     = appeals[i] / totalAppeal;
      let customers = Math.round(totalCustomers * share);
      r.customersToday = customers;

      let active = r.menu.filter(m => m.active && !m.shortage);
      let revenue = 0;
      if (active.length > 0) {
        for (let c = 0; c < customers; c++) {
          let item = active[Math.floor(Math.random() * active.length)];
          revenue += item.price;
        }
      }
      let serveRate = Math.min(1, 0.5 + r.speed * 0.6);
      let maxServe  = Math.floor(customers * serveRate);
      if (customers > maxServe) {
        revenue = revenue * (maxServe / customers);
        r.customersToday = maxServe;
      }
      r.revenueToday = Math.round(revenue);

      let staffCost = r.staff.chefs * STAFF_TYPES[0].cost + r.staff.waiters * STAFF_TYPES[1].cost + r.staff.cleaners * STAFF_TYPES[2].cost;
      let foodCost  = 0;
      if (active.length > 0) {
        foodCost = r.customersToday * (active.reduce((s, m) => s + m.baseCost, 0) / active.length);
      }
      r.costsToday = Math.round(staffCost + foodCost);

      let profit = r.revenueToday - r.costsToday;
      r.cash        += profit;
      r.totalProfit += profit;

      let satisfaction = (r.quality * 0.4 + r.speed * 0.2 + r.hygiene * 0.3 + (appeals[i] > 0.3 ? 0.1 : 0)) * 5;
      r.reviews = r.reviews * 0.7 + satisfaction * 0.3;
      r.reviews = Math.max(1, Math.min(5, r.reviews));

      r.roundHistory.push({ round: currentRound, revenue: r.revenueToday, costs: r.costsToday, profit, customers: r.customersToday, reviews: r.reviews });

      r.menu.forEach(m => m.shortage = false);
      r.eventBonus = 0;
    });

    customerAnims = [];
    restaurants.forEach((r, i) => {
      for (let c = 0; c < Math.min(r.customersToday, 8); c++) {
        customerAnims.push({
          targetX: 75 + i * 140,
          startX:  75 + i * 140 + (Math.random() - 0.5) * 100,
          y:       115 + Math.random() * 15,
          delay:   c * 8,
          frame:   0
        });
      }
    });
  }

  function aiDecide(r, roundNum) {
    let avgCompPrice = 0, count = 0;
    restaurants.forEach(other => {
      if (other === r) return;
      other.menu.forEach(m => { if (m.active) { avgCompPrice += m.price; count++; } });
    });
    avgCompPrice = count > 0 ? avgCompPrice / count : 8;

    r.menu.forEach((item, idx) => {
      if (roundNum > 3 && idx === 2 && !item.active && r.cash > 500) item.active = true;
      if (roundNum > 6 && idx === 3 && !item.active && r.cash > 800) item.active = true;
      if (item.active) {
        let targetPrice = item.baseCost + 2 + Math.random() * 3;
        if (r.reviews < 3)  targetPrice -= 1;
        if (r.quality > 0.7) targetPrice += 1;
        if (targetPrice > avgCompPrice + 2) targetPrice -= 1;
        item.price = Math.max(item.baseCost + 1, Math.round(targetPrice));
      }
    });

    if (r.cash > 600) {
      if (r.quality < 0.6 && r.staff.chefs   < 4) { r.staff.chefs++;   r.cash -= 100; }
      if (r.speed  < 0.5 && r.staff.waiters  < 4) { r.staff.waiters++; r.cash -= 80;  }
      if (r.hygiene < 0.5 && r.staff.cleaners < 4) { r.staff.cleaners++; r.cash -= 60; }
    }
    if (r.cash < 300 && r.roundHistory.length > 0) {
      let last = r.roundHistory[r.roundHistory.length - 1];
      if (last && last.profit < 0) {
        if (r.staff.waiters > 1)  r.staff.waiters--;
        else if (r.staff.cleaners > 1) r.staff.cleaners--;
      }
    }

    UPGRADES.forEach((up, i) => {
      if (!r.upgrades[i] && r.cash > up.cost + 400) {
        let buy = false;
        if (i === 0 && r.quality < 0.6)  buy = true;
        if (i === 1 && r.reviews < 3.5)  buy = true;
        if (i === 2 && roundNum > 4)      buy = true;
        if (i === 3 && r.hygiene < 0.5)   buy = true;
        if (roundNum > 8 && Math.random() < 0.4) buy = true;
        if (buy) { r.upgrades[i] = true; r.cash -= up.cost; }
      }
    });
  }

  function startGame() {
    restaurants = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
      restaurants.push(createRestaurant(i, i === 0));
    }
    currentRound  = 1;
    phase         = 'menu';
    eventLog      = [];
    customerAnims = [];
    roundResults  = null;
    score         = 0;
    if (scoreEl) scoreEl.textContent = '0';
    game.setState('playing');
  }

  function endGame() {
    let playerProfit = restaurants[0].totalProfit;
    score = playerProfit;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('restaurantTycoonBest', bestScore.toString());
      if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    }
    let rankings = restaurants.slice().sort((a, b) => b.totalProfit - a.totalProfit);
    let rank     = rankings.findIndex(r => r.isHuman) + 1;
    let rankStr  = ['1st', '2nd', '3rd', '4th'][rank - 1];
    let title    = rank === 1 ? 'YOU WON!' : 'GAME OVER';
    let rankList = rankings.map((r, i) => `${i+1}. ${r.name}: $${r.totalProfit.toLocaleString()}`).join('  ');
    game.showOverlay(title, `You finished ${rankStr}! Profit: $${playerProfit.toLocaleString()} | ${rankList} | Click to Play Again`);
    game.setState('over');
  }

  function advancePhase() {
    if (phase === 'menu') {
      phase = 'staff';
    } else if (phase === 'staff') {
      phase = 'upgrade';
    } else if (phase === 'upgrade') {
      restaurants.forEach(r => { if (!r.isHuman) aiDecide(r, currentRound); });
      eventLog = [];
      if (Math.random() < 0.45 || currentRound === 7 || currentRound === 13) {
        let ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        restaurants.forEach(r => {
          let msg = ev.apply(r);
          if (r.isHuman) eventLog.push(ev.name + ': ' + msg);
        });
      }
      simulateRound();
      phase     = 'results';
      animFrame = 0;
    } else if (phase === 'results') {
      currentRound++;
      if (currentRound > MAX_ROUNDS) {
        endGame();
        return;
      }
      phase = 'menu';
    }
  }

  // ── Rendering helpers ────────────────────────────────────────────────────────

  // Draw a filled rectangle panel with border
  function drawPanel(renderer, x, y, w, h, fillColor, borderColor) {
    renderer.fillRect(x, y, w, h, fillColor);
    if (borderColor) {
      // Draw border as 4 thin rects (1px)
      renderer.fillRect(x,         y,         w, 1, borderColor);
      renderer.fillRect(x,         y + h - 1, w, 1, borderColor);
      renderer.fillRect(x,         y,         1, h, borderColor);
      renderer.fillRect(x + w - 1, y,         1, h, borderColor);
    }
  }

  // Stat bar
  function drawStatBar(renderer, text, x, y, barW, value, barColor) {
    renderer.fillRect(x, y, barW, 8, '#0a0a1e');
    renderer.fillRect(x, y, barW * value, 8, barColor);
  }

  // Draw a button (also registers it in `buttons`)
  function drawButton(renderer, text_, bx, by, bw, bh, label, action, color, small) {
    let fillColor = color || THEME;
    // Semi-transparent fill: encode alpha in hex
    let r = parseInt(fillColor.slice(1, 3), 16);
    let g = parseInt(fillColor.slice(3, 5), 16);
    let b = parseInt(fillColor.slice(5, 7), 16);
    let alphaHex = Math.round(0.85 * 255).toString(16).padStart(2, '0');
    renderer.fillRect(bx, by, bw, bh, fillColor + alphaHex);
    // Border
    renderer.fillRect(bx, by, bw, 1, fillColor);
    renderer.fillRect(bx, by + bh - 1, bw, 1, fillColor);
    renderer.fillRect(bx, by, 1, bh, fillColor);
    renderer.fillRect(bx + bw - 1, by, 1, bh, fillColor);
    // Label
    let fontSize = small ? 10 : 11;
    text_.drawText(label, bx + bw / 2, by + bh / 2 - fontSize * 0.6, fontSize, '#ffffff', 'center');
    // Register
    buttons.push({ x: bx, y: by, w: bw, h: bh, action });
  }

  // ── Draw phases ──────────────────────────────────────────────────────────────

  function drawStreetView(renderer, text_) {
    // Sky gradient approximation
    renderer.fillRect(0, 0, W, 68, '#1a1a3e');
    renderer.fillRect(0, 68, W, 67, '#222244');

    // Road
    renderer.fillRect(0, 120, W, 15, '#2a2a3e');
    // Dashed center line
    renderer.dashedLine(0, 127, W, 127, '#444444', 2, 8, 8);

    // Buildings
    restaurants.forEach((r, i) => {
      let bx = 20 + i * 145;
      let bw = 130;
      let bh = 70 + (r.upgrades[1] ? 10 : 0);
      let by = 120 - bh;

      // Building body
      renderer.fillRect(bx, by, bw, bh, DARK);
      drawPanel(renderer, bx, by, bw, bh, DARK, r.color);

      // Sign glow + name
      renderer.setGlow(r.color, 0.6);
      text_.drawText(r.name, bx + bw / 2, by + 6, 9, r.color, 'center');
      renderer.setGlow(null);

      // Windows (with alpha based on customers)
      let winAlpha = r.customersToday > 0 ? 'bb' : '4d';
      for (let wx = 0; wx < 3; wx++) {
        renderer.fillRect(bx + 12 + wx * 38, by + 22, 25, 18, '#ffaa88' + winAlpha);
      }

      // Stars (text stars)
      let stars = Math.round(r.reviews);
      let starStr = '*'.repeat(stars) + '.'.repeat(5 - stars);
      text_.drawText(starStr, bx + bw / 2, by + bh - 14, 9, '#ffdd44', 'center');

      // Door
      renderer.fillRect(bx + bw / 2 - 8, by + bh - 22, 16, 22, r.color + '99');
    });

    // Customer animations (results phase)
    if (phase === 'results') {
      customerAnims.forEach(ca => {
        ca.frame++;
        if (ca.frame < ca.delay) return;
        let progress = Math.min(1, (ca.frame - ca.delay) / 30);
        let cx = ca.startX + (ca.targetX - ca.startX) * progress;
        let cy = ca.y + Math.sin(progress * Math.PI) * -15;
        let alpha = progress < 0.9 ? 'ff' : Math.round((1 - progress) * 10 * 255).toString(16).padStart(2, '0');
        // Draw tiny person as small rect
        renderer.fillRect(cx - 3, cy - 8, 6, 8, '#dddddd' + alpha);
      });
    }

    // Round indicator
    text_.drawText('Round ' + currentRound + '/' + MAX_ROUNDS, W - 10, 4, 10, '#888888', 'right');
  }

  function drawPhaseTabs(renderer, text_) {
    let tabs     = ['Menu', 'Staff', 'Upgrades', 'Results'];
    let phaseIdx = phase === 'menu' ? 0 : phase === 'staff' ? 1 : phase === 'upgrade' ? 2 : 3;
    tabs.forEach((t, i) => {
      let tx    = 10 + i * 100;
      let color = i === phaseIdx ? THEME : '#333333';
      let alpha = i <= phaseIdx ? 'ff' : '66';
      renderer.fillRect(tx, 132, 90, 14, color + alpha);
      let tColor = i === phaseIdx ? '#ffffff' : '#aaaaaa';
      text_.drawText(t, tx + 45, 134, 9, tColor, 'center');
    });
  }

  function drawMenuPhase(renderer, text_) {
    let r  = restaurants[0];
    let py = 140;

    renderer.fillRect(5, py, W - 10, H - py - 5, PANEL);
    drawPanel(renderer, 5, py, W - 10, H - py - 5, PANEL, PANEL_BORDER);

    renderer.setGlow(THEME, 0.5);
    text_.drawText('SET YOUR MENU & PRICES', 15, py + 6, 13, THEME, 'left');
    renderer.setGlow(null);
    text_.drawText('Cash: $' + r.cash.toLocaleString(), 400, py + 8, 10, '#888888', 'left');

    r.menu.forEach((item, i) => {
      let iy     = py + 36 + i * 58;
      let active = item.active;
      let bgColor = active ? '#1a1a3e' : '#111128';
      let border  = active ? item.color : '#333333';

      drawPanel(renderer, 15, iy, W - 30, 50, bgColor, border);

      // Item color swatch
      renderer.fillRect(20, iy + 8, 10, 32, item.color);

      text_.drawText(item.name, 38, iy + 10, 12, active ? '#ffffff' : '#555555', 'left');
      text_.drawText('Cost: $' + item.baseCost + '  Appeal: ' + item.baseAppeal + '/10', 38, iy + 28, 10, '#888888', 'left');

      if (active) {
        text_.drawText('$' + item.price, 430, iy + 14, 14, '#ffffff', 'center');
        let margin   = item.price - item.baseCost;
        let mColor   = margin > 0 ? '#44cc66' : '#ee4444';
        text_.drawText('margin: $' + margin, 430, iy + 34, 9, mColor, 'center');

        drawButton(renderer, text_, 370, iy + 10, 24, 24, '-', () => { if (item.price > item.baseCost + 1) item.price--; }, '#cc4444', true);
        drawButton(renderer, text_, 465, iy + 10, 24, 24, '+', () => { item.price++; }, '#44cc44', true);
        drawButton(renderer, text_, 510, iy + 10, 55, 24, 'Remove', () => { item.active = false; }, '#884444', true);
      } else {
        drawButton(renderer, text_, 440, iy + 12, 80, 26, 'Add Item', () => { item.active = true; }, '#448866', true);
      }
    });

    drawButton(renderer, text_, W / 2 - 60, H - 40, 120, 30, 'NEXT >', () => advancePhase(), THEME, false);
  }

  function drawStaffPhase(renderer, text_) {
    let r  = restaurants[0];
    let py = 140;

    drawPanel(renderer, 5, py, W - 10, H - py - 5, PANEL, PANEL_BORDER);

    renderer.setGlow(THEME, 0.5);
    text_.drawText('MANAGE STAFF', 15, py + 6, 13, THEME, 'left');
    renderer.setGlow(null);
    text_.drawText('Cash: $' + r.cash.toLocaleString(), 400, py + 8, 10, '#888888', 'left');

    calcStats(r);

    STAFF_TYPES.forEach((st, i) => {
      let iy      = py + 36 + i * 72;
      let count   = i === 0 ? r.staff.chefs : i === 1 ? r.staff.waiters : r.staff.cleaners;
      let stat    = i === 0 ? r.quality     : i === 1 ? r.speed         : r.hygiene;
      let statName = i === 0 ? 'Quality'   : i === 1 ? 'Speed'         : 'Hygiene';

      drawPanel(renderer, 15, iy, W - 30, 62, '#1a1a3e', '#333355');

      // Role color bar
      let roleColor = i === 0 ? '#cc8844' : i === 1 ? '#44aaee' : '#44cc66';
      renderer.fillRect(15, iy, 4, 62, roleColor);

      text_.drawText(st.role + ' x' + count, 26, iy + 10, 12, '#ffffff', 'left');
      text_.drawText(st.desc + ' | Salary: $' + st.cost + '/round each', 26, iy + 28, 10, '#888888', 'left');

      // Stat bar
      let barColor = stat > 0.7 ? '#44cc66' : stat > 0.4 ? '#eeaa44' : '#ee4444';
      drawStatBar(renderer, text_, 26, iy + 44, 200, stat, barColor);
      text_.drawText(statName + ': ' + Math.round(stat * 100) + '%', 234, iy + 44, 8, '#ffffff', 'left');

      let staffKey = i === 0 ? 'chefs' : i === 1 ? 'waiters' : 'cleaners';
      drawButton(renderer, text_, 430, iy + 8,  50, 22, 'Hire', () => { if (r.cash >= st.cost) { r.staff[staffKey]++; r.cash -= Math.round(st.cost * 0.5); } }, '#448866', true);
      drawButton(renderer, text_, 490, iy + 8,  50, 22, 'Fire', () => { if (r.staff[staffKey] > 0) r.staff[staffKey]--; }, '#884444', true);
      text_.drawText('Total: $' + (count * st.cost) + '/rd', 460, iy + 48, 9, '#aaaaaa', 'center');
    });

    drawButton(renderer, text_, W / 2 - 60, H - 40, 120, 30, 'NEXT >', () => advancePhase(), THEME, false);
  }

  function drawUpgradePhase(renderer, text_) {
    let r  = restaurants[0];
    let py = 140;

    drawPanel(renderer, 5, py, W - 10, H - py - 5, PANEL, PANEL_BORDER);

    renderer.setGlow(THEME, 0.5);
    text_.drawText('BUY UPGRADES', 15, py + 6, 13, THEME, 'left');
    renderer.setGlow(null);
    text_.drawText('Cash: $' + r.cash.toLocaleString(), 400, py + 8, 10, '#888888', 'left');

    UPGRADES.forEach((up, i) => {
      let iy    = py + 36 + i * 58;
      let owned = r.upgrades[i];

      let bgColor = owned ? '#1a2a1a' : '#1a1a3e';
      let border  = owned ? '#44cc66' : '#333355';
      drawPanel(renderer, 15, iy, W - 30, 50, bgColor, border);

      // Upgrade icon strip
      let upColor = ['#cc6644', '#aa44ee', '#ee8844', '#44aaee'][i];
      renderer.fillRect(15, iy, 4, 50, upColor);

      text_.drawText(up.name, 26, iy + 10, 12, '#ffffff', 'left');
      text_.drawText(up.desc, 26, iy + 28, 10, '#888888', 'left');

      if (owned) {
        text_.drawText('[OWNED]', 480, iy + 18, 11, '#44cc66', 'center');
      } else {
        let canBuy = r.cash >= up.cost;
        drawButton(renderer, text_, 430, iy + 10, 100, 28, '$' + up.cost, () => {
          if (r.cash >= up.cost) { r.upgrades[i] = true; r.cash -= up.cost; }
        }, canBuy ? '#448866' : '#444444', false);
      }
    });

    drawButton(renderer, text_, W / 2 - 60, H - 40, 120, 30, 'SIMULATE >', () => advancePhase(), '#ee8844', false);
  }

  function drawResultsPhase(renderer, text_) {
    animFrame++;
    let py = 140;

    drawPanel(renderer, 5, py, W - 10, H - py - 5, PANEL, PANEL_BORDER);

    renderer.setGlow(THEME, 0.5);
    text_.drawText('ROUND ' + currentRound + ' RESULTS', 15, py + 6, 13, THEME, 'left');
    renderer.setGlow(null);

    let ey = py + 26;

    if (eventLog.length > 0) {
      eventLog.forEach((e, i) => {
        text_.drawText(e, 15, ey + i * 14, 10, '#ffdd44', 'left');
      });
      ey += eventLog.length * 14 + 4;
    }

    // Table header
    text_.drawText('Restaurant', 20, ey + 6, 9, '#666666', 'left');
    text_.drawText('Cust',    220, ey + 6, 9, '#666666', 'center');
    text_.drawText('Revenue', 295, ey + 6, 9, '#666666', 'center');
    text_.drawText('Costs',   370, ey + 6, 9, '#666666', 'center');
    text_.drawText('Profit',  450, ey + 6, 9, '#666666', 'center');
    text_.drawText('Stars',   540, ey + 6, 9, '#666666', 'center');

    let sorted = restaurants.slice().sort((a, b) => (b.revenueToday - b.costsToday) - (a.revenueToday - a.costsToday));

    sorted.forEach((r, i) => {
      let ry     = ey + 18 + i * 34;
      let profit = r.revenueToday - r.costsToday;
      let isPlayer = r.isHuman;

      let rowBg = isPlayer ? '#1a1a3e' : '#111128';
      drawPanel(renderer, 10, ry - 4, W - 20, 28, rowBg, isPlayer ? THEME : null);

      text_.drawText((isPlayer ? '> ' : '  ') + r.name, 20, ry + 6, 11, r.color, 'left');
      text_.drawText(r.customersToday.toString(), 220, ry + 6, 11, '#dddddd', 'center');
      text_.drawText('$' + r.revenueToday, 295, ry + 6, 11, '#44cc66', 'center');
      text_.drawText('$' + r.costsToday,   370, ry + 6, 11, '#ee8888', 'center');
      let pColor = profit >= 0 ? '#44cc66' : '#ee4444';
      text_.drawText((profit >= 0 ? '+' : '') + '$' + profit, 450, ry + 6, 11, pColor, 'center');
      text_.drawText(r.reviews.toFixed(1) + '*', 540, ry + 6, 10, '#ffdd44', 'center');
    });

    // Standings
    let sy = ey + 18 + NUM_PLAYERS * 34 + 8;
    text_.drawText('STANDINGS (Total Profit):', 20, sy, 9, '#666666', 'left');

    let ranked = restaurants.slice().sort((a, b) => b.totalProfit - a.totalProfit);
    ranked.forEach((r, i) => {
      let rColor = r.isHuman ? THEME : r.color;
      text_.drawText((i + 1) + '. ' + r.name + ': $' + r.totalProfit.toLocaleString() + '  (Cash: $' + r.cash.toLocaleString() + ')', 20, sy + 14 + i * 13, 10, rColor, 'left');
    });

    let btnLabel = currentRound >= MAX_ROUNDS ? 'FINISH' : 'NEXT ROUND >';
    drawButton(renderer, text_, W / 2 - 70, H - 40, 140, 30, btnLabel, () => advancePhase(), THEME, false);
  }

  // ── Engine setup ──────────────────────────────────────────────────────────────

  const game = new Game('game');

  // Mouse click handling (registered once, outside onInit to avoid duplicates on restart)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (game.state === 'waiting') {
      startGame();
      return;
    }
    if (game.state === 'over') {
      game.overlay.style.display = 'none';
      game.overlay.style.pointerEvents = 'none';
      startGame();
      return;
    }

    for (let b of buttons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        b.action();
        return;
      }
    }
  });

  // Hover cursor (registered once, outside onInit to avoid duplicates on restart)
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    let over = buttons.some(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
    canvas.style.cursor = over ? 'pointer' : 'default';
  });

  // Overlay click to start (registered once, outside onInit to avoid duplicates on restart)
  if (game.overlay) {
    game.overlay.addEventListener('click', () => {
      if (game.state === 'waiting' || game.state === 'over') {
        game.overlay.style.display = 'none';
        game.overlay.style.pointerEvents = 'none';
        startGame();
      }
    });
  }

  game.onInit = () => {
    game.showOverlay('RESTAURANT TYCOON PvP', 'Compete against AI restaurants on the same street. Set menus, hire staff, upgrade, and outprice the competition! Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    // Score display update
    if (restaurants.length > 0) {
      score = restaurants[0].totalProfit;
      if (scoreEl) scoreEl.textContent = score.toLocaleString();
    }
  };

  game.onDraw = (renderer, text_) => {
    // Clear buttons each frame
    buttons = [];

    if (game.state !== 'playing') {
      // Idle — draw empty street if we have restaurants, else skip
      if (restaurants.length > 0) {
        drawStreetView(renderer, text_);
      }
      return;
    }

    drawStreetView(renderer, text_);
    drawPhaseTabs(renderer, text_);

    if (phase === 'menu')    drawMenuPhase(renderer, text_);
    else if (phase === 'staff')   drawStaffPhase(renderer, text_);
    else if (phase === 'upgrade') drawUpgradePhase(renderer, text_);
    else if (phase === 'results') drawResultsPhase(renderer, text_);
  };

  game.start();
  return game;
}
