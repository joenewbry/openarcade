// idle-clicker-pvp/game.js — Idle Clicker PvP as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

const THEME = '#ffff66';
const BG = '#1a1a2e';
const PANEL_BG = '#16213e';
const DARK_PANEL = '#0f1629';

const COLORS = ['#44aaff', '#ff5555', '#55ff55', '#ff9900'];
const PLAYER_NAMES = ['YOU', 'CPU-A', 'CPU-B', 'CPU-C'];

const GAME_DURATION = 180;

const UPGRADE_DEFS = [
  { name: 'Auto-Click', baseCost: 15,   baseRate: 0.5,  icon: '\u2699' },
  { name: 'Multiplier', baseCost: 100,  baseRate: 3,    icon: '\u00d7' },
  { name: 'Factory',    baseCost: 500,  baseRate: 15,   icon: '\u2302' },
  { name: 'Robot',      baseCost: 2500, baseRate: 80,   icon: '\u2318' },
];

const DEFENSE_DEFS = [
  { name: 'Firewall',  cost: 200, icon: '\u2761', desc: 'Block hacks' },
  { name: 'Vault',     cost: 350, icon: '\u2610', desc: 'Protect coins' },
  { name: 'Antivirus', cost: 500, icon: '\u2020', desc: 'Block viruses' },
];

const SABOTAGE_DEFS = [
  { name: 'Hack',  cost: 150, icon: '\u26a1', desc: '-50% prod 10s', duration: 10 },
  { name: 'Steal', cost: 250, icon: '\u2694', desc: 'Steal 10% coins', duration: 0 },
  { name: 'Virus', cost: 400, icon: '\u2623', desc: 'Disable upg 15s', duration: 15 },
];

const LEADERBOARD_H = 38;
const TIMER_H = 18;
const TOP_H = LEADERBOARD_H + TIMER_H;
const PANEL_W = 148;
const CLICK_AREA_X = PANEL_W;
const CLICK_AREA_W = W - PANEL_W * 2;
const CLICK_AREA_H = H - TOP_H;
const CLICK_BTN = { x: W / 2, y: TOP_H + 68, r: 42 };

function getUpgradeBtn(i)  { return { x: 4,       y: TOP_H + 10 + i * 55,             w: 140, h: 50 }; }
function getDefenseBtn(i)  { return { x: 4,       y: TOP_H + 10 + 4 * 55 + 6 + i * 44, w: 140, h: 38 }; }
function getSabotageBtn(i) { return { x: W - 144, y: TOP_H + 10 + i * 52,              w: 140, h: 46 }; }
function getTargetBtn(i)   { return { x: W - 144, y: TOP_H + 10 + 3 * 52 + 10 + i * 36, w: 140, h: 30 }; }

// ── State ──
let gameTimer, score, players, selectedSabotageType;
let particles, warningFlashes, floatingTexts;
let pendingClicks = [];
let frameCount = 0;
let pulseTick = 0; // incremented each frame for pulse animation

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
let best = parseInt(localStorage.getItem('idleClickerPvpBest') || '0');
if (bestEl) bestEl.textContent = best;

// ── Helpers ──
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000)   return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function upgradeCost(def, count) {
  return Math.floor(def.baseCost * Math.pow(1.18, count));
}

function createPlayer(index) {
  return {
    index,
    coins: 0,
    totalCoins: 0,
    upgrades: [0, 0, 0, 0],
    defenses: [false, false, false],
    disabledUpgrade: -1,
    disableTimer: 0,
    hackTimer: 0,
    productionRate: 0,
    clickPower: 1,
    isAI: index > 0,
    aiClickTimer: 0,
    aiSabotageTimer: 5 + Math.random() * 10,
    aiStrategyBias: Math.random(),
  };
}

function calcProduction(p) {
  let rate = 0;
  for (let i = 0; i < 4; i++) {
    if (p.disabledUpgrade === i) continue;
    rate += p.upgrades[i] * UPGRADE_DEFS[i].baseRate;
  }
  if (p.hackTimer > 0) rate *= 0.5;
  p.productionRate = rate;
  return rate;
}

function spawnCoinParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 5 - 2,
      life: 1,
      color: color || THEME,
      size: Math.random() * 3 + 2,
    });
  }
}

function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color: color || THEME, life: 1 });
}

function spawnWarningFlash(playerIndex) {
  warningFlashes.push({ player: playerIndex, life: 1 });
}

function executeSabotage(type, attackerIdx, targetIdx) {
  const target = players[targetIdx];
  const attacker = players[attackerIdx];

  if (type === 0) {
    if (target.defenses[0]) {
      if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, 'FIREWALL BLOCKED!', '#55ff55');
      return;
    }
    target.hackTimer = Math.max(target.hackTimer, SABOTAGE_DEFS[0].duration);
    spawnWarningFlash(targetIdx);
    if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, 'HACKED! -50%', '#ff5555');
  } else if (type === 1) {
    if (target.defenses[1]) {
      if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, 'VAULT PROTECTED!', '#55ff55');
      return;
    }
    const stolen = Math.floor(target.coins * 0.1);
    target.coins -= stolen;
    attacker.coins += stolen;
    attacker.totalCoins += stolen;
    spawnWarningFlash(targetIdx);
    if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, `-${formatNum(stolen)} STOLEN!`, '#ff5555');
    if (attackerIdx === 0) spawnFloatingText(W / 2, TOP_H + 80, `+${formatNum(stolen)} STOLEN!`, '#55ff55');
  } else if (type === 2) {
    if (target.defenses[2]) {
      if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, 'ANTIVIRUS BLOCKED!', '#55ff55');
      return;
    }
    const available = [];
    for (let i = 0; i < 4; i++) {
      if (target.upgrades[i] > 0 && target.disabledUpgrade !== i) available.push(i);
    }
    if (available.length > 0) {
      target.disabledUpgrade = available[Math.floor(Math.random() * available.length)];
      target.disableTimer = SABOTAGE_DEFS[2].duration;
      spawnWarningFlash(targetIdx);
      if (targetIdx === 0) spawnFloatingText(W / 2, TOP_H + 60, 'VIRUS! Upgrade disabled!', '#ff5555');
    }
  }
}

function aiTick(p, dt) {
  // AI clicking
  p.aiClickTimer -= dt;
  if (p.aiClickTimer <= 0) {
    const clickRate = 2 + Math.random() * 3;
    const earned = p.clickPower;
    p.coins += earned;
    p.totalCoins += earned;
    p.aiClickTimer = 1 / clickRate;
  }

  // AI upgrade buying
  if (Math.random() < dt * 2) {
    let bestVal = -1, bestIdx = -1;
    for (let i = 0; i < 4; i++) {
      const cost = upgradeCost(UPGRADE_DEFS[i], p.upgrades[i]);
      if (cost <= p.coins) {
        const value = UPGRADE_DEFS[i].baseRate / cost;
        if (value > bestVal) { bestVal = value; bestIdx = i; }
      }
    }
    if (bestIdx >= 0) {
      const cost = upgradeCost(UPGRADE_DEFS[bestIdx], p.upgrades[bestIdx]);
      p.coins -= cost;
      p.upgrades[bestIdx]++;
    }
    // Consider defenses
    for (let i = 0; i < 3; i++) {
      if (!p.defenses[i] && p.coins >= DEFENSE_DEFS[i].cost && Math.random() < 0.25) {
        p.coins -= DEFENSE_DEFS[i].cost;
        p.defenses[i] = true;
      }
    }
  }

  // AI sabotage
  p.aiSabotageTimer -= dt;
  if (p.aiSabotageTimer <= 0) {
    p.aiSabotageTimer = 8 + Math.random() * 15;
    let target = -1, maxCoins = -1;
    for (let i = 0; i < 4; i++) {
      if (i === p.index) continue;
      if (players[i].totalCoins > maxCoins) { maxCoins = players[i].totalCoins; target = i; }
    }
    if (target >= 0) {
      if (p.coins >= SABOTAGE_DEFS[2].cost && p.aiStrategyBias > 0.6 && Math.random() < 0.35) {
        if (!players[target].defenses[2]) { p.coins -= SABOTAGE_DEFS[2].cost; executeSabotage(2, p.index, target); }
      } else if (p.coins >= SABOTAGE_DEFS[1].cost && Math.random() < 0.45) {
        if (!players[target].defenses[1]) { p.coins -= SABOTAGE_DEFS[1].cost; executeSabotage(1, p.index, target); }
      } else if (p.coins >= SABOTAGE_DEFS[0].cost && Math.random() < 0.55) {
        if (!players[target].defenses[0]) { p.coins -= SABOTAGE_DEFS[0].cost; executeSabotage(0, p.index, target); }
      }
    }
  }
}

// ── Process a canvas click ──
function handleClick(cx, cy, game) {
  if (game.state !== 'playing') return;
  const p = players[0];

  // Click button (big coin)
  const dx = cx - CLICK_BTN.x;
  const dy = cy - CLICK_BTN.y;
  if (dx * dx + dy * dy <= CLICK_BTN.r * CLICK_BTN.r) {
    const earned = p.clickPower;
    p.coins += earned;
    p.totalCoins += earned;
    spawnCoinParticles(CLICK_BTN.x, CLICK_BTN.y, 6 + Math.min(Math.floor(earned), 20), THEME);
    spawnFloatingText(CLICK_BTN.x + (Math.random() - 0.5) * 30, CLICK_BTN.y - 30, `+${earned.toFixed(1)}`, THEME);
    return;
  }

  // Upgrade buttons
  for (let i = 0; i < 4; i++) {
    const btn = getUpgradeBtn(i);
    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
      const cost = upgradeCost(UPGRADE_DEFS[i], p.upgrades[i]);
      if (p.coins >= cost) {
        p.coins -= cost;
        p.upgrades[i]++;
        spawnCoinParticles(btn.x + btn.w / 2, btn.y + btn.h / 2, 4, '#55ff55');
        spawnFloatingText(btn.x + btn.w / 2, btn.y, `+1 ${UPGRADE_DEFS[i].name}`, '#55ff55');
      }
      return;
    }
  }

  // Defense buttons
  for (let i = 0; i < 3; i++) {
    const btn = getDefenseBtn(i);
    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
      if (!p.defenses[i] && p.coins >= DEFENSE_DEFS[i].cost) {
        p.coins -= DEFENSE_DEFS[i].cost;
        p.defenses[i] = true;
        spawnCoinParticles(btn.x + btn.w / 2, btn.y + btn.h / 2, 6, '#44aaff');
      }
      return;
    }
  }

  // Sabotage type buttons
  for (let i = 0; i < 3; i++) {
    const btn = getSabotageBtn(i);
    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
      if (p.coins >= SABOTAGE_DEFS[i].cost) {
        selectedSabotageType = (selectedSabotageType === i) ? -1 : i;
      }
      return;
    }
  }

  // Target buttons (only when sabotage selected)
  if (selectedSabotageType >= 0) {
    for (let i = 0; i < 3; i++) {
      const btn = getTargetBtn(i);
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        const targetIdx = i + 1;
        const cost = SABOTAGE_DEFS[selectedSabotageType].cost;
        if (p.coins >= cost) {
          p.coins -= cost;
          executeSabotage(selectedSabotageType, 0, targetIdx);
          spawnCoinParticles(btn.x + btn.w / 2, btn.y + btn.h / 2, 8, '#ff5555');
          selectedSabotageType = -1;
        }
        return;
      }
    }
  }
}

// ── Draw helpers ──

function drawRect(renderer, x, y, w, h, color) {
  renderer.fillRect(x, y, w, h, color);
}

function drawRectOutline(renderer, x, y, w, h, color, lineW = 1) {
  // top, bottom, left, right
  renderer.drawLine(x, y, x + w, y, color, lineW);
  renderer.drawLine(x, y + h, x + w, y + h, color, lineW);
  renderer.drawLine(x, y, x, y + h, color, lineW);
  renderer.drawLine(x + w, y, x + w, y + h, color, lineW);
}

// Convert color hex to with alpha appended
function withAlpha(hexColor, alpha) {
  // alpha 0..1 -> hex 00..ff
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  if (hexColor.startsWith('#') && hexColor.length === 7) return hexColor + a;
  return hexColor;
}

function drawLeaderboard(renderer, text) {
  renderer.fillRect(0, 0, W, LEADERBOARD_H, DARK_PANEL);
  const ranked = players.slice().sort((a, b) => b.totalCoins - a.totalCoins);
  const colW = W / 4;

  for (let i = 0; i < 4; i++) {
    const p = ranked[i];
    const x = colW * i + colW / 2;
    // Rank label color
    const rankColor = i === 0 ? '#ffff66' : i === 1 ? '#cccccc' : i === 2 ? '#b87333' : '#666666';
    text.drawText(`#${i + 1}`, x - 42, 4, 10, rankColor, 'left');
    // Player name with glow
    renderer.setGlow(COLORS[p.index], p.index === 0 ? 0.8 : 0.4);
    text.drawText(PLAYER_NAMES[p.index], x, 4, 11, COLORS[p.index], 'center');
    renderer.setGlow(null);
    // Coins
    text.drawText(formatNum(Math.floor(p.totalCoins)), x, 19, 10, '#dddddd', 'center');
  }

  // Bottom border line with glow
  renderer.setGlow(THEME, 0.4);
  renderer.drawLine(0, LEADERBOARD_H - 1, W, LEADERBOARD_H - 1, THEME, 1.5);
  renderer.setGlow(null);
}

function drawTimer(renderer, text) {
  const y = LEADERBOARD_H;
  renderer.fillRect(0, y, W, TIMER_H, '#111111');
  const pct = gameTimer / GAME_DURATION;
  const barX = 70;
  const barW = W - 140;
  renderer.fillRect(barX, y + 3, barW, 12, '#222222');
  const barColor = pct > 0.5 ? '#55ff55' : pct > 0.2 ? '#ffff66' : '#ff5555';
  renderer.setGlow(barColor, 0.5);
  renderer.fillRect(barX, y + 3, barW * pct, 12, barColor);
  renderer.setGlow(null);

  const mins = Math.floor(gameTimer / 60);
  const secs = Math.floor(gameTimer % 60);
  text.drawText(`${mins}:${secs.toString().padStart(2, '0')}`, 8, y + 3, 10, '#ffffff', 'left');
  text.drawText(`${formatNum(Math.floor(players[0].productionRate))}/s`, W - 8, y + 3, 9, '#888888', 'right');
}

function drawLeftPanel(renderer, text) {
  const p = players[0];
  renderer.fillRect(0, TOP_H, PANEL_W, H - TOP_H, PANEL_BG);
  drawRectOutline(renderer, 0, TOP_H, PANEL_W, H - TOP_H, '#333333', 1);

  text.drawText('UPGRADES', PANEL_W / 2, TOP_H + 1, 9, THEME, 'center');

  for (let i = 0; i < 4; i++) {
    const btn = getUpgradeBtn(i);
    const def = UPGRADE_DEFS[i];
    const cost = upgradeCost(def, p.upgrades[i]);
    const canAfford = p.coins >= cost;
    const disabled = p.disabledUpgrade === i;

    const bgColor = disabled ? '#331111' : canAfford ? '#1a2a4a' : '#1a1a2a';
    renderer.fillRect(btn.x, btn.y, btn.w, btn.h, bgColor);

    const borderColor = disabled ? '#ff5555' : canAfford ? '#44aaff' : '#333333';
    if (canAfford && !disabled) renderer.setGlow('#44aaff', 0.3);
    drawRectOutline(renderer, btn.x, btn.y, btn.w, btn.h, borderColor, 1);
    renderer.setGlow(null);

    const nameColor = disabled ? '#ff5555' : canAfford ? '#ffffff' : '#666666';
    text.drawText(`${def.icon} ${def.name}`, btn.x + 4, btn.y + 2, 10, nameColor, 'left');
    const countColor = disabled ? '#ff5555' : '#55ff55';
    text.drawText(`x${p.upgrades[i]}`, btn.x + btn.w - 4, btn.y + 2, 9, countColor, 'right');

    const costColor = canAfford ? THEME : '#555555';
    text.drawText(`\u00a2${formatNum(cost)}`, btn.x + 4, btn.y + 17, 9, costColor, 'left');
    text.drawText(`+${def.baseRate}/s`, btn.x + 4, btn.y + 29, 9, '#888888', 'left');

    if (disabled) {
      text.drawText(`\u2623 ${Math.ceil(p.disableTimer)}s`, btn.x + btn.w - 4, btn.y + 29, 8, '#ff5555', 'right');
    }
  }

  // Defense section label
  const defLabelY = TOP_H + 4 * 55 + 1;
  text.drawText('DEFENSES', PANEL_W / 2, defLabelY, 9, '#44aaff', 'center');

  for (let i = 0; i < 3; i++) {
    const btn = getDefenseBtn(i);
    const def = DEFENSE_DEFS[i];
    const owned = p.defenses[i];

    const bgColor = owned ? '#1a3a2a' : p.coins >= def.cost ? '#1a2a4a' : '#1a1a2a';
    renderer.fillRect(btn.x, btn.y, btn.w, btn.h, bgColor);
    const borderColor = owned ? '#55ff55' : p.coins >= def.cost ? '#44aaff' : '#333333';
    drawRectOutline(renderer, btn.x, btn.y, btn.w, btn.h, borderColor, 1);

    const nameColor = owned ? '#55ff55' : p.coins >= def.cost ? '#ffffff' : '#666666';
    text.drawText(`${def.icon} ${def.name}`, btn.x + 4, btn.y + 2, 9, nameColor, 'left');

    if (owned) {
      text.drawText('\u2713 ON', btn.x + btn.w - 4, btn.y + 2, 8, '#55ff55', 'right');
    } else {
      const costColor = p.coins >= def.cost ? THEME : '#555555';
      text.drawText(`\u00a2${def.cost}`, btn.x + btn.w - 4, btn.y + 2, 9, costColor, 'right');
    }
    text.drawText(def.desc, btn.x + 4, btn.y + 16, 8, '#666666', 'left');
  }
}

function drawCenterArea(renderer, text) {
  const p = players[0];
  renderer.fillRect(CLICK_AREA_X, TOP_H, CLICK_AREA_W, CLICK_AREA_H, '#111827');

  // Pulsing click button
  const pulse = (Math.sin(pulseTick * 0.005 * 60) + 1) / 2; // pulseTick in frames at 60fps
  const pr = CLICK_BTN.r + pulse * 3;

  // Outer glow ring
  renderer.fillCircle(CLICK_BTN.x, CLICK_BTN.y, pr + 10, withAlpha(THEME, 0.06));

  // Button — approximate radial gradient with layered circles
  renderer.setGlow(THEME, 0.5 + pulse * 0.4);
  renderer.fillCircle(CLICK_BTN.x, CLICK_BTN.y, pr, '#886600');
  renderer.fillCircle(CLICK_BTN.x, CLICK_BTN.y, pr * 0.75, '#cc9900');
  renderer.fillCircle(CLICK_BTN.x, CLICK_BTN.y, pr * 0.45, '#ffe066');
  renderer.setGlow(null);

  // Coin symbol
  text.drawText('\u00a2', CLICK_BTN.x, CLICK_BTN.y - 14, 28, '#1a1a2e', 'center');

  // Click power text
  text.drawText(`+${p.clickPower.toFixed(1)}/click`, CLICK_BTN.x, CLICK_BTN.y + pr + 6, 9, THEME, 'center');

  // Player coins display
  renderer.setGlow(THEME, 0.8);
  text.drawText(`\u00a2 ${formatNum(Math.floor(p.coins))}`, CLICK_BTN.x, CLICK_BTN.y - pr - 28, 15, '#ffffff', 'center');
  renderer.setGlow(null);
  text.drawText(`Total: ${formatNum(Math.floor(p.totalCoins))}`, CLICK_BTN.x, CLICK_BTN.y - pr - 13, 9, '#aaaaaa', 'center');

  drawOpponentPanels(renderer, text);

  // Hack overlay
  if (p.hackTimer > 0) {
    const hackAlpha = 0.12 + Math.sin(pulseTick * 0.01 * 60) * 0.08;
    renderer.fillRect(CLICK_AREA_X, TOP_H, CLICK_AREA_W, CLICK_AREA_H, withAlpha('#ff3232', Math.max(0.04, hackAlpha)));
    renderer.setGlow('#ff5555', 0.8);
    text.drawText(`\u26a1 HACKED! -50% (${Math.ceil(p.hackTimer)}s)`, W / 2, TOP_H + CLICK_AREA_H - 22, 11, '#ff5555', 'center');
    renderer.setGlow(null);
  }
}

function drawOpponentPanels(renderer, text) {
  const pw = (CLICK_AREA_W - 16) / 3;
  const ph = 155;
  const py = TOP_H + 135;

  for (let i = 1; i < 4; i++) {
    const p = players[i];
    const px = CLICK_AREA_X + 4 + (i - 1) * (pw + 4);

    renderer.fillRect(px, py, pw, ph, DARK_PANEL);

    // Top color bar
    renderer.fillRect(px, py, pw, 3, COLORS[i]);

    // Name
    renderer.setGlow(COLORS[i], 0.4);
    text.drawText(PLAYER_NAMES[i], px + pw / 2, py + 5, 10, COLORS[i], 'center');
    renderer.setGlow(null);

    // Coins
    text.drawText(`\u00a2${formatNum(Math.floor(p.coins))}`, px + pw / 2, py + 20, 9, '#dddddd', 'center');

    // Rate
    text.drawText(`${formatNum(Math.floor(p.productionRate))}/s`, px + pw / 2, py + 32, 8, '#888888', 'center');

    // Upgrades
    for (let j = 0; j < 4; j++) {
      const uy = py + 46 + j * 13;
      const dis = p.disabledUpgrade === j;
      const upgColor = dis ? '#ff5555' : p.upgrades[j] > 0 ? '#55ff55' : '#444444';
      text.drawText(`${UPGRADE_DEFS[j].icon}`, px + 3, uy, 8, upgColor, 'left');
      text.drawText(`x${p.upgrades[j]}`, px + pw - 3, uy, 8, upgColor, 'right');
    }

    // Defense icons
    for (let j = 0; j < 3; j++) {
      const defColor = p.defenses[j] ? '#55ff55' : '#333333';
      text.drawText(DEFENSE_DEFS[j].icon, px + 15 + j * 28, py + 104, 9, defColor, 'center');
    }

    // Status effects
    if (p.hackTimer > 0) {
      text.drawText(`\u26a1HACKED ${Math.ceil(p.hackTimer)}s`, px + pw / 2, py + ph - 22, 8, '#ff5555', 'center');
    }
    if (p.disabledUpgrade >= 0) {
      text.drawText(`\u2623VIRUS ${Math.ceil(p.disableTimer)}s`, px + pw / 2, py + ph - 34, 8, '#ff9900', 'center');
    }
  }
}

function drawRightPanel(renderer, text) {
  const p = players[0];
  renderer.fillRect(W - PANEL_W, TOP_H, PANEL_W, H - TOP_H, PANEL_BG);
  drawRectOutline(renderer, W - PANEL_W, TOP_H, PANEL_W, H - TOP_H, '#333333', 1);

  text.drawText('SABOTAGE', W - PANEL_W / 2, TOP_H + 1, 9, '#ff5555', 'center');

  for (let i = 0; i < 3; i++) {
    const btn = getSabotageBtn(i);
    const def = SABOTAGE_DEFS[i];
    const canAfford = p.coins >= def.cost;
    const sel = selectedSabotageType === i;

    const bgColor = sel ? '#3a1a1a' : canAfford ? '#2a1a1a' : '#1a1a2a';
    renderer.fillRect(btn.x, btn.y, btn.w, btn.h, bgColor);
    const borderColor = sel ? '#ff5555' : canAfford ? '#ff9900' : '#333333';
    if (sel) renderer.setGlow('#ff5555', 0.6);
    drawRectOutline(renderer, btn.x, btn.y, btn.w, btn.h, borderColor, 1);
    renderer.setGlow(null);

    const nameColor = canAfford ? '#ffffff' : '#666666';
    text.drawText(`${def.icon} ${def.name}`, btn.x + 4, btn.y + 4, 10, nameColor, 'left');
    const costColor = canAfford ? THEME : '#555555';
    text.drawText(`\u00a2${def.cost}`, btn.x + btn.w - 4, btn.y + 4, 9, costColor, 'right');
    text.drawText(def.desc, btn.x + 4, btn.y + 19, 8, '#888888', 'left');

    if (sel) {
      text.drawText('\u25bc TARGET', btn.x + btn.w - 4, btn.y + 31, 8, '#ff5555', 'right');
    }
  }

  if (selectedSabotageType >= 0) {
    const ty = TOP_H + 3 * 52 + 4;
    text.drawText('SELECT TARGET', W - PANEL_W / 2, ty, 9, '#ff5555', 'center');

    for (let i = 0; i < 3; i++) {
      const btn = getTargetBtn(i);
      const targetIdx = i + 1;
      const target = players[targetIdx];

      renderer.fillRect(btn.x, btn.y, btn.w, btn.h, '#2a1a2a');
      drawRectOutline(renderer, btn.x, btn.y, btn.w, btn.h, COLORS[targetIdx], 1);

      text.drawText(PLAYER_NAMES[targetIdx], btn.x + 4, btn.y + 2, 9, COLORS[targetIdx], 'left');

      const defended = target.defenses[selectedSabotageType];
      if (defended) {
        text.drawText('\u2761 SHIELDED', btn.x + btn.w - 4, btn.y + 2, 8, '#55ff55', 'right');
      } else {
        text.drawText(`\u00a2${formatNum(Math.floor(target.coins))}`, btn.x + btn.w - 4, btn.y + 2, 8, THEME, 'right');
      }
    }
  } else {
    // Info text
    const iy = TOP_H + 3 * 52 + 16;
    const infoLines = [
      'Select a sabotage',
      'action above, then',
      'pick a target.',
      '',
      '\u26a1 Hack: halves',
      '  production rate',
      '',
      '\u2694 Steal: takes 10%',
      '  of their coins',
      '',
      '\u2623 Virus: disables',
      '  one upgrade',
    ];
    infoLines.forEach((l, idx) => {
      if (l) text.drawText(l, W - PANEL_W / 2, iy + idx * 13, 8, '#555555', 'center');
    });
  }
}

function drawParticles(renderer) {
  for (const pt of particles) {
    if (pt.life <= 0) continue;
    const alpha = Math.max(0, pt.life);
    const size = pt.size * pt.life;
    renderer.setGlow(pt.color, 0.6);
    renderer.fillCircle(pt.x, pt.y, size, withAlpha(pt.color, alpha));
    renderer.setGlow(null);
  }
}

function drawFloatingTexts(renderer, text) {
  for (const ft of floatingTexts) {
    if (ft.life <= 0) continue;
    const alpha = Math.max(0, ft.life);
    renderer.setGlow(ft.color, 0.8);
    text.drawText(ft.text, ft.x, ft.y - 12, 12, withAlpha(ft.color, alpha), 'center');
    renderer.setGlow(null);
  }
}

function drawWarningFlashes(renderer) {
  for (const wf of warningFlashes) {
    if (wf.life <= 0) continue;
    if (wf.player === 0) {
      renderer.fillRect(CLICK_AREA_X, TOP_H, CLICK_AREA_W, CLICK_AREA_H, withAlpha('#ff5555', wf.life * 0.3));
    } else {
      const pw2 = (CLICK_AREA_W - 16) / 3;
      const px = CLICK_AREA_X + 4 + (wf.player - 1) * (pw2 + 4);
      renderer.fillRect(px, TOP_H + 135, pw2, 155, withAlpha('#ff5555', wf.life * 0.4));
    }
  }
}

function drawIdleScreen(renderer, text) {
  renderer.setGlow(THEME, 0.8);
  text.drawText('IDLE CLICKER PVP', W / 2, H / 2 - 42, 28, THEME, 'center');
  renderer.setGlow(null);
  text.drawText('Compete. Upgrade. Sabotage.', W / 2, H / 2 - 2, 14, '#aaaaaa', 'center');
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Mouse click handler — queue to process in onUpdate
  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    if (game.state === 'waiting' || game.state === 'over') {
      // Reset then start
      resetState();
      game.setState('playing');
      return;
    }
    pendingClicks.push({ x: cx, y: cy });
  });

  function resetState() {
    players = [];
    for (let i = 0; i < 4; i++) players.push(createPlayer(i));
    gameTimer = GAME_DURATION;
    particles = [];
    warningFlashes = [];
    floatingTexts = [];
    selectedSabotageType = -1;
    score = 0;
    pulseTick = 0;
    pendingClicks.length = 0;
    if (scoreEl) scoreEl.textContent = '0';
  }

  game.onInit = () => {
    resetState();
    game.showOverlay('IDLE CLICKER PVP', 'Click to Start\n\nEarn coins, buy upgrades, sabotage opponents!\n3 minutes - highest coins wins');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    pulseTick++;
    frameCount++;

    if (game.state === 'waiting') return;

    if (game.state === 'over') {
      // Still process overlay click (handled by canvas click above via setState)
      // Drain any pending clicks
      pendingClicks.length = 0;
      return;
    }

    // Process queued clicks
    for (const click of pendingClicks) {
      handleClick(click.x, click.y, game);
    }
    pendingClicks.length = 0;

    // Convert dt from ms to seconds
    const dtSec = dt / 1000;

    gameTimer -= dtSec;
    if (gameTimer <= 0) {
      gameTimer = 0;
      endGame(game);
      return;
    }

    for (let p of players) {
      calcProduction(p);
      const earned = p.productionRate * dtSec;
      p.coins += earned;
      p.totalCoins += earned;
      p.clickPower = 1 + p.upgrades[1] * 0.5;
      if (p.hackTimer > 0) { p.hackTimer -= dtSec; if (p.hackTimer < 0) p.hackTimer = 0; }
      if (p.disableTimer > 0) {
        p.disableTimer -= dtSec;
        if (p.disableTimer <= 0) { p.disableTimer = 0; p.disabledUpgrade = -1; }
      }
      if (p.isAI) aiTick(p, dtSec);
    }

    score = Math.floor(players[0].totalCoins);
    if (scoreEl) scoreEl.textContent = formatNum(score);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 4 * dtSec;
      pt.life -= dtSec * 1.5;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 30 * dtSec;
      ft.life -= dtSec;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Warning flashes
    for (let i = warningFlashes.length - 1; i >= 0; i--) {
      warningFlashes[i].life -= dtSec * 2.5;
      if (warningFlashes[i].life <= 0) warningFlashes.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      drawIdleScreen(renderer, text);
      return;
    }

    drawLeaderboard(renderer, text);
    drawTimer(renderer, text);
    drawLeftPanel(renderer, text);
    drawCenterArea(renderer, text);
    drawRightPanel(renderer, text);
    drawWarningFlashes(renderer);
    drawParticles(renderer);
    drawFloatingTexts(renderer, text);
  };

  game.start();
  return game;
}

function endGame(game) {
  score = Math.floor(players[0].totalCoins);
  if (scoreEl) scoreEl.textContent = formatNum(score);

  if (score > best) {
    best = score;
    localStorage.setItem('idleClickerPvpBest', best);
    if (bestEl) bestEl.textContent = best;
  }

  const ranked = players.slice().sort((a, b) => b.totalCoins - a.totalCoins);
  const playerRank = ranked.findIndex(p => p.index === 0) + 1;
  const suffix = playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th';

  const title = playerRank === 1 ? 'VICTORY!' : 'GAME OVER';
  let lines = [`You placed ${playerRank}${suffix}!\n\nFinal Scores:\n`];
  ranked.forEach((p, i) => {
    const marker = p.index === 0 ? ' <-' : '';
    lines.push(`${i + 1}. ${PLAYER_NAMES[p.index]}: ${formatNum(Math.floor(p.totalCoins))} coins${marker}`);
  });
  lines.push('\nClick to play again');

  game.showOverlay(title, lines.join('\n'));
  game.setState('over');
}
