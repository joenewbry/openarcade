// spaceship-circuit/game.js — WebGL 2 port of Spaceship Circuit

import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 500;

  // ---------- CONSTANTS ----------
  const TOTAL_LAPS = 3;
  const NUM_GATES = 10;
  const TRACK_CX = 300, TRACK_CY = 250;
  const TRACK_RX = 220, TRACK_RY = 170;
  const GATE_WIDTH = 36;
  const SHIP_SIZE = 8;
  const THRUST_POWER = 0.12;
  const ROTATE_SPEED = 0.055;
  const BRAKE_FACTOR = 0.97;
  const BOOST_POWER = 0.35;
  const BOOST_MAX = 100;
  const BOOST_COST = 1.5;
  const BOOST_RECHARGE = 0.15;
  const SHIELD_MAX = 100;
  const SHIELD_COST = 0.6;
  const SHIELD_RECHARGE = 0.08;
  const MAX_SPEED = 6;
  const MAX_BOOST_SPEED = 9;
  const NUM_ASTEROIDS = 12;
  const NUM_BARRIERS = 3;
  const NUM_GRAVITY_WELLS = 2;
  const NUM_STARS = 120;

  // ---------- COLORS ----------
  const COLORS = {
    player:     '#aa44ff',
    ai1:        '#ff4466',
    ai2:        '#44ddff',
    ai3:        '#ffaa22',
    gate:       '#44ff88',
    gateNext:   '#ffff44',
    asteroid:   '#887766',
    barrier:    '#ff2244',
    gravityWell:'#4444ff',
    boost:      '#ffaa00',
    shield:     '#44ccff',
    flame:      '#ff8800',
    star:       '#ffffff',
  };

  // ---------- WORLD DATA ----------
  let stars = [];
  let gates = [];
  let asteroids = [];
  let barriers = [];
  let gravityWells = [];
  let ships = [];
  let particles = [];
  let raceTime = 0;
  let raceOver = false;
  let countdown = 0;
  let finishOrder = [];
  let score = 0;

  // DOM HUD elements
  const lapEl    = document.getElementById('lapDisplay');
  const posEl    = document.getElementById('posDisplay');
  const boostEl  = document.getElementById('boostDisplay');
  const shieldEl = document.getElementById('shieldDisplay');

  // ---------- TRACK ----------
  function getTrackPoint(t) {
    const wobble = Math.sin(t * 3) * 20 + Math.cos(t * 5) * 10;
    return {
      x: TRACK_CX + Math.cos(t) * (TRACK_RX + wobble),
      y: TRACK_CY + Math.sin(t) * (TRACK_RY + wobble * 0.6),
    };
  }

  function getTrackNormal(t) {
    const dt = 0.01;
    const p1 = getTrackPoint(t - dt);
    const p2 = getTrackPoint(t + dt);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: -dy / len, y: dx / len };
  }

  function generateTrack() {
    gates = [];
    for (let i = 0; i < NUM_GATES; i++) {
      const t = (i / NUM_GATES) * Math.PI * 2;
      const p = getTrackPoint(t);
      const n = getTrackNormal(t);
      gates.push({ x: p.x, y: p.y, nx: n.x, ny: n.y, angle: Math.atan2(n.y, n.x), t });
    }
  }

  function generateAsteroidVerts() {
    const n = 6 + Math.floor(Math.random() * 4);
    const verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.6;
      verts.push({ a, r });
    }
    return verts;
  }

  function generateHazards() {
    asteroids = [];
    for (let i = 0; i < NUM_ASTEROIDS; i++) {
      let ax, ay, tooClose;
      let attempts = 0;
      do {
        tooClose = false;
        ax = 40 + Math.random() * (W - 80);
        ay = 40 + Math.random() * (H - 80);
        for (const g of gates) {
          const dx = ax - g.x, dy = ay - g.y;
          if (Math.sqrt(dx * dx + dy * dy) < 50) { tooClose = true; break; }
        }
        if (!tooClose) {
          for (let t = 0; t < Math.PI * 2; t += 0.1) {
            const p = getTrackPoint(t);
            const dx = ax - p.x, dy = ay - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) { tooClose = true; break; }
          }
        }
        attempts++;
      } while (tooClose && attempts < 50);
      if (attempts < 50) {
        asteroids.push({
          x: ax, y: ay,
          r: 8 + Math.random() * 12,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          verts: generateAsteroidVerts(),
        });
      }
    }

    barriers = [];
    for (let i = 0; i < NUM_BARRIERS; i++) {
      const t = (0.15 + (i / NUM_BARRIERS) * 0.7) * Math.PI * 2;
      const p = getTrackPoint(t);
      const n = getTrackNormal(t);
      const offset = (Math.random() - 0.5) * 30;
      barriers.push({
        x: p.x + n.x * offset,
        y: p.y + n.y * offset,
        angle: Math.atan2(n.y, n.x),
        width: 30 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        active: true,
      });
    }

    gravityWells = [];
    for (let i = 0; i < NUM_GRAVITY_WELLS; i++) {
      const t = (0.25 + i * 0.5) * Math.PI * 2;
      const p = getTrackPoint(t);
      const n = getTrackNormal(t);
      gravityWells.push({
        x: p.x + n.x * 40 * (Math.random() > 0.5 ? 1 : -1),
        y: p.y + n.y * 40 * (Math.random() > 0.5 ? 1 : -1),
        strength: 0.015 + Math.random() * 0.01,
        radius: 50 + Math.random() * 20,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        brightness: 0.2 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---------- SHIP ----------
  function createShip(id, color, isAI) {
    const g = gates[0];
    const offset = (id - 1.5) * 15;
    const startX = g.x - g.nx * 30 + g.ny * offset;
    const startY = g.y - g.ny * 30 - g.nx * offset;
    const nextG = gates[1];
    const startAngle = Math.atan2(nextG.y - g.y, nextG.x - g.x);
    return {
      id, color, isAI,
      x: startX, y: startY,
      vx: 0, vy: 0,
      angle: startAngle,
      thrust: false,
      boosting: false,
      shielding: false,
      boost: BOOST_MAX,
      shield: SHIELD_MAX,
      lap: 0,
      nextGate: 0,
      gatesPassed: 0,
      finished: false,
      finishTime: 0,
      invulnerable: 0,
      aiThrust: false,
      aiBrake: false,
      aiTurnDir: 0,
      aiBoost: false,
      aiShield: false,
      flameFlicker: 0,
      trail: [],
      hitFlash: 0,
    };
  }

  // ---------- AI LOGIC ----------
  function updateAI(ship) {
    const target = gates[ship.nextGate];
    if (!target) return;

    const nextNext = gates[(ship.nextGate + 1) % NUM_GATES];
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const blend = Math.max(0, 1 - dist / 150);
    const aimX = dx * (1 - blend) + (nextNext.x - ship.x) * blend;
    const aimY = dy * (1 - blend) + (nextNext.y - ship.y) * blend;

    const targetAngle = Math.atan2(aimY, aimX);
    let angleDiff = targetAngle - ship.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    ship.aiTurnDir = Math.abs(angleDiff) > 0.08 ? (angleDiff > 0 ? 1 : -1) : 0;

    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    ship.aiThrust = Math.abs(angleDiff) < 1.2 && speed < MAX_SPEED * 0.85;
    ship.aiBrake  = (Math.abs(angleDiff) > 1.8 && speed > 1.5) || speed > MAX_SPEED * 0.9;
    ship.aiBoost  = Math.abs(angleDiff) < 0.3 && dist > 80 && ship.boost > 40 && speed < MAX_BOOST_SPEED * 0.7;

    ship.aiShield = false;
    if (ship.shield > 20) {
      for (const ast of asteroids) {
        const adx = ast.x - ship.x, ady = ast.y - ship.y;
        if (Math.sqrt(adx * adx + ady * ady) < ast.r + 20) { ship.aiShield = true; break; }
      }
      if (!ship.aiShield) {
        for (const b of barriers) {
          if (!b.active) continue;
          const bdx = b.x - ship.x, bdy = b.y - ship.y;
          if (Math.sqrt(bdx * bdx + bdy * bdy) < b.width + 15) { ship.aiShield = true; break; }
        }
      }
      if (!ship.aiShield) {
        for (const gw of gravityWells) {
          const gdx = gw.x - ship.x, gdy = gw.y - ship.y;
          if (Math.sqrt(gdx * gdx + gdy * gdy) < gw.radius * 0.7) { ship.aiShield = true; break; }
        }
      }
    }

    // Asteroid avoidance
    for (const ast of asteroids) {
      const adx = ast.x - ship.x, ady = ast.y - ship.y;
      const adist = Math.sqrt(adx * adx + ady * ady);
      if (adist < ast.r + 35) {
        const avoidAngle = Math.atan2(-ady, -adx);
        let avoidDiff = avoidAngle - ship.angle;
        while (avoidDiff > Math.PI) avoidDiff -= Math.PI * 2;
        while (avoidDiff < -Math.PI) avoidDiff += Math.PI * 2;
        if (Math.abs(avoidDiff) < 1.0) {
          ship.aiTurnDir = avoidDiff > 0 ? 1 : -1;
          ship.aiThrust = true;
        }
      }
    }
  }

  // ---------- PHYSICS ----------
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 15,
        maxLife: 30,
        color,
        size: 1 + Math.random() * 2,
      });
    }
  }

  function updateShip(ship) {
    if (ship.finished) return;

    let rotating = 0, thrusting = false, braking = false, boosting = false, shielding = false;

    if (ship.isAI) {
      updateAI(ship);
      rotating  = ship.aiTurnDir;
      thrusting = ship.aiThrust;
      braking   = ship.aiBrake;
      boosting  = ship.aiBoost;
      shielding = ship.aiShield;
    } else {
      const inp = game.input;
      if (inp.isDown('ArrowLeft'))  rotating  = -1;
      if (inp.isDown('ArrowRight')) rotating  =  1;
      if (inp.isDown('ArrowUp'))    thrusting = true;
      if (inp.isDown('ArrowDown'))  braking   = true;
      if (inp.isDown(' '))          boosting  = true;
      if (inp.isDown('z') || inp.isDown('Z')) shielding = true;
    }

    ship.angle += rotating * ROTATE_SPEED;
    ship.thrust = thrusting || boosting;

    if (thrusting) {
      ship.vx += Math.cos(ship.angle) * THRUST_POWER;
      ship.vy += Math.sin(ship.angle) * THRUST_POWER;
    }

    ship.boosting = false;
    if (boosting && ship.boost > 0) {
      ship.vx += Math.cos(ship.angle) * BOOST_POWER;
      ship.vy += Math.sin(ship.angle) * BOOST_POWER;
      ship.boost = Math.max(0, ship.boost - BOOST_COST);
      ship.boosting = true;
    }
    if (!boosting) ship.boost = Math.min(BOOST_MAX, ship.boost + BOOST_RECHARGE);

    ship.shielding = false;
    if (shielding && ship.shield > 0) {
      ship.shield = Math.max(0, ship.shield - SHIELD_COST);
      ship.shielding = true;
    }
    if (!shielding) ship.shield = Math.min(SHIELD_MAX, ship.shield + SHIELD_RECHARGE);

    if (braking) { ship.vx *= BRAKE_FACTOR; ship.vy *= BRAKE_FACTOR; }

    // Gravity wells
    for (const gw of gravityWells) {
      const gdx = gw.x - ship.x, gdy = gw.y - ship.y;
      const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
      if (gdist < gw.radius * 2) {
        const force = gw.strength * (1 - gdist / (gw.radius * 2));
        ship.vx += (gdx / gdist) * force;
        ship.vy += (gdy / gdist) * force;
      }
    }

    // Speed limit
    const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    const maxSpd = ship.boosting ? MAX_BOOST_SPEED : MAX_SPEED;
    if (spd > maxSpd) { ship.vx = (ship.vx / spd) * maxSpd; ship.vy = (ship.vy / spd) * maxSpd; }

    ship.x += ship.vx;
    ship.y += ship.vy;

    // Wrap
    if (ship.x < -20)    ship.x += W + 40;
    if (ship.x > W + 20) ship.x -= W + 40;
    if (ship.y < -20)    ship.y += H + 40;
    if (ship.y > H + 20) ship.y -= H + 40;

    if (ship.invulnerable > 0) ship.invulnerable--;
    if (ship.hitFlash > 0) ship.hitFlash--;

    if (ship.thrust || ship.boosting) {
      ship.trail.push({ x: ship.x, y: ship.y, life: 20, boost: ship.boosting });
    }
    ship.trail = ship.trail.filter(t => { t.life--; return t.life > 0; });

    // Asteroid collisions
    for (const ast of asteroids) {
      const adx = ast.x - ship.x, ady = ast.y - ship.y;
      const adist = Math.sqrt(adx * adx + ady * ady);
      if (adist < ast.r + SHIP_SIZE) {
        if (ship.shielding) {
          const nx = adx / adist, ny = ady / adist;
          const dot = ship.vx * nx + ship.vy * ny;
          ship.vx -= 2 * dot * nx;
          ship.vy -= 2 * dot * ny;
          ship.x = ast.x - nx * (ast.r + SHIP_SIZE + 2);
          ship.y = ast.y - ny * (ast.r + SHIP_SIZE + 2);
          spawnParticles(ship.x, ship.y, COLORS.shield, 5);
        } else if (ship.invulnerable <= 0) {
          ship.vx *= 0.3; ship.vy *= 0.3;
          ship.invulnerable = 30; ship.hitFlash = 15;
          spawnParticles(ship.x, ship.y, ship.color, 10);
        }
      }
    }

    // Barrier collisions
    for (const b of barriers) {
      if (!b.active) continue;
      const bdx = b.x - ship.x, bdy = b.y - ship.y;
      const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bdist < b.width * 0.5 + SHIP_SIZE) {
        if (ship.shielding) {
          const nx = bdx / bdist, ny = bdy / bdist;
          ship.vx -= nx * 0.5; ship.vy -= ny * 0.5;
          spawnParticles(ship.x, ship.y, COLORS.shield, 3);
        } else if (ship.invulnerable <= 0) {
          ship.vx *= 0.4; ship.vy *= 0.4;
          ship.invulnerable = 30; ship.hitFlash = 15;
          spawnParticles(ship.x, ship.y, COLORS.barrier, 8);
        }
      }
    }

    // Gate checking
    const gate = gates[ship.nextGate];
    const gx = gate.x - ship.x, gy = gate.y - ship.y;
    if (Math.sqrt(gx * gx + gy * gy) < GATE_WIDTH) {
      ship.gatesPassed++;
      ship.nextGate = (ship.nextGate + 1) % NUM_GATES;
      if (ship.nextGate === 0) {
        ship.lap++;
        if (ship.lap >= TOTAL_LAPS) {
          ship.finished = true;
          ship.finishTime = raceTime;
          finishOrder.push(ship);
        }
      }
      spawnParticles(gate.x, gate.y, COLORS.gateNext, 8);
    }

    ship.flameFlicker = (ship.flameFlicker + 0.3) % (Math.PI * 2);
  }

  function updateParticles() {
    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      return p.life > 0;
    });
  }

  // ---------- RANKING ----------
  function getRanking() {
    return [...ships].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      const aTotal = a.lap * NUM_GATES + a.gatesPassed;
      const bTotal = b.lap * NUM_GATES + b.gatesPassed;
      if (aTotal !== bTotal) return bTotal - aTotal;
      const aGate = gates[a.nextGate], bGate = gates[b.nextGate];
      const aDist = Math.sqrt((aGate.x - a.x) ** 2 + (aGate.y - a.y) ** 2);
      const bDist = Math.sqrt((bGate.x - b.x) ** 2 + (bGate.y - b.y) ** 2);
      return aDist - bDist;
    });
  }

  function getPositionStr(pos) {
    if (pos === 1) return '1st';
    if (pos === 2) return '2nd';
    if (pos === 3) return '3rd';
    return pos + 'th';
  }

  // ---------- INIT ----------
  function initGame() {
    generateStars();
    generateTrack();
    generateHazards();
    ships = [];
    ships.push(createShip(0, COLORS.player, false));
    ships.push(createShip(1, COLORS.ai1, true));
    ships.push(createShip(2, COLORS.ai2, true));
    ships.push(createShip(3, COLORS.ai3, true));
    particles = [];
    raceTime = 0;
    raceOver = false;
    finishOrder = [];
    countdown = 180;
    score = 0;
  }

  // ---------- DRAW HELPERS ----------

  // Rotate point around origin
  function rotPt(x, y, cos, sin) {
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function drawStars(renderer) {
    for (const s of stars) {
      s.twinkle += 0.02;
      const b = s.brightness * (0.5 + 0.5 * Math.sin(s.twinkle));
      const alpha = Math.round(b * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(s.x, s.y, s.size, `#ffffff${alpha}`);
    }
  }

  function drawTrack(renderer) {
    // Faint wide band — sample the wobbly ellipse and draw segments
    const pts = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.05) {
      pts.push(getTrackPoint(t));
    }
    pts.push(pts[0]); // close

    // Wide band (semi-transparent purple) — drawn as thick lines
    for (let i = 0; i < pts.length - 1; i++) {
      renderer.drawLine(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, '#aa44ff14', 40);
    }
    // Dashed centerline
    for (let i = 0; i < pts.length - 1; i++) {
      renderer.dashedLine(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, '#aa44ff26', 1, 4, 8);
    }
  }

  function drawGates(renderer, text, playerShip) {
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      const isNext = (i === playerShip.nextGate);
      const baseColor = isNext ? COLORS.gateNext : COLORS.gate;
      const alpha = isNext ? 0xe6 : 0x59; // 0.9 → e6, 0.35 → 59
      const alphaHex = alpha.toString(16).padStart(2, '0');
      const col = baseColor + alphaHex;

      const cos = Math.cos(g.angle), sin = Math.sin(g.angle);
      // Gate line: perpendicular to track direction
      // Gate angle is along the normal, so post goes from -halfW to +halfW perpendicular
      const halfW = GATE_WIDTH / 2;
      const p1 = { x: g.x + cos * 0 - sin * (-halfW), y: g.y + sin * 0 + cos * (-halfW) };
      const p2 = { x: g.x + cos * 0 - sin *  halfW,  y: g.y + sin * 0 + cos *  halfW  };

      if (isNext) renderer.setGlow(baseColor, 0.5);
      renderer.drawLine(p1.x, p1.y, p2.x, p2.y, col, isNext ? 3 : 2);

      const dotR = isNext ? 4 : 2.5;
      renderer.fillCircle(p1.x, p1.y, dotR, col);
      renderer.fillCircle(p2.x, p2.y, dotR, col);

      if (isNext) {
        renderer.setGlow(null);
        text.drawText((i + 1).toString(), g.x, g.y - 6, 8, '#ffffffb3', 'center');
      }
      renderer.setGlow(null);
    }
  }

  function drawAsteroids(renderer) {
    for (const ast of asteroids) {
      ast.rot += ast.rotSpeed;
      const cos = Math.cos(ast.rot), sin = Math.sin(ast.rot);
      const pts = ast.verts.map(v => {
        const lx = Math.cos(v.a) * v.r * ast.r;
        const ly = Math.sin(v.a) * v.r * ast.r;
        return { x: ast.x + lx * cos - ly * sin, y: ast.y + lx * sin + ly * cos };
      });
      renderer.fillPoly(pts, COLORS.asteroid);
      renderer.strokePoly(pts, '#665544', 1, true);
    }
  }

  function drawBarriers(renderer) {
    for (const b of barriers) {
      const pulse = Math.sin(raceTime * 0.03 + b.phase);
      b.active = pulse > -0.3;
      if (!b.active) continue;

      const alpha = 0.4 + 0.4 * Math.max(0, pulse);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      const col = COLORS.barrier + alphaHex;

      const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
      const halfW = b.width / 2;
      const p1 = { x: b.x - cos * halfW, y: b.y - sin * halfW };
      const p2 = { x: b.x + cos * halfW, y: b.y + sin * halfW };

      renderer.setGlow(COLORS.barrier, 0.4);
      renderer.drawLine(p1.x, p1.y, p2.x, p2.y, col, 3);

      // Energy crackle
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * b.width;
        const oy = (Math.random() - 0.5) * 6;
        const cx0 = b.x + cos * ox - sin * 0;
        const cy0 = b.y + sin * ox + cos * 0;
        const cx1 = b.x + cos * (ox + (Math.random() - 0.5) * 8) - sin * oy;
        const cy1 = b.y + sin * (ox + (Math.random() - 0.5) * 8) + cos * oy;
        renderer.drawLine(cx0, cy0, cx1, cy1, col, 1);
      }
      renderer.setGlow(null);
    }
  }

  function drawGravityWells(renderer) {
    for (const gw of gravityWells) {
      gw.pulse += 0.02;
      const pulseR = gw.radius * (0.9 + 0.1 * Math.sin(gw.pulse));

      // Concentric rings
      const ringPts = 32;
      for (let ring = 0; ring < 4; ring++) {
        const ringR = pulseR * (0.3 + ring * 0.2);
        const alpha = Math.max(0, 0.15 - ring * 0.03);
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        const col = COLORS.gravityWell + alphaHex;
        const pts = [];
        for (let j = 0; j <= ringPts; j++) {
          const a = (j / ringPts) * Math.PI * 2;
          pts.push({ x: gw.x + Math.cos(a) * ringR, y: gw.y + Math.sin(a) * ringR });
        }
        renderer.strokePoly(pts, col, 1, true);
      }

      // Center glow
      renderer.setGlow(COLORS.gravityWell, 0.8);
      renderer.fillCircle(gw.x, gw.y, 15, '#4444ff4d');
      renderer.setGlow(null);
    }
  }

  function drawShip(renderer, text, ship) {
    // Trails
    for (const t of ship.trail) {
      const alpha = Math.round((t.life / 20) * 0.4 * 255).toString(16).padStart(2, '0');
      const col = (t.boost ? COLORS.boost : COLORS.flame) + alpha;
      renderer.fillCircle(t.x, t.y, t.boost ? 2.5 : 1.5, col);
    }

    const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);

    // Engine flame
    if (ship.thrust || ship.boosting) {
      const flameLen = ship.boosting
        ? 14 + Math.sin(ship.flameFlicker) * 6
        :  8 + Math.sin(ship.flameFlicker) * 3;
      const flameColor = ship.boosting ? COLORS.boost : COLORS.flame;

      // Outer flame triangle (local coords: nose=-SHIP_SIZE dir, rear further back)
      const fl = [
        { lx: -SHIP_SIZE,           ly: -3 },
        { lx: -SHIP_SIZE - flameLen, ly:  0 },
        { lx: -SHIP_SIZE,           ly:  3 },
      ].map(p => ({ x: ship.x + p.lx * cos - p.ly * sin, y: ship.y + p.lx * sin + p.ly * cos }));
      renderer.fillPoly(fl, flameColor + 'cc');

      // Inner flame
      const il = [
        { lx: -SHIP_SIZE,                ly: -1.5 },
        { lx: -SHIP_SIZE - flameLen * 0.5, ly:  0   },
        { lx: -SHIP_SIZE,                ly:  1.5 },
      ].map(p => ({ x: ship.x + p.lx * cos - p.ly * sin, y: ship.y + p.lx * sin + p.ly * cos }));
      renderer.fillPoly(il, '#ffffff80');
    }

    // Ship body
    const flashAlpha = ship.hitFlash > 0 ? ((ship.hitFlash % 4 < 2) ? 0.3 : 1.0) : 1.0;
    const shipAlpha = ship.finished ? (0.3 + 0.2 * Math.sin(raceTime * 0.05)) : 1.0;
    const bodyAlpha = Math.round(flashAlpha * shipAlpha * 255).toString(16).padStart(2, '0');

    const body = [
      { lx:  SHIP_SIZE + 2, ly:  0          },
      { lx: -SHIP_SIZE,     ly: -SHIP_SIZE + 1 },
      { lx: -SHIP_SIZE + 3, ly:  0          },
      { lx: -SHIP_SIZE,     ly:  SHIP_SIZE - 1 },
    ].map(p => ({ x: ship.x + p.lx * cos - p.ly * sin, y: ship.y + p.lx * sin + p.ly * cos }));

    renderer.fillPoly(body, ship.color + bodyAlpha);
    renderer.strokePoly(body, '#ffffff' + bodyAlpha, 1, true);

    // Shield bubble
    if (ship.shielding) {
      const shieldAlpha = Math.round((0.4 + 0.2 * Math.sin(raceTime * 0.1)) * 255).toString(16).padStart(2, '0');
      renderer.setGlow(COLORS.shield, 0.4);
      // Draw circle as a 32-point polygon ring
      const shR = SHIP_SIZE + 5;
      const shPts = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        shPts.push({ x: ship.x + Math.cos(a) * shR, y: ship.y + Math.sin(a) * shR });
      }
      renderer.strokePoly(shPts, COLORS.shield + shieldAlpha, 2, true);
      renderer.setGlow(null);
    }

    // AI label
    if (ship.isAI) {
      text.drawText('AI-' + ship.id, ship.x, ship.y - 14, 7, ship.color + '80', 'center');
    }
  }

  function drawParticles(renderer) {
    for (const p of particles) {
      const alpha = Math.round((p.life / p.maxLife) * 255).toString(16).padStart(2, '0');
      const r = p.size * (p.life / p.maxLife);
      renderer.fillCircle(p.x, p.y, r, p.color + alpha);
    }
  }

  function drawHUD(renderer, text, playerShip) {
    // Minimap
    const mmX = W - 90, mmY = 10, mmW = 80, mmH = 65;
    renderer.fillRect(mmX, mmY, mmW, mmH, '#00000066');
    renderer.strokePoly([
      { x: mmX,       y: mmY       },
      { x: mmX + mmW, y: mmY       },
      { x: mmX + mmW, y: mmY + mmH },
      { x: mmX,       y: mmY + mmH },
    ], '#aa44ff4d', 1, true);

    // Track on minimap
    const mPts = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.1) {
      const p = getTrackPoint(t);
      mPts.push({ x: mmX + (p.x / W) * mmW, y: mmY + (p.y / H) * mmH });
    }
    renderer.strokePoly(mPts, '#aa44ff33', 1, true);

    // Ships on minimap
    for (const s of ships) {
      const mx = mmX + (s.x / W) * mmW;
      const my = mmY + (s.y / H) * mmH;
      renderer.fillCircle(mx, my, s === playerShip ? 3 : 2, s.color);
    }

    // Timer
    const mins = Math.floor(raceTime / 3600);
    const secs = Math.floor((raceTime / 60) % 60);
    const ms   = Math.floor((raceTime % 60) / 60 * 100);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    text.drawText(timeStr, 10, 8, 12, '#aaaaaa', 'left');

    // Boost bar
    const barX = 10, barY = H - 25, barW = 80, barH = 8;
    renderer.fillRect(barX, barY, barW, barH, '#00000066');
    renderer.fillRect(barX, barY, barW * (playerShip.boost / BOOST_MAX), barH, COLORS.boost + 'b3');
    text.drawText('BOOST', barX, barY - 11, 8, '#aaaaaa', 'left');

    // Shield bar
    const sBarY = barY - 18;
    renderer.fillRect(barX, sBarY, barW, barH, '#00000066');
    renderer.fillRect(barX, sBarY, barW * (playerShip.shield / SHIELD_MAX), barH, COLORS.shield + 'b3');
    text.drawText('SHIELD', barX, sBarY - 11, 8, '#aaaaaa', 'left');
  }

  function drawCountdown(renderer, text) {
    if (countdown <= 0) return;
    const num = Math.ceil(countdown / 60);
    const label = num > 0 ? num.toString() : 'GO!';
    // Scale effect: larger when the count just changed
    const scaleBoost = (countdown % 60) / 60;
    const baseSize = 60;
    const size = Math.round(baseSize * (1 + scaleBoost * 0.3));
    renderer.setGlow(COLORS.player, 0.8);
    text.drawText(label, W / 2, H / 2 - size / 2, size, COLORS.player, 'center');
    renderer.setGlow(null);
  }

  function drawFinishScreen(renderer, text) {
    renderer.fillRect(0, 0, W, H, '#1a1a2eb3');

    renderer.setGlow(COLORS.player, 0.6);
    text.drawText('RACE COMPLETE', W / 2, 140, 30, COLORS.player, 'center');
    renderer.setGlow(null);

    for (let i = 0; i < finishOrder.length; i++) {
      const s = finishOrder[i];
      const label = s.isAI ? `AI-${s.id}` : 'YOU';
      const mins = Math.floor(s.finishTime / 3600);
      const secs = Math.floor((s.finishTime / 60) % 60);
      const ms   = Math.floor((s.finishTime % 60) / 60 * 100);
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
      text.drawText(`${i + 1}. ${label}  ${timeStr}`, W / 2, 192 + i * 30, 16, s.color, 'center');
    }

    text.drawText('Press Enter to race again', W / 2, 350, 14, '#aaaaaa', 'center');
  }

  // ---------- CANVAS MOUSE CLICK (start on click) ----------
  game.canvas.addEventListener('click', () => {
    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
    }
  });

  // ---------- GAME LIFECYCLE ----------
  game.onInit = () => {
    game.showOverlay('SPACESHIP CIRCUIT', 'Zero-gravity racing through the void');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state === 'waiting') {
      if (game.input.wasPressed('Enter')) {
        initGame();
        game.setState('playing');
      }
      return;
    }

    // Enter key to restart from gameover
    if (game.state === 'over' && game.input.wasPressed('Enter')) {
      initGame();
      game.setState('playing');
      return;
    }

    if (game.state !== 'playing') return;

    // Countdown
    if (countdown > 0) {
      countdown--;
      return;
    }

    raceTime++;

    for (const ship of ships) updateShip(ship);
    updateParticles();

    // Check race end
    const player = ships[0];
    if (!raceOver) {
      if (player.finished || raceTime > 60 * 60 * 5) {
        raceOver = true;
        for (const s of ships) {
          if (!s.finished) {
            s.finished = true;
            s.finishTime = raceTime;
            finishOrder.push(s);
          }
        }
        const playerIdx = finishOrder.indexOf(player);
        const positionScore = (4 - playerIdx) * 250;
        const timeBonus = Math.max(0, Math.floor((18000 - player.finishTime) / 60));
        score = positionScore + timeBonus;
        game.setState('over');
      }
    }

    // Update DOM HUD
    const ranking = getRanking();
    const playerPos = ranking.indexOf(player) + 1;
    if (lapEl)    lapEl.textContent    = `${Math.min(player.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`;
    if (posEl)    posEl.textContent    = getPositionStr(playerPos);
    if (boostEl)  boostEl.textContent  = Math.round(player.boost) + '%';
    if (shieldEl) shieldEl.textContent = Math.round(player.shield) + '%';
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a18');

    if (ships.length === 0) return; // pre-init

    drawStars(renderer);
    drawTrack(renderer);
    drawGravityWells(renderer);
    drawBarriers(renderer);
    drawGates(renderer, text, ships[0]);
    drawAsteroids(renderer);

    for (const ship of ships) drawShip(renderer, text, ship);

    drawParticles(renderer);
    drawHUD(renderer, text, ships[0]);

    if (countdown > 0) drawCountdown(renderer, text);

    if (game.state === 'over') drawFinishScreen(renderer, text);
  };

  game.start();
  return game;
}
