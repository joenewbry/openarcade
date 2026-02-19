// robotron/game.js — Robotron 2084 game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500, H = 500;

// Constants
const PLAYER_SIZE = 12;
const PLAYER_SPEED = 3;
const BULLET_SPEED = 7;
const BULLET_LIFE = 80;
const FIRE_RATE = 6;
const HUMAN_SIZE = 10;
const GRUNT_SIZE = 10;
const GRUNT_SPEED_BASE = 0.8;
const HULK_SIZE = 16;
const HULK_SPEED = 0.6;
const BRAIN_SIZE = 11;
const BRAIN_SPEED = 0.7;
const SPHEROID_SIZE = 14;
const SPHEROID_SPEED = 0.5;
const ENFORCER_SIZE = 9;
const ENFORCER_SPEED = 1.8;
const ELECTRODE_SIZE = 8;

// Human types
const HUMAN_TYPES = [
  { name: 'Mom', color: '#ff6b9d' },
  { name: 'Dad', color: '#4ecdc4' },
  { name: 'Kid', color: '#ffe66d' }
];

// ── State ──
let score, best = 0;
let player, bullets, enemies, humans, particles, electrodes;
let lives, wave, tick, spawnTimers;
let fireDir, fireCooldown;
let waveTransitionTimer;
let humansRescuedThisWave;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');

// ── Helpers ──
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function getRandomEdgePosition(margin) {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  switch (side) {
    case 0: x = margin + Math.random() * (W - margin * 2); y = margin; break;
    case 1: x = margin + Math.random() * (W - margin * 2); y = H - margin; break;
    case 2: x = margin; y = margin + Math.random() * (H - margin * 2); break;
    case 3: x = W - margin; y = margin + Math.random() * (H - margin * 2); break;
  }
  return { x, y };
}

function spawnEnemy(type) {
  let x, y;
  let attempts = 0;
  do {
    const pos = getRandomEdgePosition(10);
    x = pos.x;
    y = pos.y;
    attempts++;
  } while (dist(x, y, player.x, player.y) < 100 && attempts < 20);

  const enemy = { x, y, type, alive: true };

  switch (type) {
    case 'grunt':
      enemy.speed = GRUNT_SPEED_BASE + Math.random() * 0.3 + wave * 0.05;
      break;
    case 'hulk':
      enemy.speed = HULK_SPEED;
      enemy.pushCooldown = 0;
      break;
    case 'brain':
      enemy.speed = BRAIN_SPEED + wave * 0.02;
      enemy.targetHuman = null;
      enemy.convertTimer = 0;
      break;
    case 'spheroid':
      enemy.speed = SPHEROID_SPEED;
      enemy.angle = Math.random() * Math.PI * 2;
      enemy.spawnTimer = 180 + Math.floor(Math.random() * 180);
      enemy.enforcersSpawned = 0;
      enemy.maxEnforcers = 2 + Math.floor(wave / 3);
      break;
    case 'enforcer':
      enemy.speed = ENFORCER_SPEED;
      enemy.shootTimer = 60 + Math.floor(Math.random() * 60);
      enemy.angle = Math.random() * Math.PI * 2;
      break;
    case 'prog':
      enemy.speed = 1.5 + wave * 0.05;
      break;
  }

  enemies.push(enemy);
}

function moveToward(entity, tx, ty, speed) {
  const dir = normalize(tx - entity.x, ty - entity.y);
  entity.x += dir.x * speed;
  entity.y += dir.y * speed;
  entity.x = Math.max(5, Math.min(W - 5, entity.x));
  entity.y = Math.max(5, Math.min(H - 5, entity.y));
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 15,
      color
    });
  }
}

function startWave(game) {
  wave++;
  waveEl.textContent = wave;
  bullets = [];
  enemies = [];
  humans = [];
  particles = [];
  electrodes = [];
  humansRescuedThisWave = 0;
  spawnTimers = { spheroidSpawn: 0 };

  player.x = W / 2;
  player.y = H / 2;

  const diff = Math.min(wave, 20);

  // Spawn grunts
  const gruntCount = 5 + diff * 3;
  for (let i = 0; i < gruntCount; i++) spawnEnemy('grunt');

  // Spawn hulks (from wave 2)
  if (wave >= 2) {
    const hulkCount = Math.min(1 + Math.floor(diff / 2), 8);
    for (let i = 0; i < hulkCount; i++) spawnEnemy('hulk');
  }

  // Spawn brains (from wave 3)
  if (wave >= 3) {
    const brainCount = Math.min(Math.floor(diff / 3), 5);
    for (let i = 0; i < brainCount; i++) spawnEnemy('brain');
  }

  // Spawn spheroids (from wave 4)
  if (wave >= 4) {
    const spheroidCount = Math.min(Math.floor(diff / 4), 4);
    for (let i = 0; i < spheroidCount; i++) spawnEnemy('spheroid');
  }

  // Spawn electrodes (from wave 5)
  if (wave >= 5) {
    const electrodeCount = Math.min(2 + Math.floor(diff / 3), 12);
    for (let i = 0; i < electrodeCount; i++) {
      electrodes.push({
        x: 30 + Math.random() * (W - 60),
        y: 30 + Math.random() * (H - 60),
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  // Spawn humans
  const humanCount = 3 + Math.min(Math.floor(diff / 2), 7);
  for (let i = 0; i < humanCount; i++) {
    const type = HUMAN_TYPES[Math.floor(Math.random() * HUMAN_TYPES.length)];
    humans.push({
      x: 30 + Math.random() * (W - 60),
      y: 30 + Math.random() * (H - 60),
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      type: type,
      alive: true,
      changeTimer: Math.floor(Math.random() * 120)
    });
  }

  // Show wave intro
  waveTransitionTimer = 90;
  game.setState('waveIntro');
  const waveMsg = wave >= 5 ? 'Watch for Electrodes!' :
                  wave >= 4 ? 'Spheroids incoming!' :
                  wave >= 3 ? 'Brains hunt humans!' :
                  wave >= 2 ? 'Hulks are indestructible!' :
                  'Save the humans!';
  game.showOverlay(`WAVE ${wave}`, waveMsg);
}

function playerDeath(game) {
  lives--;
  livesEl.textContent = lives;
  spawnParticles(player.x, player.y, '#f8f', 20);

  if (lives <= 0) {
    game.showOverlay('GAME OVER', `Score: ${score} | Wave: ${wave} -- Press any key to restart`);
    game.setState('over');
    return;
  }

  // Respawn player at center, push nearby enemies away
  player.x = W / 2;
  player.y = H / 2;
  for (const e of enemies) {
    if (e.alive && dist(e.x, e.y, player.x, player.y) < 80) {
      const push = normalize(e.x - player.x, e.y - player.y);
      e.x = player.x + push.x * 100;
      e.y = player.y + push.y * 100;
      e.x = Math.max(5, Math.min(W - 5, e.x));
      e.y = Math.max(5, Math.min(H - 5, e.y));
    }
  }
  // Remove enforcer bullets
  enemies = enemies.filter(e => e.type !== 'enforcerBullet' || !e.alive);
  bullets = [];
}

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    wave = 0;
    tick = 0;
    fireCooldown = 0;
    fireDir = { x: 0, y: 0 };
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    waveEl.textContent = '1';
    player = { x: W / 2, y: H / 2 };
    bullets = [];
    enemies = [];
    humans = [];
    particles = [];
    electrodes = [];
    game.showOverlay('ROBOTRON 2084', 'WASD to move / Arrows to fire -- Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    tick++;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      // Any key starts
      const anyKey = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
                      ' ','w','a','s','d','W','A','S','D'].some(k => input.wasPressed(k));
      if (anyKey) {
        game.hideOverlay();
        startWave(game);
      }
      return;
    }

    // ── Game over ──
    if (game.state === 'over') {
      const anyKey = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
                      ' ','w','a','s','d','W','A','S','D'].some(k => input.wasPressed(k));
      if (anyKey) {
        game.onInit();
      }
      return;
    }

    // ── Wave intro ──
    if (game.state === 'waveIntro') {
      waveTransitionTimer--;
      if (waveTransitionTimer <= 0) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    // ── Playing state ──

    // Player movement (WASD)
    let pmx = 0, pmy = 0;
    if (input.isDown('w') || input.isDown('W')) pmy -= 1;
    if (input.isDown('s') || input.isDown('S')) pmy += 1;
    if (input.isDown('a') || input.isDown('A')) pmx -= 1;
    if (input.isDown('d') || input.isDown('D')) pmx += 1;
    if (pmx !== 0 || pmy !== 0) {
      const pn = normalize(pmx, pmy);
      player.x += pn.x * PLAYER_SPEED;
      player.y += pn.y * PLAYER_SPEED;
    }
    player.x = Math.max(PLAYER_SIZE, Math.min(W - PLAYER_SIZE, player.x));
    player.y = Math.max(PLAYER_SIZE, Math.min(H - PLAYER_SIZE, player.y));

    // Fire direction (Arrow keys)
    let fx = 0, fy = 0;
    if (input.isDown('ArrowUp')) fy -= 1;
    if (input.isDown('ArrowDown')) fy += 1;
    if (input.isDown('ArrowLeft')) fx -= 1;
    if (input.isDown('ArrowRight')) fx += 1;
    if (fx !== 0 || fy !== 0) {
      fireDir = normalize(fx, fy);
    }

    // Continuous firing
    if (fireCooldown > 0) fireCooldown--;
    if ((fx !== 0 || fy !== 0) && fireCooldown <= 0) {
      fireCooldown = FIRE_RATE;
      bullets.push({
        x: player.x,
        y: player.y,
        vx: fireDir.x * BULLET_SPEED,
        vy: fireDir.y * BULLET_SPEED,
        life: BULLET_LIFE
      });
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || b.life <= 0) {
        bullets.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }

      switch (e.type) {
        case 'grunt':
        case 'prog':
          moveToward(e, player.x, player.y, e.speed);
          break;

        case 'hulk':
          moveToward(e, player.x, player.y, e.speed);
          if (e.pushCooldown > 0) e.pushCooldown--;
          // Hulks destroy nearby humans
          for (let h = humans.length - 1; h >= 0; h--) {
            if (humans[h].alive && dist(e.x, e.y, humans[h].x, humans[h].y) < HULK_SIZE + HUMAN_SIZE) {
              humans[h].alive = false;
              spawnParticles(humans[h].x, humans[h].y, humans[h].type.color, 6);
            }
          }
          break;

        case 'brain': {
          let nearestHuman = null;
          let nearestDist = Infinity;
          for (const h of humans) {
            if (!h.alive) continue;
            const d = dist(e.x, e.y, h.x, h.y);
            if (d < nearestDist) { nearestDist = d; nearestHuman = h; }
          }
          if (nearestHuman) {
            moveToward(e, nearestHuman.x, nearestHuman.y, e.speed);
            if (nearestDist < BRAIN_SIZE + HUMAN_SIZE) {
              nearestHuman.alive = false;
              spawnParticles(nearestHuman.x, nearestHuman.y, '#f0f', 8);
              const prog = {
                x: nearestHuman.x, y: nearestHuman.y,
                type: 'prog', alive: true,
                speed: 1.5 + wave * 0.05
              };
              enemies.push(prog);
            }
          } else {
            moveToward(e, player.x, player.y, e.speed);
          }
          break;
        }

        case 'spheroid':
          e.angle += 0.02;
          e.x += Math.cos(e.angle) * e.speed;
          e.y += Math.sin(e.angle * 0.7) * e.speed;
          if (e.x < SPHEROID_SIZE) { e.x = SPHEROID_SIZE; e.angle = Math.PI - e.angle; }
          if (e.x > W - SPHEROID_SIZE) { e.x = W - SPHEROID_SIZE; e.angle = Math.PI - e.angle; }
          if (e.y < SPHEROID_SIZE) { e.y = SPHEROID_SIZE; e.angle = -e.angle; }
          if (e.y > H - SPHEROID_SIZE) { e.y = H - SPHEROID_SIZE; e.angle = -e.angle; }
          e.spawnTimer--;
          if (e.spawnTimer <= 0 && e.enforcersSpawned < e.maxEnforcers) {
            e.spawnTimer = 120 + Math.floor(Math.random() * 120);
            e.enforcersSpawned++;
            enemies.push({
              x: e.x, y: e.y,
              type: 'enforcer', alive: true,
              speed: ENFORCER_SPEED,
              shootTimer: 60 + Math.floor(Math.random() * 60),
              angle: Math.random() * Math.PI * 2
            });
          }
          break;

        case 'enforcer': {
          e.angle += (Math.random() - 0.5) * 0.3;
          const toPlayerAngle = Math.atan2(player.y - e.y, player.x - e.x);
          e.angle += (toPlayerAngle - e.angle) * 0.05;
          e.x += Math.cos(e.angle) * e.speed;
          e.y += Math.sin(e.angle) * e.speed;
          e.x = Math.max(ENFORCER_SIZE, Math.min(W - ENFORCER_SIZE, e.x));
          e.y = Math.max(ENFORCER_SIZE, Math.min(H - ENFORCER_SIZE, e.y));
          e.shootTimer--;
          if (e.shootTimer <= 0) {
            e.shootTimer = 40 + Math.floor(Math.random() * 40);
            const dir = normalize(player.x - e.x, player.y - e.y);
            enemies.push({
              x: e.x, y: e.y,
              type: 'enforcerBullet', alive: true,
              vx: dir.x * 3,
              vy: dir.y * 3,
              life: 120
            });
          }
          break;
        }

        case 'enforcerBullet':
          e.x += e.vx;
          e.y += e.vy;
          e.life--;
          if (e.x < 0 || e.x > W || e.y < 0 || e.y > H || e.life <= 0) {
            e.alive = false;
          }
          break;
      }

      // Collision with player (skip hulk - it pushes instead)
      if (e.alive && e.type !== 'hulk') {
        const hitRadius = e.type === 'enforcerBullet' ? 4 :
                         e.type === 'grunt' || e.type === 'prog' ? GRUNT_SIZE :
                         e.type === 'brain' ? BRAIN_SIZE :
                         e.type === 'spheroid' ? SPHEROID_SIZE :
                         e.type === 'enforcer' ? ENFORCER_SIZE : 8;
        if (dist(e.x, e.y, player.x, player.y) < hitRadius + PLAYER_SIZE - 4) {
          playerDeath(game);
          return;
        }
      }

      // Hulk pushes player
      if (e.alive && e.type === 'hulk' && e.pushCooldown <= 0) {
        if (dist(e.x, e.y, player.x, player.y) < HULK_SIZE + PLAYER_SIZE - 2) {
          const pushDir = normalize(player.x - e.x, player.y - e.y);
          player.x += pushDir.x * 30;
          player.y += pushDir.y * 30;
          player.x = Math.max(PLAYER_SIZE, Math.min(W - PLAYER_SIZE, player.x));
          player.y = Math.max(PLAYER_SIZE, Math.min(H - PLAYER_SIZE, player.y));
          e.pushCooldown = 30;
          spawnParticles(player.x, player.y, '#fff', 4);
        }
      }
    }

    // Bullet-enemy collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let bulletHit = false;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (!e.alive) continue;
        if (e.type === 'hulk') {
          if (dist(b.x, b.y, e.x, e.y) < HULK_SIZE) {
            spawnParticles(b.x, b.y, '#888', 3);
            bulletHit = true;
            break;
          }
          continue;
        }
        if (e.type === 'enforcerBullet') continue;
        const hitR = e.type === 'grunt' || e.type === 'prog' ? GRUNT_SIZE :
                     e.type === 'brain' ? BRAIN_SIZE :
                     e.type === 'spheroid' ? SPHEROID_SIZE :
                     e.type === 'enforcer' ? ENFORCER_SIZE : 8;
        if (dist(b.x, b.y, e.x, e.y) < hitR) {
          e.alive = false;
          bulletHit = true;
          const points = e.type === 'grunt' ? 100 :
                        e.type === 'brain' ? 500 :
                        e.type === 'spheroid' ? 1000 :
                        e.type === 'enforcer' ? 200 :
                        e.type === 'prog' ? 100 : 50;
          addScore(points * Math.ceil(wave / 3));
          const eColor = e.type === 'grunt' ? '#f44' :
                        e.type === 'brain' ? '#f0f' :
                        e.type === 'spheroid' ? '#4af' :
                        e.type === 'enforcer' ? '#ff0' :
                        e.type === 'prog' ? '#f80' : '#fff';
          spawnParticles(e.x, e.y, eColor, 10);
          break;
        }
      }
      if (bulletHit) {
        bullets.splice(bi, 1);
      }
    }

    // Electrode collision with player
    for (const el of electrodes) {
      if (dist(player.x, player.y, el.x, el.y) < ELECTRODE_SIZE + PLAYER_SIZE - 4) {
        playerDeath(game);
        return;
      }
    }

    // Bullet-electrode collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = electrodes.length - 1; ei >= 0; ei--) {
        if (dist(b.x, b.y, electrodes[ei].x, electrodes[ei].y) < ELECTRODE_SIZE) {
          spawnParticles(electrodes[ei].x, electrodes[ei].y, '#0ff', 6);
          electrodes.splice(ei, 1);
          bullets.splice(bi, 1);
          addScore(25);
          break;
        }
      }
    }

    // Update humans
    for (const h of humans) {
      if (!h.alive) continue;
      h.changeTimer--;
      if (h.changeTimer <= 0) {
        h.changeTimer = 60 + Math.floor(Math.random() * 120);
        h.vx = (Math.random() - 0.5) * 1.5;
        h.vy = (Math.random() - 0.5) * 1.5;
      }
      h.x += h.vx;
      h.y += h.vy;
      if (h.x < HUMAN_SIZE) { h.x = HUMAN_SIZE; h.vx = Math.abs(h.vx); }
      if (h.x > W - HUMAN_SIZE) { h.x = W - HUMAN_SIZE; h.vx = -Math.abs(h.vx); }
      if (h.y < HUMAN_SIZE) { h.y = HUMAN_SIZE; h.vy = Math.abs(h.vy); }
      if (h.y > H - HUMAN_SIZE) { h.y = H - HUMAN_SIZE; h.vy = -Math.abs(h.vy); }

      // Player rescues human
      if (dist(player.x, player.y, h.x, h.y) < PLAYER_SIZE + HUMAN_SIZE) {
        h.alive = false;
        humansRescuedThisWave++;
        const rescueBonus = 1000 * Math.ceil(wave / 2) * humansRescuedThisWave;
        addScore(rescueBonus);
        spawnParticles(h.x, h.y, h.type.color, 12);
        // Score popup particle
        particles.push({
          x: h.x, y: h.y - 10,
          vx: 0, vy: -0.8,
          life: 40,
          color: h.type.color,
          text: '+' + rescueBonus
        });
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Check wave complete
    const killableEnemies = enemies.filter(e =>
      e.alive && e.type !== 'enforcerBullet'
    );
    if (killableEnemies.length === 0) {
      startWave(game);
    }
  };

  game.onDraw = (renderer, text) => {
    // Arena border glow
    renderer.drawLine(3, 3, W - 3, 3, 'rgba(255,136,255,0.15)', 1);
    renderer.drawLine(W - 3, 3, W - 3, H - 3, 'rgba(255,136,255,0.15)', 1);
    renderer.drawLine(W - 3, H - 3, 3, H - 3, 'rgba(255,136,255,0.15)', 1);
    renderer.drawLine(3, H - 3, 3, 3, 'rgba(255,136,255,0.15)', 1);

    // Grid lines
    for (let x = 0; x < W; x += 50) {
      renderer.drawLine(x, 0, x, H, '#16213e', 0.5);
    }
    for (let y = 0; y < H; y += 50) {
      renderer.drawLine(0, y, W, y, '#16213e', 0.5);
    }

    // Electrodes (rotating X shapes)
    for (const el of electrodes) {
      const pulse = Math.sin(tick * 0.1 + el.pulse) * 0.3 + 0.7;
      const alpha = Math.floor(pulse * 255).toString(16).padStart(2, '0');
      const color = `#00ffff${alpha}`;
      const r = tick * 0.03 + el.pulse;
      const s = ELECTRODE_SIZE / 2;
      const cos = Math.cos(r), sin = Math.sin(r);

      renderer.setGlow('#0ff', 0.5);
      // Draw X as two crossing lines
      renderer.drawLine(
        el.x + cos * (-s) - sin * (-2), el.y + sin * (-s) + cos * (-2),
        el.x + cos * s - sin * (-2), el.y + sin * s + cos * (-2),
        color, 4
      );
      renderer.drawLine(
        el.x + cos * (-s) - sin * 2, el.y + sin * (-s) + cos * 2,
        el.x + cos * s - sin * 2, el.y + sin * s + cos * 2,
        color, 4
      );
      renderer.drawLine(
        el.x + cos * (-2) - sin * (-s), el.y + sin * (-2) + cos * (-s),
        el.x + cos * (-2) - sin * s, el.y + sin * (-2) + cos * s,
        color, 4
      );
      renderer.drawLine(
        el.x + cos * 2 - sin * (-s), el.y + sin * 2 + cos * (-s),
        el.x + cos * 2 - sin * s, el.y + sin * 2 + cos * s,
        color, 4
      );
      renderer.setGlow(null);
    }

    // Humans (stick figures)
    for (const h of humans) {
      if (!h.alive) continue;
      const c = h.type.color;
      renderer.setGlow(c, 0.5);
      // Head
      renderer.fillCircle(h.x, h.y - 5, 3, c);
      // Body
      renderer.drawLine(h.x, h.y - 2, h.x, h.y + 4, c, 2);
      // Arms
      renderer.drawLine(h.x - 4, h.y, h.x + 4, h.y, c, 2);
      // Legs
      renderer.drawLine(h.x, h.y + 4, h.x - 3, h.y + 8, c, 2);
      renderer.drawLine(h.x, h.y + 4, h.x + 3, h.y + 8, c, 2);
      renderer.setGlow(null);
    }

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      switch (e.type) {
        case 'grunt':
          renderer.setGlow('#f44', 0.4);
          renderer.fillRect(e.x - GRUNT_SIZE / 2, e.y - GRUNT_SIZE / 2, GRUNT_SIZE, GRUNT_SIZE, '#f44');
          renderer.setGlow(null);
          break;

        case 'hulk':
          renderer.setGlow('#4a4', 0.6);
          renderer.fillRect(e.x - HULK_SIZE / 2, e.y - HULK_SIZE / 2, HULK_SIZE, HULK_SIZE, '#4a4');
          renderer.fillRect(e.x - HULK_SIZE / 4, e.y - HULK_SIZE / 4, HULK_SIZE / 2, HULK_SIZE / 2, '#282');
          renderer.setGlow(null);
          break;

        case 'brain':
          renderer.setGlow('#f0f', 0.6);
          renderer.fillCircle(e.x, e.y, BRAIN_SIZE / 2, '#f0f');
          // Brain detail arc as a short line
          renderer.drawLine(e.x - BRAIN_SIZE / 3, e.y, e.x + BRAIN_SIZE / 3, e.y, '#a0a', 1);
          renderer.setGlow(null);
          break;

        case 'spheroid': {
          const sPhase = Math.sin(tick * 0.05) * 0.3 + 0.7;
          const sAlpha = Math.floor(sPhase * 255).toString(16).padStart(2, '0');
          renderer.setGlow('#4af', 0.7);
          // Outer ring as octagon
          const outerPts = [];
          const innerPts = [];
          for (let a = 0; a < 8; a++) {
            const ang = (Math.PI * 2 / 8) * a;
            outerPts.push({ x: e.x + Math.cos(ang) * SPHEROID_SIZE / 2, y: e.y + Math.sin(ang) * SPHEROID_SIZE / 2 });
            innerPts.push({ x: e.x + Math.cos(ang) * SPHEROID_SIZE / 4, y: e.y + Math.sin(ang) * SPHEROID_SIZE / 4 });
          }
          renderer.strokePoly(outerPts, `#44aaff${sAlpha}`, 2);
          renderer.strokePoly(innerPts, `#44aaff${sAlpha}`, 2);
          renderer.setGlow(null);
          break;
        }

        case 'enforcer': {
          renderer.setGlow('#ff0', 0.4);
          const hs = ENFORCER_SIZE / 2;
          renderer.fillPoly([
            { x: e.x, y: e.y - hs },
            { x: e.x + hs, y: e.y },
            { x: e.x, y: e.y + hs },
            { x: e.x - hs, y: e.y }
          ], '#ff0');
          renderer.setGlow(null);
          break;
        }

        case 'enforcerBullet':
          renderer.setGlow('#ff0', 0.3);
          renderer.fillCircle(e.x, e.y, 3, '#ff0');
          renderer.setGlow(null);
          break;

        case 'prog':
          renderer.setGlow('#f80', 0.4);
          renderer.fillPoly([
            { x: e.x, y: e.y - 8 },
            { x: e.x + 6, y: e.y },
            { x: e.x + 3, y: e.y + 8 },
            { x: e.x - 3, y: e.y + 8 },
            { x: e.x - 6, y: e.y }
          ], '#f80');
          renderer.setGlow(null);
          break;
      }
    }

    // Player
    renderer.setGlow('#f8f', 0.7);
    renderer.fillCircle(player.x, player.y, PLAYER_SIZE / 2, '#f8f');
    renderer.fillCircle(player.x, player.y, PLAYER_SIZE / 4, '#fff');
    // Fire direction indicator
    if (fireDir.x !== 0 || fireDir.y !== 0) {
      renderer.drawLine(
        player.x + fireDir.x * 8, player.y + fireDir.y * 8,
        player.x + fireDir.x * 16, player.y + fireDir.y * 16,
        'rgba(255,136,255,0.5)', 2
      );
    }
    renderer.setGlow(null);

    // Bullets
    renderer.setGlow('#f8f', 0.4);
    for (const b of bullets) {
      renderer.fillRect(b.x - 2, b.y - 2, 4, 4, '#fff');
    }
    renderer.setGlow(null);

    // Particles
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 15);
      const a8 = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      if (p.text) {
        text.drawText(p.text, p.x, p.y, 12, p.color, 'center');
      } else {
        // Expand #rgb to #rrggbb before appending alpha
        let c = p.color;
        if (c.length === 4) c = '#' + c[1]+c[1] + c[2]+c[2] + c[3]+c[3];
        renderer.fillRect(p.x - 2, p.y - 2, 4, 4, c + a8);
      }
    }

    // HUD - lives indicator at bottom
    renderer.setGlow('#f8f', 0.3);
    for (let i = 0; i < lives; i++) {
      renderer.fillCircle(15 + i * 18, H - 12, 5, '#f8f');
    }
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
