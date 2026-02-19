// tempest/game.js — Tempest game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;
const CX = W / 2;
const CY = H / 2;

// ── State ──
let score, best = 0;
let lives, level, playerLane, bullets, enemies, spikes, particles;
let superzapperCount, superzapperFlash;
let spawnTimer, spawnInterval, frameCount;
let tubeShape, lanes, laneCount;
let zoomPhase, zoomTimer;
let deathFlash, deathTimer;
let leftHeld, rightHeld;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

// ── Tube shape definitions ──
// Each returns an array of points on the rim

const TUBE_SHAPES = [
  // Circle (16 lanes)
  (n) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: CX + Math.cos(a) * 210, y: CY + Math.sin(a) * 210 });
    }
    return pts;
  },
  // Square (16 lanes)
  (n) => {
    const pts = [];
    const s = 200;
    const perSide = Math.floor(n / 4);
    const rem = n - perSide * 4;
    const sides = [perSide, perSide, perSide, perSide];
    for (let i = 0; i < rem; i++) sides[i]++;
    const corners = [
      { x: CX - s, y: CY - s }, { x: CX + s, y: CY - s },
      { x: CX + s, y: CY + s }, { x: CX - s, y: CY + s }
    ];
    for (let side = 0; side < 4; side++) {
      const c1 = corners[side], c2 = corners[(side + 1) % 4];
      for (let i = 0; i < sides[side]; i++) {
        const t = i / sides[side];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Pentagon (15 lanes)
  (n) => {
    const pts = [];
    const numSides = 5;
    const perSide = Math.floor(n / numSides);
    const rem = n - perSide * numSides;
    const sides = Array(numSides).fill(perSide);
    for (let i = 0; i < rem; i++) sides[i]++;
    const corners = [];
    for (let i = 0; i < numSides; i++) {
      const a = (i / numSides) * Math.PI * 2 - Math.PI / 2;
      corners.push({ x: CX + Math.cos(a) * 210, y: CY + Math.sin(a) * 210 });
    }
    for (let s = 0; s < numSides; s++) {
      const c1 = corners[s], c2 = corners[(s + 1) % numSides];
      for (let i = 0; i < sides[s]; i++) {
        const t = i / sides[s];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Star (20 lanes)
  (n) => {
    const pts = [];
    const spikesCount = 5;
    const outerR = 220, innerR = 100;
    const totalVerts = spikesCount * 2;
    const perSeg = Math.floor(n / totalVerts);
    const rem = n - perSeg * totalVerts;
    const segs = Array(totalVerts).fill(perSeg);
    for (let i = 0; i < rem; i++) segs[i]++;
    const verts = [];
    for (let i = 0; i < totalVerts; i++) {
      const a = (i / totalVerts) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      verts.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
    }
    for (let s = 0; s < totalVerts; s++) {
      const c1 = verts[s], c2 = verts[(s + 1) % totalVerts];
      for (let i = 0; i < segs[s]; i++) {
        const t = i / segs[s];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Cross / Plus (16 lanes)
  (n) => {
    const pts = [];
    const o = 200, iVal = 70;
    const crossVerts = [
      { x: CX - iVal, y: CY - o }, { x: CX + iVal, y: CY - o },
      { x: CX + iVal, y: CY - iVal }, { x: CX + o, y: CY - iVal },
      { x: CX + o, y: CY + iVal }, { x: CX + iVal, y: CY + iVal },
      { x: CX + iVal, y: CY + o }, { x: CX - iVal, y: CY + o },
      { x: CX - iVal, y: CY + iVal }, { x: CX - o, y: CY + iVal },
      { x: CX - o, y: CY - iVal }, { x: CX - iVal, y: CY - iVal }
    ];
    const numSegs = crossVerts.length;
    const perSeg = Math.floor(n / numSegs);
    const rem = n - perSeg * numSegs;
    const segsArr = Array(numSegs).fill(perSeg);
    for (let j = 0; j < rem; j++) segsArr[j]++;
    for (let s = 0; s < numSegs; s++) {
      const c1 = crossVerts[s], c2 = crossVerts[(s + 1) % numSegs];
      for (let j = 0; j < segsArr[s]; j++) {
        const t = j / segsArr[s];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Triangle (15 lanes)
  (n) => {
    const pts = [];
    const numSides = 3;
    const perSide = Math.floor(n / numSides);
    const rem = n - perSide * numSides;
    const sides = Array(numSides).fill(perSide);
    for (let i = 0; i < rem; i++) sides[i]++;
    const corners = [];
    for (let i = 0; i < numSides; i++) {
      const a = (i / numSides) * Math.PI * 2 - Math.PI / 2;
      corners.push({ x: CX + Math.cos(a) * 220, y: CY + Math.sin(a) * 220 });
    }
    for (let s = 0; s < numSides; s++) {
      const c1 = corners[s], c2 = corners[(s + 1) % numSides];
      for (let i = 0; i < sides[s]; i++) {
        const t = i / sides[s];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Hexagon (18 lanes)
  (n) => {
    const pts = [];
    const numSides = 6;
    const perSide = Math.floor(n / numSides);
    const rem = n - perSide * numSides;
    const sides = Array(numSides).fill(perSide);
    for (let i = 0; i < rem; i++) sides[i]++;
    const corners = [];
    for (let i = 0; i < numSides; i++) {
      const a = (i / numSides) * Math.PI * 2 - Math.PI / 2;
      corners.push({ x: CX + Math.cos(a) * 210, y: CY + Math.sin(a) * 210 });
    }
    for (let s = 0; s < numSides; s++) {
      const c1 = corners[s], c2 = corners[(s + 1) % numSides];
      for (let i = 0; i < sides[s]; i++) {
        const t = i / sides[s];
        pts.push({ x: c1.x + (c2.x - c1.x) * t, y: c1.y + (c2.y - c1.y) * t });
      }
    }
    return pts;
  },
  // Oval (16 lanes)
  (n) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: CX + Math.cos(a) * 220, y: CY + Math.sin(a) * 150 });
    }
    return pts;
  }
];

const LANE_COUNTS = [16, 16, 15, 20, 16, 15, 18, 16];

function buildTube(levelNum) {
  const shapeIdx = (levelNum - 1) % TUBE_SHAPES.length;
  laneCount = LANE_COUNTS[shapeIdx];
  lanes = TUBE_SHAPES[shapeIdx](laneCount);
  tubeShape = shapeIdx;
}

function lanePoint(laneIdx, t) {
  const rim = lanes[laneIdx];
  return {
    x: CX + (rim.x - CX) * t,
    y: CY + (rim.y - CY) * t
  };
}

function laneMidpoint(laneIdx, t) {
  const p1 = lanePoint(laneIdx, t);
  const p2 = lanePoint((laneIdx + 1) % laneCount, t);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function resetLevel() {
  buildTube(level);
  playerLane = 0;
  bullets = [];
  enemies = [];
  spikes = [];
  particles = [];
  superzapperCount = 1;
  superzapperFlash = 0;
  spawnTimer = 0;
  spawnInterval = Math.max(30, 90 - level * 5);
  frameCount = 0;
  zoomPhase = 0;
  zoomTimer = 0;
  deathFlash = 0;
  deathTimer = 0;
  leftHeld = false;
  rightHeld = false;
}

function getEnemyScore(type) {
  switch (type) {
    case 'flipper': return 150;
    case 'tanker': return 200;
    case 'spiker': return 50;
    case 'fuseball': return 250;
    default: return 100;
  }
}

function addExplosion(lane, depth) {
  const p = lanePoint(lane, depth);
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x: p.x, y: p.y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 20 + Math.random() * 15,
      color: ['#e4f', '#f4f', '#fff', '#a2f', '#f8f'][Math.floor(Math.random() * 5)]
    });
  }
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * laneCount);
  const r = Math.random();
  const difficultyMod = Math.min(level / 10, 1);
  let type;
  if (r < 0.4) {
    type = 'flipper';
  } else if (r < 0.6 + difficultyMod * 0.1) {
    type = 'tanker';
  } else if (r < 0.8 + difficultyMod * 0.05) {
    type = 'spiker';
  } else {
    type = 'fuseball';
  }

  const baseSpeed = 0.003 + level * 0.0005;
  let speed;
  switch (type) {
    case 'flipper': speed = baseSpeed * 1.5; break;
    case 'tanker': speed = baseSpeed * 0.7; break;
    case 'spiker': speed = baseSpeed * 0.9; break;
    case 'fuseball': speed = baseSpeed * 1.2; break;
  }

  enemies.push({
    type,
    lane,
    depth: 0.05,
    speed,
    flipDir: Math.random() < 0.5 ? 1 : -1,
    flipTimer: 0,
    alive: true,
    health: type === 'tanker' ? 2 : 1
  });
}

function fireBullet() {
  bullets.push({
    lane: playerLane,
    depth: 1.0,
    speed: 0.04
  });
}

function activateSuperzapper() {
  if (superzapperCount <= 0) return;
  superzapperCount--;
  superzapperFlash = 15;

  for (let i = enemies.length - 1; i >= 0; i--) {
    addExplosion(enemies[i].lane, enemies[i].depth);
    score += getEnemyScore(enemies[i].type);
    scoreEl.textContent = score;
  }
  enemies = [];
}

// ── Helper: RGBA string with alpha for overlays ──
function rgbaHex(hex, alpha) {
  // Convert #rgb or #rrggbb to rgba(r,g,b,a) string
  let r, g, b;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h[0], 16) * 17;
    g = parseInt(h[1], 16) * 17;
    b = parseInt(h[2], 16) * 17;
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    resetLevel();
    game.showOverlay('TEMPEST', 'Press SPACE to start  |  Left/Right: Move  |  Space: Fire  |  Shift: Superzapper');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    // ── Game over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Zooming state (level transition) ──
    if (game.state === 'zooming') {
      zoomTimer++;
      zoomPhase = zoomTimer / 60;
      if (zoomTimer >= 60) {
        level++;
        levelEl.textContent = level;
        resetLevel();
        game.setState('playing');
      }
      return;
    }

    // ── Dying state ──
    if (game.state === 'dying') {
      deathTimer++;
      deathFlash = deathTimer;
      if (deathTimer >= 45) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) {
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
          game.setState('over');
          return;
        }
        const curLevel = level;
        const curScore = score;
        resetLevel();
        level = curLevel;
        score = curScore;
        game.setState('playing');
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Player movement (with repeat throttle via frame counter)
    if (input.isDown('ArrowLeft')) {
      if (frameCount % 4 === 0 || !leftHeld) {
        playerLane = (playerLane - 1 + laneCount) % laneCount;
        leftHeld = true;
      }
    } else {
      leftHeld = false;
    }

    if (input.isDown('ArrowRight')) {
      if (frameCount % 4 === 0 || !rightHeld) {
        playerLane = (playerLane + 1) % laneCount;
        rightHeld = true;
      }
    } else {
      rightHeld = false;
    }

    // Fire bullet
    if (input.wasPressed(' ')) {
      fireBullet();
    }

    // Superzapper
    if (input.wasPressed('Shift')) {
      activateSuperzapper();
    }

    // Spawn enemies
    spawnTimer++;
    const maxEnemies = 6 + Math.floor(level / 2);
    if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
      spawnTimer = 0;
      spawnEnemy();
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.depth -= b.speed;
      if (b.depth <= 0.05) {
        // Check if bullet hits a spike
        for (let s = spikes.length - 1; s >= 0; s--) {
          if (spikes[s].lane === b.lane) {
            spikes[s].depth -= 0.1;
            if (spikes[s].depth <= 0.05) {
              spikes.splice(s, 1);
            }
            break;
          }
        }
        bullets.splice(i, 1);
        continue;
      }

      // Bullet-enemy collision
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.lane === b.lane && Math.abs(e.depth - b.depth) < 0.06) {
          e.health--;
          if (e.health <= 0) {
            addExplosion(e.lane, e.depth);
            score += getEnemyScore(e.type);
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }

            // Tanker splits into two flippers
            if (e.type === 'tanker') {
              const baseSpeed = 0.003 + level * 0.0005;
              enemies.push({
                type: 'flipper', lane: (e.lane + 1) % laneCount,
                depth: e.depth, speed: baseSpeed * 1.5,
                flipDir: 1, flipTimer: 0, alive: true, health: 1
              });
              enemies.push({
                type: 'flipper', lane: (e.lane - 1 + laneCount) % laneCount,
                depth: e.depth, speed: baseSpeed * 1.5,
                flipDir: -1, flipTimer: 0, alive: true, health: 1
              });
            }

            // Spiker leaves a spike
            if (e.type === 'spiker') {
              spikes.push({ lane: e.lane, depth: e.depth });
            }

            enemies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }
      if (hit) {
        bullets.splice(i, 1);
      }
    }

    // Update enemies
    let playerHit = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];

      e.depth += e.speed;

      // Flipper behavior: when near rim, move along it
      if (e.type === 'flipper' && e.depth > 0.85) {
        e.flipTimer++;
        if (e.flipTimer > 20) {
          e.flipTimer = 0;
          e.lane = (e.lane + e.flipDir + laneCount) % laneCount;
        }
      }

      // Fuseball behavior: move along rim once at edge
      if (e.type === 'fuseball' && e.depth > 0.9) {
        e.depth = 0.95;
        e.flipTimer++;
        if (e.flipTimer > 8) {
          e.flipTimer = 0;
          e.lane = (e.lane + e.flipDir + laneCount) % laneCount;
        }
      }

      // Spiker deposits spike segments as it climbs
      if (e.type === 'spiker' && e.depth > 0.15 && frameCount % 30 === 0) {
        let existingSpike = spikes.find(s => s.lane === e.lane);
        if (existingSpike) {
          existingSpike.depth = Math.max(existingSpike.depth, e.depth);
        } else {
          spikes.push({ lane: e.lane, depth: e.depth });
        }
      }

      // Enemy reached the rim
      if (e.depth >= 1.0) {
        if (e.lane === playerLane) {
          playerHit = true;
        }
        if (e.type === 'flipper' || e.type === 'fuseball') {
          e.depth = 0.97;
          if (e.lane === playerLane) {
            playerHit = true;
          }
        } else {
          if (e.lane === playerLane) {
            playerHit = true;
          }
          if (e.type !== 'flipper' && e.type !== 'fuseball') {
            if (e.lane !== playerLane) {
              enemies.splice(i, 1);
              continue;
            }
          }
        }
      }
    }

    if (playerHit) {
      addExplosion(playerLane, 1.0);
      game.setState('dying');
      deathTimer = 0;
      deathFlash = 0;
      return;
    }

    // Check level clear condition
    const totalEnemiesForLevel = 10 + level * 3;
    if (frameCount > totalEnemiesForLevel * spawnInterval && enemies.length === 0) {
      spikes = spikes.filter(s => s.lane !== playerLane);
      game.setState('zooming');
      zoomTimer = 0;
      zoomPhase = 0;
      return;
    }

    // Superzapper flash decay
    if (superzapperFlash > 0) superzapperFlash--;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Expose game data for ML
    window.gameData = {
      playerLane,
      laneCount,
      level,
      lives,
      enemies: enemies.map(e => ({ type: e.type, lane: e.lane, depth: e.depth })),
      bullets: bullets.map(b => ({ lane: b.lane, depth: b.depth })),
      spikes: spikes.map(s => ({ lane: s.lane, depth: s.depth })),
      superzapperReady: superzapperCount > 0
    };
  };

  game.onDraw = (renderer, text) => {
    // Superzapper flash overlay
    if (superzapperFlash > 0) {
      const a = superzapperFlash / 30;
      renderer.fillRect(0, 0, W, H, rgbaHex('#e4f', a));
    }

    // Death flash overlay
    if (game.state === 'dying' && deathFlash > 0) {
      const intensity = Math.sin(deathFlash * 0.5) * 0.3;
      if (intensity > 0) {
        renderer.fillRect(0, 0, W, H, `rgba(255,100,100,${intensity})`);
      }
    }

    // Zoom animation
    if (game.state === 'zooming') {
      drawZoom(renderer, text);
      return;
    }

    // Draw tube/web
    drawTube(renderer);

    // Draw spikes
    drawSpikes(renderer);

    // Draw enemies
    drawEnemies(renderer);

    // Draw bullets
    drawBullets(renderer);

    // Draw player
    drawPlayer(renderer);

    // Draw particles
    drawParticles(renderer);

    // Draw HUD
    drawHUD(text);
  };

  // ── Drawing functions ──

  function drawTube(renderer) {
    // Depth rings (6 rings from center to rim)
    for (let ring = 0; ring < 6; ring++) {
      const t = (ring + 1) / 6;
      const alpha = 0.15 + ring * 0.05;
      const ringColor = rgbaHex('#e4f', alpha);
      const ringPts = [];
      for (let i = 0; i < laneCount; i++) {
        ringPts.push(lanePoint(i, t));
      }
      renderer.strokePoly(ringPts, ringColor, 1, true);
    }

    // Lane dividers (from center to rim)
    for (let i = 0; i < laneCount; i++) {
      const inner = lanePoint(i, 0.15);
      const outer = lanePoint(i, 1.0);
      renderer.drawLine(inner.x, inner.y, outer.x, outer.y, rgbaHex('#e4f', 0.25), 1);
    }

    // Highlight the active lane on the rim
    const p1 = lanes[playerLane];
    const p2 = lanes[(playerLane + 1) % laneCount];
    renderer.setGlow('#e4f', 0.6);
    renderer.drawLine(p1.x, p1.y, p2.x, p2.y, '#e4f', 3);
    renderer.setGlow(null);
  }

  function drawPlayer(renderer) {
    const p1 = lanes[playerLane];
    const p2 = lanes[(playerLane + 1) % laneCount];
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    const dx = mid.x - CX;
    const dy = mid.y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    const px = -ny;
    const py = nx;

    const size = 14;
    const tip   = { x: mid.x + nx * size,       y: mid.y + ny * size };
    const left  = { x: mid.x - px * size * 0.6, y: mid.y - py * size * 0.6 };
    const right = { x: mid.x + px * size * 0.6, y: mid.y + py * size * 0.6 };
    const back  = { x: mid.x - nx * size * 0.3, y: mid.y - ny * size * 0.3 };

    // Filled claw body
    renderer.fillPoly([left, tip, right, back], rgbaHex('#e4f', 0.3));

    // Claw outline
    renderer.setGlow('#e4f', 0.8);
    renderer.drawLine(left.x, left.y, tip.x, tip.y, '#e4f', 2.5);
    renderer.drawLine(tip.x, tip.y, right.x, right.y, '#e4f', 2.5);
    renderer.drawLine(left.x, left.y, back.x, back.y, '#e4f', 2.5);
    renderer.drawLine(back.x, back.y, right.x, right.y, '#e4f', 2.5);
    renderer.setGlow(null);
  }

  function drawBullets(renderer) {
    renderer.setGlow('#fff', 0.6);
    for (const b of bullets) {
      const p = laneMidpoint(b.lane, b.depth);
      renderer.fillCircle(p.x, p.y, 3, '#fff');

      // Trail
      const p2 = laneMidpoint(b.lane, Math.min(1, b.depth + 0.04));
      renderer.drawLine(p.x, p.y, p2.x, p2.y, 'rgba(255,255,255,0.5)', 2);
    }
    renderer.setGlow(null);
  }

  function drawEnemies(renderer) {
    for (const e of enemies) {
      const p = laneMidpoint(e.lane, e.depth);
      const scale = 0.4 + e.depth * 0.6;

      switch (e.type) {
        case 'flipper':
          drawFlipper(renderer, p.x, p.y, scale, e);
          break;
        case 'tanker':
          drawTanker(renderer, p.x, p.y, scale, e);
          break;
        case 'spiker':
          drawSpiker(renderer, p.x, p.y, scale, e);
          break;
        case 'fuseball':
          drawFuseball(renderer, p.x, p.y, scale, e);
          break;
      }
    }
  }

  function drawFlipper(renderer, x, y, scale, e) {
    const s = 10 * scale;
    const wobble = Math.sin(frameCount * 0.15 + e.depth * 10) * 0.3;
    const pts = [
      { x: x, y: y - s },
      { x: x + s * (1 + wobble), y: y },
      { x: x, y: y + s },
      { x: x - s * (1 - wobble), y: y }
    ];
    renderer.setGlow('#0f0', 0.6);
    renderer.strokePoly(pts, '#0f0', 2, true);
    renderer.setGlow(null);
  }

  function drawTanker(renderer, x, y, scale, e) {
    const s = 12 * scale;
    // Hexagonal shape
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pts.push({ x: x + Math.cos(a) * s, y: y + Math.sin(a) * s });
    }
    renderer.setGlow('#ff0', 0.6);
    renderer.strokePoly(pts, '#ff0', 2, true);
    // Inner circle approximated as small hexagon
    const innerPts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      innerPts.push({ x: x + Math.cos(a) * s * 0.4, y: y + Math.sin(a) * s * 0.4 });
    }
    renderer.strokePoly(innerPts, '#ff0', 2, true);
    renderer.setGlow(null);
  }

  function drawSpiker(renderer, x, y, scale, e) {
    const s = 8 * scale;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frameCount * 0.05;
      const r = i % 2 === 0 ? s : s * 0.4;
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    renderer.setGlow('#0ff', 0.6);
    renderer.strokePoly(pts, '#0ff', 2, true);
    renderer.setGlow(null);
  }

  function drawFuseball(renderer, x, y, scale, e) {
    const s = 9 * scale;
    const pulse = 1 + Math.sin(frameCount * 0.2) * 0.2;
    const r = s * pulse;
    // Circle approximated as 12-sided polygon
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    renderer.setGlow('#f80', 0.7);
    renderer.strokePoly(pts, '#f80', 2, true);
    // Electric arcs
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + frameCount * 0.1;
      const tx = x + Math.cos(a) * s * 1.5 + (Math.random() - 0.5) * 4;
      const ty = y + Math.sin(a) * s * 1.5 + (Math.random() - 0.5) * 4;
      renderer.drawLine(x, y, tx, ty, '#f80', 2);
    }
    renderer.setGlow(null);
  }

  function drawSpikes(renderer) {
    renderer.setGlow('#0ff', 0.4);
    for (const s of spikes) {
      const inner = lanePoint(s.lane, 0.1);
      const outer = laneMidpoint(s.lane, s.depth);
      renderer.drawLine(inner.x, inner.y, outer.x, outer.y, 'rgba(0,255,255,0.6)', 2);
    }
    renderer.setGlow(null);
  }

  function drawParticles(renderer) {
    for (const p of particles) {
      const alpha = p.life / 35;
      renderer.setGlow(p.color, 0.4);
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, rgbaHex(p.color, alpha));
    }
    renderer.setGlow(null);
  }

  function drawZoom(renderer, textR) {
    const t = zoomPhase;

    // Draw speed lines radiating from center
    const alpha = Math.max(0, 0.5 - t * 0.3);
    const lineColor = rgbaHex('#e4f', alpha);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r1 = 30 + t * 200;
      const r2 = 80 + t * 400;
      renderer.drawLine(
        CX + Math.cos(a) * r1, CY + Math.sin(a) * r1,
        CX + Math.cos(a) * r2, CY + Math.sin(a) * r2,
        lineColor, 2
      );
    }

    // Draw tube structure fading and zooming out
    // Since we can't do canvas transforms, draw the tube at increasing scale by
    // scaling the lane points outward from center
    const zoomScale = 1 + t * 8;
    const tubeAlpha = Math.max(0, 1 - t * 1.5);

    if (tubeAlpha > 0.01) {
      const tubeColor = rgbaHex('#e4f', tubeAlpha * 0.3);
      const rimColor = rgbaHex('#e4f', tubeAlpha);

      // Lane dividers zoomed
      for (let i = 0; i < laneCount; i++) {
        const inner = lanePoint(i, 0.15);
        const outer = lanePoint(i, 1.0);
        const ix = CX + (inner.x - CX) * zoomScale;
        const iy = CY + (inner.y - CY) * zoomScale;
        const ox = CX + (outer.x - CX) * zoomScale;
        const oy = CY + (outer.y - CY) * zoomScale;
        renderer.drawLine(ix, iy, ox, oy, tubeColor, 1);
      }

      // Rim zoomed
      const rimPts = [];
      for (let i = 0; i < laneCount; i++) {
        const p = lanes[i];
        rimPts.push({
          x: CX + (p.x - CX) * zoomScale,
          y: CY + (p.y - CY) * zoomScale
        });
      }
      renderer.strokePoly(rimPts, rimColor, 2, true);
    }

    // Level text
    renderer.setGlow('#e4f', 0.8);
    textR.drawText(`LEVEL ${level + 1}`, CX, CY - 18, 36, '#e4f', 'center');
    renderer.setGlow(null);
  }

  function drawHUD(textR) {
    const szText = superzapperCount > 0 ? 'SUPERZAPPER READY' : 'SUPERZAPPER USED';
    const szColor = superzapperCount > 0 ? rgbaHex('#e4f', 0.8) : 'rgba(100,100,100,0.5)';
    textR.drawText(szText, CX, H - 18, 11, szColor, 'center');
  }

  game.start();
  return game;
}
