// capture-the-flag/game.js — Capture the Flag ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// Map constants
const MAP_W = 1200, MAP_H = 800;
const TILE = 40;
const COLS = MAP_W / TILE, ROWS = MAP_H / TILE;

// Class definitions
const CLASSES = {
  scout:    { speed: 3.2, hp: 60,  damage: 8,  fireRate: 180, ability: 'dash',     abilityCD: 3000, color: '#6cf', label: 'SCT' },
  heavy:    { speed: 1.6, hp: 150, damage: 18, fireRate: 400, ability: 'shield',   abilityCD: 8000, color: '#f66', label: 'HVY' },
  medic:    { speed: 2.2, hp: 80,  damage: 6,  fireRate: 250, ability: 'heal',     abilityCD: 5000, color: '#6f6', label: 'MED' },
  engineer: { speed: 2.0, hp: 90,  damage: 10, fireRate: 300, ability: 'turret',   abilityCD: 10000,color: '#ff6', label: 'ENG' }
};

// ── State ──
let walls, turrets, bullets, particles, players, flags, bases;
let teamCaptures, teamKills, camera, mouse, mouseDown, selectedClass, humanPlayer;
let roundOver, respawnMessages, score;
let lastFireTimes; // map from player to last fire timestamp (we use performance.now())
let turretLastFire; // per-turret fire timestamps

// Mouse queue
let pendingMouseDown = [];
let pendingMouseMove = { x: W / 2, y: H / 2 };

// Ability key pressed this frame
let abilityPressed = false;
let eKeyPressed = false;

// ── DOM elements ──
const blueScoreEl  = document.getElementById('blueScore');
const redScoreEl   = document.getElementById('redScore');
const blueKillsEl  = document.getElementById('blueKills');
const redKillsEl   = document.getElementById('redKills');
const scoreEl      = document.getElementById('score');

// ── Helpers ──
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function rectCollide(ax, ay, ar, rect) {
  const cx = Math.max(rect.x, Math.min(ax, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(ay, rect.y + rect.h));
  return Math.hypot(ax - cx, ay - cy) < ar;
}

function lineOfSight(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const steps = Math.ceil(d / 20);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = a.x + dx * t, py = a.y + dy * t;
    for (const w of walls) {
      if (px > w.x && px < w.x + w.w && py > w.y && py < w.y + w.h) return false;
    }
  }
  return true;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 1 + Math.random() * 2
    });
  }
}

function generateMap() {
  walls = [];
  // Center barriers
  for (let y = 4; y < ROWS - 4; y += 3) {
    walls.push({ x: COLS / 2 * TILE - TILE, y: y * TILE, w: TILE * 2, h: TILE });
  }
  // Scattered cover
  const rng = (a, b) => Math.floor(Math.random() * (b - a)) + a;
  for (let i = 0; i < 30; i++) {
    const wx = rng(4, COLS - 4) * TILE;
    const wy = rng(2, ROWS - 2) * TILE;
    const ww = rng(1, 3) * TILE;
    const wh = rng(1, 2) * TILE;
    if (wx < 200 || wx + ww > MAP_W - 200) continue;
    walls.push({ x: wx, y: wy, w: ww, h: wh });
  }
  // Side walls (boundary cover near bases)
  walls.push({ x: 200, y: 100, w: TILE, h: TILE * 4 });
  walls.push({ x: 200, y: MAP_H - 100 - TILE * 4, w: TILE, h: TILE * 4 });
  walls.push({ x: MAP_W - 200 - TILE, y: 100, w: TILE, h: TILE * 4 });
  walls.push({ x: MAP_W - 200 - TILE, y: MAP_H - 100 - TILE * 4, w: TILE, h: TILE * 4 });
}

function createPlayer(team, cls, isHuman) {
  const base = bases[team];
  const classDef = CLASSES[cls];
  const offsetX = (Math.random() - 0.5) * 60;
  const offsetY = (Math.random() - 0.5) * 120;
  return {
    x: base.x + offsetX,
    y: base.y + offsetY,
    vx: 0, vy: 0,
    team,
    cls,
    isHuman,
    hp: classDef.hp,
    maxHp: classDef.hp,
    speed: classDef.speed,
    damage: classDef.damage,
    fireRate: classDef.fireRate,
    lastFire: 0,
    angle: team === 'blue' ? 0 : Math.PI,
    alive: true,
    respawnTimer: 0,
    carryingFlag: null,
    abilityCD: 0,
    abilityCooldown: classDef.abilityCD,
    abilityActive: 0,
    shieldHP: 0,
    dashTimer: 0,
    aiRole: null,
    aiTarget: null,
    aiPathTimer: 0,
    aiGoal: null,
    kills: 0,
    radius: 10,
    label: classDef.label
  };
}

function fireBullet(p) {
  const now = performance.now();
  if (now - p.lastFire < p.fireRate) return;
  p.lastFire = now;
  const speed = 7;
  bullets.push({
    x: p.x + Math.cos(p.angle) * 14,
    y: p.y + Math.sin(p.angle) * 14,
    vx: Math.cos(p.angle) * speed,
    vy: Math.sin(p.angle) * speed,
    team: p.team,
    damage: p.damage,
    life: 80,
    owner: p
  });
}

function useAbility(p) {
  if (p.abilityCD > 0 || !p.alive) return;
  p.abilityCD = p.abilityCooldown;

  if (p.cls === 'scout') {
    p.dashTimer = 200;
    p.vx = Math.cos(p.angle) * 8;
    p.vy = Math.sin(p.angle) * 8;
  } else if (p.cls === 'heavy') {
    p.shieldHP = 80;
    p.abilityActive = 3000;
  } else if (p.cls === 'medic') {
    for (const ally of players) {
      if (ally.team === p.team && ally.alive && dist(p, ally) < 100) {
        ally.hp = Math.min(ally.maxHp, ally.hp + 30);
        spawnParticles(ally.x, ally.y, '#6f6', 6);
      }
    }
  } else if (p.cls === 'engineer') {
    if (turrets.filter(t => t.team === p.team).length < 3) {
      turrets.push({
        x: p.x - Math.cos(p.angle) * 25,
        y: p.y - Math.sin(p.angle) * 25,
        team: p.team,
        hp: 80,
        maxHp: 80,
        damage: 5,
        fireRate: 500,
        lastFire: 0,
        range: 150,
        angle: p.angle
      });
    }
  }
}

function respawnPlayer(p) {
  const base = bases[p.team];
  p.x = base.x + (Math.random() - 0.5) * 60;
  p.y = base.y + (Math.random() - 0.5) * 120;
  p.hp = p.maxHp;
  p.alive = true;
  p.respawnTimer = 0;
  p.carryingFlag = null;
  p.shieldHP = 0;
  p.abilityActive = 0;
  p.vx = 0;
  p.vy = 0;
}

function dropFlag(p) {
  if (!p.carryingFlag) return;
  const flagTeam = p.carryingFlag;
  const flag = flags[flagTeam];
  flag.x = p.x;
  flag.y = p.y;
  flag.carrier = null;
  flag.atBase = false;
  p.carryingFlag = null;
}

// AI behavior
function updateAI(p) {
  if (!p.alive || p.isHuman) return;

  const now = performance.now();
  const enemyTeam = p.team === 'blue' ? 'red' : 'blue';
  const enemyFlag = flags[enemyTeam];
  const ownFlag = flags[p.team];
  const base = bases[p.team];

  // Find nearest enemy
  let nearestEnemy = null;
  let nearestEnemyDist = Infinity;
  for (const e of players) {
    if (e.team !== p.team && e.alive) {
      const d = dist(p, e);
      if (d < nearestEnemyDist) {
        nearestEnemy = e;
        nearestEnemyDist = d;
      }
    }
  }

  // Find nearest injured ally (for medic)
  let nearestInjured = null;
  let nearestInjuredDist = Infinity;
  if (p.cls === 'medic' || p.aiRole === 'medic_support') {
    for (const a of players) {
      if (a.team === p.team && a.alive && a !== p && a.hp < a.maxHp * 0.7) {
        const d = dist(p, a);
        if (d < nearestInjuredDist) {
          nearestInjured = a;
          nearestInjuredDist = d;
        }
      }
    }
  }

  let goalX = p.x, goalY = p.y;
  let shouldShoot = false;

  if (p.carryingFlag) {
    goalX = base.x;
    goalY = base.y;
    if (nearestEnemy && nearestEnemyDist < 200 && lineOfSight(p, nearestEnemy)) {
      shouldShoot = true;
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
    }
  } else if (p.aiRole === 'defender') {
    if (!ownFlag.atBase && !ownFlag.carrier) {
      goalX = ownFlag.x;
      goalY = ownFlag.y;
    } else if (ownFlag.carrier && ownFlag.carrier.team !== p.team) {
      goalX = ownFlag.carrier.x;
      goalY = ownFlag.carrier.y;
    } else {
      const angle = (now / 3000 + (p === players[0] ? 0 : Math.PI)) % (Math.PI * 2);
      goalX = base.x + Math.cos(angle) * 60;
      goalY = base.y + Math.sin(angle) * 80;
    }
    if (nearestEnemy && nearestEnemyDist < 200 && lineOfSight(p, nearestEnemy)) {
      shouldShoot = true;
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
    }
  } else if (p.aiRole === 'medic_support') {
    if (nearestInjured && nearestInjuredDist < 300) {
      goalX = nearestInjured.x;
      goalY = nearestInjured.y;
      if (nearestInjuredDist < 100 && p.abilityCD <= 0) useAbility(p);
    } else {
      let nearestAlly = null, nad = Infinity;
      for (const a of players) {
        if (a.team === p.team && a.alive && a !== p && a.aiRole === 'attacker') {
          const d = dist(p, a);
          if (d < nad) { nearestAlly = a; nad = d; }
        }
      }
      if (nearestAlly) { goalX = nearestAlly.x + 30; goalY = nearestAlly.y + 20; }
    }
    if (nearestEnemy && nearestEnemyDist < 180 && lineOfSight(p, nearestEnemy)) {
      shouldShoot = true;
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
    }
  } else {
    // Attacker
    if (enemyFlag.atBase || (!enemyFlag.carrier && !enemyFlag.atBase)) {
      goalX = enemyFlag.x;
      goalY = enemyFlag.y;
    } else {
      if (nearestEnemy) {
        goalX = nearestEnemy.x;
        goalY = nearestEnemy.y;
      }
    }
    if (nearestEnemy && nearestEnemyDist < 220 && lineOfSight(p, nearestEnemy)) {
      shouldShoot = true;
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      if (nearestEnemyDist < 120) { goalX = p.x; goalY = p.y; }
    }
  }

  // Move toward goal with wall avoidance
  const dx = goalX - p.x, dy = goalY - p.y;
  const goalDist = Math.hypot(dx, dy);
  if (goalDist > 5) {
    let moveAngle = Math.atan2(dy, dx);
    const lookAhead = 30;
    const testX = p.x + Math.cos(moveAngle) * lookAhead;
    const testY = p.y + Math.sin(moveAngle) * lookAhead;
    let blocked = false;
    for (const w of walls) {
      if (rectCollide(testX, testY, p.radius + 5, w)) {
        blocked = true;
        const alt1 = moveAngle + Math.PI / 3;
        const alt2 = moveAngle - Math.PI / 3;
        const t1x = p.x + Math.cos(alt1) * lookAhead;
        const t1y = p.y + Math.sin(alt1) * lookAhead;
        let b1 = false;
        for (const w2 of walls) {
          if (rectCollide(t1x, t1y, p.radius + 5, w2)) { b1 = true; break; }
        }
        moveAngle = b1 ? alt2 : alt1;
        break;
      }
    }
    const spd = p.dashTimer > 0 ? p.speed * 2.5 : p.speed;
    p.vx = Math.cos(moveAngle) * spd;
    p.vy = Math.sin(moveAngle) * spd;
    if (!shouldShoot) p.angle = moveAngle;
  } else {
    p.vx = 0;
    p.vy = 0;
  }

  // AI ability usage
  if (p.abilityCD <= 0) {
    if (p.cls === 'scout' && nearestEnemy && nearestEnemyDist < 150) useAbility(p);
    else if (p.cls === 'heavy' && nearestEnemy && nearestEnemyDist < 130) useAbility(p);
    else if (p.cls === 'engineer' && p.aiRole === 'defender' && dist(p, base) < 120) useAbility(p);
  }

  if (shouldShoot) fireBullet(p);
}

function initGame(game) {
  players = [];
  bullets = [];
  turrets = [];
  particles = [];
  respawnMessages = [];
  teamCaptures = { blue: 0, red: 0 };
  teamKills = { blue: 0, red: 0 };
  score = 0;
  roundOver = false;
  bases = { blue: { x: 80, y: MAP_H / 2 }, red: { x: MAP_W - 80, y: MAP_H / 2 } };

  generateMap();

  // Blue team: human + 3 AI
  const remaining = ['scout', 'heavy', 'medic', 'engineer'].filter(c => c !== selectedClass);
  humanPlayer = createPlayer('blue', selectedClass, true);
  players.push(humanPlayer);
  for (let i = 0; i < 3; i++) {
    const p = createPlayer('blue', remaining[i], false);
    p.aiRole = i === 0 ? 'attacker' : (i === 1 ? 'medic_support' : 'defender');
    players.push(p);
  }

  // Red team: 4 AI
  const redClasses = ['scout', 'heavy', 'medic', 'engineer'];
  for (let i = 0; i < 4; i++) {
    const p = createPlayer('red', redClasses[i], false);
    p.aiRole = i < 2 ? 'attacker' : (i === 2 ? 'medic_support' : 'defender');
    players.push(p);
  }

  flags = {
    blue: { x: bases.blue.x, y: bases.blue.y, team: 'blue', carrier: null, atBase: true },
    red:  { x: bases.red.x,  y: bases.red.y,  team: 'red',  carrier: null, atBase: true }
  };

  camera = { x: humanPlayer.x - W / 2, y: humanPlayer.y - H / 2 };
  mouse = { x: W / 2, y: H / 2 };
  mouseDown = false;
}

export function createGame() {
  const game = new Game('game');

  // ── State defaults ──
  walls = [];
  turrets = [];
  bullets = [];
  particles = [];
  players = [];
  respawnMessages = [];
  flags = {};
  bases = { blue: { x: 80, y: MAP_H / 2 }, red: { x: MAP_W - 80, y: MAP_H / 2 } };
  teamCaptures = { blue: 0, red: 0 };
  teamKills = { blue: 0, red: 0 };
  camera = { x: 0, y: 0 };
  mouse = { x: W / 2, y: H / 2 };
  mouseDown = false;
  selectedClass = 'scout';
  humanPlayer = null;
  roundOver = false;
  score = 0;

  // ── Class button UI ──
  document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (game.state !== 'waiting') return;
      document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedClass = btn.dataset.cls;
    });
  });

  // ── Canvas mouse events ──
  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('contextmenu', e => e.preventDefault());

  canvasEl.addEventListener('mousemove', e => {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (W / rect.width);
    mouse.y = (e.clientY - rect.top) * (H / rect.height);
  });

  canvasEl.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    pendingMouseDown.push({ x, y, button: e.button });
  });

  canvasEl.addEventListener('mouseup', () => { mouseDown = false; });

  // ── onInit ──
  game.onInit = () => {
    roundOver = false;
    score = 0;
    players = [];
    bullets = [];
    turrets = [];
    particles = [];
    respawnMessages = [];
    teamCaptures = { blue: 0, red: 0 };
    teamKills = { blue: 0, red: 0 };
    pendingMouseDown = [];
    mouseDown = false;
    abilityPressed = false;
    eKeyPressed = false;
    game.showOverlay('CAPTURE THE FLAG', 'Choose class above, then click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── onUpdate (fixed 60Hz) ──
  game.onUpdate = () => {
    // Process pending mouse events
    while (pendingMouseDown.length > 0) {
      const ev = pendingMouseDown.shift();
      if (game.state === 'waiting') {
        initGame(game);
        game.setState('playing');
        mouseDown = true; // treat first click as held for firing
        break;
      } else if (game.state === 'over') {
        // Reset to menu
        game.onInit();
        break;
      } else if (game.state === 'playing' && ev.button === 0) {
        mouseDown = true;
      }
    }

    // Track Q key for ability (wasPressed only)
    if (game.input.wasPressed('q') || game.input.wasPressed('Q')) {
      abilityPressed = true;
    }
    if (game.input.wasPressed('e') || game.input.wasPressed('E')) {
      eKeyPressed = true;
    }

    if (game.state !== 'playing' || roundOver) {
      abilityPressed = false;
      eKeyPressed = false;
      return;
    }

    const now = performance.now();

    // ── Human player input ──
    if (humanPlayer && humanPlayer.alive) {
      const p = humanPlayer;
      let mx = 0, my = 0;
      if (game.input.isDown('w') || game.input.isDown('W') || game.input.isDown('ArrowUp')) my -= 1;
      if (game.input.isDown('s') || game.input.isDown('S') || game.input.isDown('ArrowDown')) my += 1;
      if (game.input.isDown('a') || game.input.isDown('A') || game.input.isDown('ArrowLeft')) mx -= 1;
      if (game.input.isDown('d') || game.input.isDown('D') || game.input.isDown('ArrowRight')) mx += 1;

      const moving = mx !== 0 || my !== 0;
      const len = Math.hypot(mx, my) || 1;
      const spd = p.dashTimer > 0 ? p.speed * 2.5 : p.speed;
      p.vx = moving ? (mx / len) * spd : 0;
      p.vy = moving ? (my / len) * spd : 0;

      // Aim at mouse (world coords)
      const worldMouseX = mouse.x + camera.x;
      const worldMouseY = mouse.y + camera.y;
      p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);

      if (mouseDown) fireBullet(p);

      if (abilityPressed) useAbility(p);
    }

    abilityPressed = false;

    // ── Update all players ──
    for (const p of players) {
      if (!p.alive) {
        p.respawnTimer -= 1 / 60; // fixed dt = 1/60s
        if (p.respawnTimer <= 0) respawnPlayer(p);
        continue;
      }

      if (!p.isHuman) updateAI(p);

      // Cooldowns (in ms, dt = 1000/60 ms per frame)
      const dtMs = 1000 / 60;
      if (p.abilityCD > 0) p.abilityCD -= dtMs;
      if (p.dashTimer > 0) p.dashTimer -= dtMs;
      if (p.abilityActive > 0) {
        p.abilityActive -= dtMs;
        if (p.abilityActive <= 0) p.shieldHP = 0;
      }

      // Move
      let nx = p.x + p.vx;
      let ny = p.y + p.vy;

      // Wall collision
      for (const w of walls) {
        if (rectCollide(nx, ny, p.radius, w)) {
          const cx = Math.max(w.x, Math.min(nx, w.x + w.w));
          const cy = Math.max(w.y, Math.min(ny, w.y + w.h));
          const pushDist = Math.hypot(nx - cx, ny - cy);
          if (pushDist < p.radius && pushDist > 0) {
            nx = cx + (nx - cx) / pushDist * p.radius;
            ny = cy + (ny - cy) / pushDist * p.radius;
          }
        }
      }

      nx = Math.max(p.radius, Math.min(MAP_W - p.radius, nx));
      ny = Math.max(p.radius, Math.min(MAP_H - p.radius, ny));
      p.x = nx;
      p.y = ny;

      // Flag pickup
      const enemyTeam = p.team === 'blue' ? 'red' : 'blue';
      const enemyFlag = flags[enemyTeam];
      const ownFlag = flags[p.team];

      if (!p.carryingFlag && !enemyFlag.carrier && dist(p, enemyFlag) < 25) {
        const canPickup = !p.isHuman || eKeyPressed || true; // auto-pickup like original (E or auto)
        // Original: !p.isHuman || keys['e'] — but also grabs when walking over it
        // Original code: if (!p.isHuman || keys['e'])  → human needs E, AI auto
        // Actually re-reading original: human needs keys['e'] too, AI is automatic
        if (!p.isHuman) {
          p.carryingFlag = enemyTeam;
          enemyFlag.carrier = p;
          spawnParticles(p.x, p.y, p.team === 'blue' ? '#4488ff' : '#ff4444', 15);
        } else if (eKeyPressed) {
          p.carryingFlag = enemyTeam;
          enemyFlag.carrier = p;
          spawnParticles(p.x, p.y, p.team === 'blue' ? '#4488ff' : '#ff4444', 15);
        }
      }

      // Return own dropped flag
      if (!ownFlag.atBase && !ownFlag.carrier && dist(p, ownFlag) < 25) {
        ownFlag.x = bases[p.team].x;
        ownFlag.y = bases[p.team].y;
        ownFlag.atBase = true;
        spawnParticles(ownFlag.x, ownFlag.y, p.team === 'blue' ? '#4488ff' : '#ff4444', 12);
      }

      // Score: bring enemy flag to own base
      if (p.carryingFlag && dist(p, bases[p.team]) < 40 && ownFlag.atBase) {
        teamCaptures[p.team]++;
        if (p.team === 'blue') score += 50;
        spawnParticles(bases[p.team].x, bases[p.team].y, '#fff', 30);

        const capturedTeam = p.carryingFlag;
        flags[capturedTeam].x = bases[capturedTeam].x;
        flags[capturedTeam].y = bases[capturedTeam].y;
        flags[capturedTeam].carrier = null;
        flags[capturedTeam].atBase = true;
        p.carryingFlag = null;

        // Update DOM
        blueScoreEl && (blueScoreEl.textContent = teamCaptures.blue);
        redScoreEl  && (redScoreEl.textContent  = teamCaptures.red);
        scoreEl     && (scoreEl.textContent     = score);

        if (teamCaptures[p.team] >= 3) {
          roundOver = true;
          const won = p.team === 'blue';
          game.showOverlay(
            won ? 'VICTORY!' : 'DEFEAT',
            `Blue ${teamCaptures.blue} - ${teamCaptures.red} Red | Score: ${score} | Click to play again`
          );
          game.setState('over');
          return;
        }
      }

      // Carry flag position
      if (p.carryingFlag) {
        flags[p.carryingFlag].x = p.x;
        flags[p.carryingFlag].y = p.y;
      }
    }

    eKeyPressed = false;

    // ── Update bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      let hitWall = false;
      for (const w of walls) {
        if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
          hitWall = true;
          break;
        }
      }

      let hitSomething = false;
      if (!hitWall) {
        // Player collision
        for (const p of players) {
          if (!p.alive || p.team === b.team) continue;
          if (dist(b, p) < p.radius + 3) {
            if (p.shieldHP > 0) {
              p.shieldHP -= b.damage;
              if (p.shieldHP < 0) { p.hp += p.shieldHP; p.shieldHP = 0; }
            } else {
              p.hp -= b.damage;
            }
            spawnParticles(b.x, b.y, p.team === 'blue' ? '#4488ff' : '#ff4444', 3);

            if (p.hp <= 0) {
              p.alive = false;
              p.respawnTimer = 5;
              dropFlag(p);
              if (b.owner) {
                b.owner.kills++;
                teamKills[b.owner.team]++;
                if (b.owner.team === 'blue') score += 10;
              }
              spawnParticles(p.x, p.y, p.team === 'blue' ? '#4488ff' : '#ff4444', 20);
              respawnMessages.push({
                text: `${p.label} eliminated!`,
                timer: 2,
                color: p.team === 'blue' ? '#4488ff' : '#ff4444'
              });
            }
            hitSomething = true;
            break;
          }
        }

        // Turret collision
        if (!hitSomething) {
          for (let t = turrets.length - 1; t >= 0; t--) {
            const turr = turrets[t];
            if (turr.team === b.team) continue;
            if (dist(b, turr) < 12) {
              turr.hp -= b.damage;
              spawnParticles(b.x, b.y, '#ff6', 3);
              if (turr.hp <= 0) {
                spawnParticles(turr.x, turr.y, '#ff6', 15);
                turrets.splice(t, 1);
              }
              hitSomething = true;
              break;
            }
          }
        }
      }

      if (hitWall || hitSomething || b.life <= 0 || b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) {
        bullets.splice(i, 1);
      }
    }

    // ── Update turrets ──
    for (const t of turrets) {
      let nearestEnemy = null, ned = Infinity;
      for (const p of players) {
        if (p.team !== t.team && p.alive) {
          const d = dist(t, p);
          if (d < t.range && d < ned && lineOfSight(t, p)) {
            nearestEnemy = p;
            ned = d;
          }
        }
      }
      if (nearestEnemy) {
        t.angle = Math.atan2(nearestEnemy.y - t.y, nearestEnemy.x - t.x);
        const now = performance.now();
        if (now - t.lastFire > t.fireRate) {
          t.lastFire = now;
          bullets.push({
            x: t.x + Math.cos(t.angle) * 10,
            y: t.y + Math.sin(t.angle) * 10,
            vx: Math.cos(t.angle) * 6,
            vy: Math.sin(t.angle) * 6,
            team: t.team,
            damage: t.damage,
            life: 60,
            owner: null
          });
        }
      }
    }

    // ── Update particles ──
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // ── Update respawn messages ──
    for (let i = respawnMessages.length - 1; i >= 0; i--) {
      respawnMessages[i].timer -= 1 / 60;
      if (respawnMessages[i].timer <= 0) respawnMessages.splice(i, 1);
    }

    // ── Camera follow ──
    if (humanPlayer) {
      const targetX = humanPlayer.x - W / 2;
      const targetY = humanPlayer.y - H / 2;
      camera.x += (targetX - camera.x) * 0.1;
      camera.y += (targetY - camera.y) * 0.1;
      camera.x = Math.max(0, Math.min(MAP_W - W, camera.x));
      camera.y = Math.max(0, Math.min(MAP_H - H, camera.y));
    }

    // ── Update DOM ──
    blueScoreEl && (blueScoreEl.textContent = teamCaptures.blue);
    redScoreEl  && (redScoreEl.textContent  = teamCaptures.red);
    blueKillsEl && (blueKillsEl.textContent = teamKills.blue);
    redKillsEl  && (redKillsEl.textContent  = teamKills.red);
    scoreEl     && (scoreEl.textContent     = score);
  };

  // ── onDraw ──
  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0d0d1a');

    if (game.state === 'waiting' || !humanPlayer) return;

    const cx = Math.round(camera.x);
    const cy = Math.round(camera.y);

    // Helper: world to screen
    const wx = x => x - cx;
    const wy = y => y - cy;

    // ── Map grid ──
    for (let x = 0; x <= MAP_W; x += TILE) {
      const sx = wx(x);
      if (sx < -1 || sx > W + 1) continue;
      renderer.drawLine(sx, 0, sx, H, '#1a1a2e', 0.5);
    }
    for (let y = 0; y <= MAP_H; y += TILE) {
      const sy = wy(y);
      if (sy < -1 || sy > H + 1) continue;
      renderer.drawLine(0, sy, W, sy, '#1a1a2e', 0.5);
    }

    // ── Team zones (subtle tint) ──
    // Blue half
    renderer.fillRect(wx(0), wy(0), wx(MAP_W / 2) - wx(0), wy(MAP_H) - wy(0), 'rgba(68,68,255,0.03)');
    // Red half
    renderer.fillRect(wx(MAP_W / 2), wy(0), wx(MAP_W) - wx(MAP_W / 2), wy(MAP_H) - wy(0), 'rgba(255,68,68,0.03)');

    // ── Bases ──
    // Blue base
    renderer.fillRect(wx(bases.blue.x - 50), wy(bases.blue.y - 60), 100, 120, 'rgba(68,68,255,0.15)');
    renderer.strokePoly([
      { x: wx(bases.blue.x - 50), y: wy(bases.blue.y - 60) },
      { x: wx(bases.blue.x + 50), y: wy(bases.blue.y - 60) },
      { x: wx(bases.blue.x + 50), y: wy(bases.blue.y + 60) },
      { x: wx(bases.blue.x - 50), y: wy(bases.blue.y + 60) }
    ], '#44f', 2, true);
    text.drawText('BLUE BASE', wx(bases.blue.x), wy(bases.blue.y - 78), 10, '#44f', 'center');

    // Red base
    renderer.fillRect(wx(bases.red.x - 50), wy(bases.red.y - 60), 100, 120, 'rgba(255,68,68,0.15)');
    renderer.strokePoly([
      { x: wx(bases.red.x - 50), y: wy(bases.red.y - 60) },
      { x: wx(bases.red.x + 50), y: wy(bases.red.y - 60) },
      { x: wx(bases.red.x + 50), y: wy(bases.red.y + 60) },
      { x: wx(bases.red.x - 50), y: wy(bases.red.y + 60) }
    ], '#f44', 2, true);
    text.drawText('RED BASE', wx(bases.red.x), wy(bases.red.y - 78), 10, '#f44', 'center');

    // ── Walls ──
    for (const w of walls) {
      const sx = wx(w.x), sy = wy(w.y);
      if (sx + w.w < 0 || sx > W || sy + w.h < 0 || sy > H) continue;
      renderer.fillRect(sx, sy, w.w, w.h, '#2a2a4e');
      renderer.strokePoly([
        { x: sx,       y: sy },
        { x: sx + w.w, y: sy },
        { x: sx + w.w, y: sy + w.h },
        { x: sx,       y: sy + w.h }
      ], '#3a3a6e', 1, true);
    }

    // ── Turrets ──
    for (const t of turrets) {
      const tx = wx(t.x), ty = wy(t.y);
      if (tx < -t.range || tx > W + t.range || ty < -t.range || ty > H + t.range) continue;

      const tc = t.team === 'blue' ? '#44f' : '#f44';
      const rangeColor = t.team === 'blue' ? 'rgba(68,68,255,0.08)' : 'rgba(255,68,68,0.08)';

      // Range circle — approximate with polygon
      const rangePoints = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        rangePoints.push({ x: tx + Math.cos(a) * t.range, y: ty + Math.sin(a) * t.range });
      }
      renderer.fillPoly(rangePoints, rangeColor);

      // Turret body
      renderer.fillCircle(tx, ty, 10, '#333');
      renderer.strokePoly(
        (()=>{ const pts=[]; for(let i=0;i<16;i++){const a=i/16*Math.PI*2; pts.push({x:tx+Math.cos(a)*10,y:ty+Math.sin(a)*10});} return pts; })(),
        tc, 2, true
      );

      // Barrel
      renderer.drawLine(tx, ty, tx + Math.cos(t.angle) * 14, ty + Math.sin(t.angle) * 14, tc, 3);

      // HP bar
      const hpPct = t.hp / t.maxHp;
      renderer.fillRect(tx - 10, ty - 18, 20, 3, '#333');
      const hpColor = hpPct > 0.5 ? '#6f6' : (hpPct > 0.25 ? '#ff6' : '#f44');
      renderer.fillRect(tx - 10, ty - 18, 20 * hpPct, 3, hpColor);
    }

    // ── Flags ──
    for (const team of ['blue', 'red']) {
      const f = flags[team];
      if (!f || f.carrier) continue; // carried flags drawn on player
      const fx = wx(f.x), fy = wy(f.y);
      const fc = team === 'blue' ? '#4488ff' : '#ff4444';

      // Pole
      renderer.drawLine(fx, fy + 8, fx, fy - 12, '#aaa', 2);

      // Flag cloth triangle
      renderer.setGlow(fc, 0.8);
      renderer.fillPoly([
        { x: fx,      y: fy - 12 },
        { x: fx + 12, y: fy - 8  },
        { x: fx,      y: fy - 4  }
      ], fc);
      renderer.setGlow(null);

      if (f.atBase) {
        text.drawText('FLAG', fx, fy + 12, 8, '#aaa', 'center');
      }
    }

    // ── Players ──
    for (const p of players) {
      if (!p.alive) continue;
      const px = wx(p.x), py = wy(p.y);
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

      const teamColor = p.team === 'blue' ? '#4488ff' : '#ff4444';
      const classColor = CLASSES[p.cls].color;

      // Body
      renderer.setGlow(teamColor, 0.4);
      renderer.fillCircle(px, py, p.radius, teamColor);
      renderer.setGlow(null);

      // Class inner circle
      renderer.fillCircle(px, py, 5, classColor);

      // Direction indicator (gun barrel)
      renderer.drawLine(
        px + Math.cos(p.angle) * 8,  py + Math.sin(p.angle) * 8,
        px + Math.cos(p.angle) * 16, py + Math.sin(p.angle) * 16,
        '#ddd', 2
      );

      // Shield effect
      if (p.shieldHP > 0) {
        const shieldPts = [];
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          shieldPts.push({ x: px + Math.cos(a) * (p.radius + 4), y: py + Math.sin(a) * (p.radius + 4) });
        }
        renderer.strokePoly(shieldPts, 'rgba(100,200,255,0.6)', 3, true);
      }

      // Carrying flag indicator (mini flag on player)
      if (p.carryingFlag) {
        const fc = p.carryingFlag === 'blue' ? '#4488ff' : '#ff4444';
        renderer.drawLine(px - 5, py - 14, px - 5, py - 24, '#aaa', 2);
        renderer.fillPoly([
          { x: px - 5, y: py - 24 },
          { x: px + 5, y: py - 21 },
          { x: px - 5, y: py - 18 }
        ], fc);
      }

      // HP bar
      const hpPct = p.hp / p.maxHp;
      renderer.fillRect(px - 12, py - 18, 24, 3, '#333');
      const hpColor = hpPct > 0.5 ? '#6f6' : (hpPct > 0.25 ? '#ff6' : '#f44');
      renderer.fillRect(px - 12, py - 18, 24 * hpPct, 3, hpColor);

      // Shield bar
      if (p.shieldHP > 0) {
        renderer.fillRect(px - 12, py - 22, 24 * (p.shieldHP / 80), 2, '#6cf');
      }

      // Class label
      text.drawText(p.label, px, py - 4, 7, '#fff', 'center');

      // Human indicator
      if (p.isHuman) {
        text.drawText('YOU', px, py + 16, 8, '#fff', 'center');
      }
    }

    // ── Dead player respawn timers ──
    for (const p of players) {
      if (p.alive) continue;
      const px = wx(p.x), py = wy(p.y);
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      const teamColor = p.team === 'blue' ? 'rgba(68,68,255,0.3)' : 'rgba(255,68,68,0.3)';
      renderer.fillCircle(px, py, 8, teamColor);
      text.drawText(Math.ceil(p.respawnTimer) + 's', px, py - 4, 8, '#aaa', 'center');
    }

    // ── Bullets ──
    for (const b of bullets) {
      const bx = wx(b.x), by = wy(b.y);
      if (bx < -5 || bx > W + 5 || by < -5 || by > H + 5) continue;
      const bc = b.team === 'blue' ? '#6af' : '#f66';
      renderer.setGlow(bc, 0.8);
      renderer.fillCircle(bx, by, 2.5, bc);
      renderer.setGlow(null);
    }

    // ── Particles ──
    for (const p of particles) {
      const px = wx(p.x), py = wy(p.y);
      if (px < -5 || px > W + 5 || py < -5 || py > H + 5) continue;
      const alpha = Math.max(0, p.life / 40);
      // Encode alpha into color string using rgba
      const hexColor = p.color;
      // Convert color to rgba with alpha
      let r = 255, g = 255, b = 128;
      if (hexColor === '#4488ff') { r=68; g=136; b=255; }
      else if (hexColor === '#ff4444') { r=255; g=68; b=68; }
      else if (hexColor === '#6f6')  { r=102; g=255; b=102; }
      else if (hexColor === '#ff6')  { r=255; g=255; b=102; }
      else if (hexColor === '#fff')  { r=255; g=255; b=255; }
      else if (hexColor === '#f44')  { r=255; g=68; b=68; }
      renderer.fillCircle(px, py, p.size, `rgba(${r},${g},${b},${alpha.toFixed(2)})`);
    }

    // ════════════════════════════════════════
    // HUD (screen-space, no camera offset)
    // ════════════════════════════════════════

    if (humanPlayer && humanPlayer.alive) {
      // ── Minimap ──
      const mmW = 120, mmH = 80;
      const mmX = W - mmW - 8, mmY = H - mmH - 8;
      renderer.fillRect(mmX, mmY, mmW, mmH, 'rgba(13,13,26,0.8)');
      renderer.strokePoly([
        { x: mmX,       y: mmY },
        { x: mmX + mmW, y: mmY },
        { x: mmX + mmW, y: mmY + mmH },
        { x: mmX,       y: mmY + mmH }
      ], '#44f', 1, true);

      const scaleX = mmW / MAP_W, scaleY = mmH / MAP_H;

      // Minimap walls
      for (const w of walls) {
        renderer.fillRect(
          mmX + w.x * scaleX, mmY + w.y * scaleY,
          Math.max(1, w.w * scaleX), Math.max(1, w.h * scaleY),
          '#2a2a4e'
        );
      }

      // Minimap players
      for (const p of players) {
        if (!p.alive) continue;
        const mpx = mmX + p.x * scaleX;
        const mpy = mmY + p.y * scaleY;
        renderer.fillRect(mpx - 1.5, mpy - 1.5, 3, 3, p.team === 'blue' ? '#4488ff' : '#ff4444');
        if (p.isHuman) {
          renderer.strokePoly([
            { x: mpx - 2.5, y: mpy - 2.5 },
            { x: mpx + 2.5, y: mpy - 2.5 },
            { x: mpx + 2.5, y: mpy + 2.5 },
            { x: mpx - 2.5, y: mpy + 2.5 }
          ], '#fff', 0.5, true);
        }
      }

      // Minimap flags
      for (const team of ['blue', 'red']) {
        const f = flags[team];
        if (!f) continue;
        const fc = team === 'blue' ? '#4488ff' : '#ff4444';
        const fx2 = mmX + f.x * scaleX;
        const fy2 = mmY + f.y * scaleY;
        renderer.fillPoly([
          { x: fx2,     y: fy2 - 4 },
          { x: fx2 + 3, y: fy2 },
          { x: fx2 - 3, y: fy2 }
        ], fc);
      }

      // Camera viewport rectangle on minimap
      renderer.strokePoly([
        { x: mmX + camera.x * scaleX,          y: mmY + camera.y * scaleY },
        { x: mmX + (camera.x + W) * scaleX,    y: mmY + camera.y * scaleY },
        { x: mmX + (camera.x + W) * scaleX,    y: mmY + (camera.y + H) * scaleY },
        { x: mmX + camera.x * scaleX,          y: mmY + (camera.y + H) * scaleY }
      ], 'rgba(255,255,255,0.3)', 0.5, true);

      // ── Player stats HUD (bottom-left) ──
      const hp = humanPlayer;
      renderer.fillRect(8, H - 40, 160, 32, 'rgba(13,13,26,0.7)');
      renderer.strokePoly([
        { x: 8, y: H - 40 }, { x: 168, y: H - 40 },
        { x: 168, y: H - 8 }, { x: 8, y: H - 8 }
      ], '#44f', 1, true);

      text.drawText(`HP: ${Math.ceil(hp.hp)}/${hp.maxHp}  ${CLASSES[hp.cls].label}`, 14, H - 36, 10, '#aaa', 'left');

      // HP bar
      const hpPct = hp.hp / hp.maxHp;
      renderer.fillRect(14, H - 18, 148, 6, '#333');
      const hpBarColor = hpPct > 0.5 ? '#6f6' : (hpPct > 0.25 ? '#ff6' : '#f44');
      renderer.fillRect(14, H - 18, 148 * hpPct, 6, hpBarColor);

      // ── Ability cooldown (above HP bar) ──
      renderer.fillRect(8, H - 58, 140, 14, 'rgba(13,13,26,0.7)');
      const abPct = Math.max(0, hp.abilityCD / hp.abilityCooldown);
      const abColor = abPct > 0 ? '#666' : '#6cf';
      const abName = CLASSES[hp.cls].ability.toUpperCase();
      const abText = `[Q] ${abName} ${abPct > 0 ? Math.ceil(hp.abilityCD / 1000) + 's' : 'READY'}`;
      text.drawText(abText, 14, H - 55, 9, abColor, 'left');

      // Shield indicator
      if (hp.shieldHP > 0) {
        text.drawText(`SHIELD: ${Math.ceil(hp.shieldHP)}`, 155, H - 55, 9, '#6cf', 'left');
      }
    } else if (humanPlayer && !humanPlayer.alive) {
      // ── Death screen ──
      renderer.fillRect(W / 2 - 100, H / 2 - 20, 200, 40, 'rgba(13,13,26,0.6)');
      text.drawText('ELIMINATED', W / 2, H / 2 - 16, 16, '#f44', 'center');
      text.drawText(`Respawn in ${Math.ceil(humanPlayer.respawnTimer)}s`, W / 2, H / 2 + 4, 12, '#aaa', 'center');
    }

    // ── Kill feed (top-right) ──
    let feedY = 8;
    for (const msg of respawnMessages) {
      const alpha = Math.min(1, msg.timer);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // msg.color is like '#4488ff' or '#ff4444'
      const baseColor = msg.color.slice(1); // strip '#'
      const fadeColor = '#' + baseColor + alphaHex;
      text.drawText(msg.text, W - 10, feedY, 9, fadeColor, 'right');
      feedY += 12;
    }

    // ── Capture progress indicators (top-center of canvas) ──
    for (let i = 0; i < 3; i++) {
      const filled = i < teamCaptures.blue;
      renderer.fillRect(W / 2 - 40 + i * 12, 6, 8, 8, filled ? '#4488ff' : '#333');
    }
    for (let i = 0; i < 3; i++) {
      const filled = i < teamCaptures.red;
      renderer.fillRect(W / 2 + 12 + i * 12, 6, 8, 8, filled ? '#ff4444' : '#333');
    }
    text.drawText('vs', W / 2, 6, 10, '#667', 'center');
  };

  game.start();
  return game;
}
