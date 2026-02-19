// paperboy/game.js — Paperboy game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 400;

// Game constants
const ROAD_TOP = 60;
const ROAD_BOTTOM = H - 20;
const ROAD_HEIGHT = ROAD_BOTTOM - ROAD_TOP;
const LANE_COUNT = 4;
const LANE_HEIGHT = ROAD_HEIGHT / LANE_COUNT;
const HOUSE_ZONE_TOP = 0;
const HOUSE_ZONE_BOTTOM = ROAD_TOP;

// Player bike
const BIKE_W = 20;
const BIKE_H = 30;

// Scrolling
const BASE_SCROLL_SPEED = 2;
const MAX_SCROLL_SPEED = 4;

// Houses
const HOUSE_W = 50;
const HOUSE_H = 48;
const HOUSE_SPACING = 90;

// Newspapers
const PAPER_SIZE = 8;
const PAPER_SPEED = 4;

// Obstacles
const OBS_TYPES = ['car', 'dog', 'skater', 'cone', 'grate'];

// ── State ──
let score, best = 0;
let lives, day;
let bikeX, bikeY, bikeLane;
let scrollOffset, scrollSpeed;
let houses, papers, obstacles;
let frameCount;
let crashTimer, crashX, crashY;
let dayLength, housesDelivered, housesTotal;
let dayComplete;
let paperCooldown;
let particles = [];

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const dayEl = document.getElementById('day');

function laneToY(lane) {
  return ROAD_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2 - BIKE_H / 2;
}

function laneCenterY(lane) {
  return ROAD_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2;
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color: color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function generateObstacles() {
  const numObs = Math.floor(dayLength * 0.8 + day * 1.2);
  for (let i = 0; i < numObs; i++) {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const minX = 400;
    const maxX = 300 + dayLength * HOUSE_SPACING - 100;
    const x = minX + Math.random() * (maxX - minX);
    const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
    obstacles.push({
      x: x,
      lane: lane,
      type: type,
      w: type === 'car' ? 40 : type === 'grate' ? 25 : 20,
      h: type === 'car' ? 22 : 18,
      moveDir: type === 'dog' ? (Math.random() < 0.5 ? 1 : -1) : 0,
      moveTimer: 0
    });
  }
}

function initDay() {
  bikeX = 80;
  bikeLane = 2;
  bikeY = laneToY(bikeLane);
  scrollOffset = 0;
  scrollSpeed = BASE_SCROLL_SPEED + (day - 1) * 0.3;
  if (scrollSpeed > MAX_SCROLL_SPEED) scrollSpeed = MAX_SCROLL_SPEED;
  houses = [];
  papers = [];
  obstacles = [];
  particles = [];
  frameCount = 0;
  crashTimer = 0;
  dayComplete = false;
  paperCooldown = 0;
  housesDelivered = 0;
  housesTotal = 0;

  // Generate houses for this day
  dayLength = 12 + day * 2;
  if (dayLength > 30) dayLength = 30;
  for (let i = 0; i < dayLength; i++) {
    const isSubscriber = Math.random() < 0.55;
    if (isSubscriber) housesTotal++;
    houses.push({
      x: 300 + i * HOUSE_SPACING,
      isSubscriber: isSubscriber,
      delivered: false,
      hit: false
    });
  }

  generateObstacles();
}

function throwPaper() {
  if (paperCooldown > 0) return;
  paperCooldown = 15;
  papers.push({
    x: bikeX + BIKE_W + scrollOffset,
    y: bikeY,
    rotation: 0
  });
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    day = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    dayEl.textContent = '1';
    initDay();
    game.showOverlay('PAPERBOY', 'Arrow keys to move, SPACE to throw\nDeliver papers to lit houses!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    if (crashTimer > 0) {
      crashTimer--;
      if (crashTimer === 0) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) {
          // Game over
          game.showOverlay('GAME OVER', `Score: ${score} | Day ${day}\nDelivered: ${housesDelivered}/${housesTotal}\nPress SPACE to restart`);
          game.setState('over');
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          return;
        }
        // Reset bike position
        bikeX = 80;
        bikeLane = 2;
        bikeY = laneToY(bikeLane);
      }
      updateParticles();
      return;
    }

    // Scroll
    scrollOffset += scrollSpeed;

    // Player movement
    if (input.isDown('ArrowUp')) {
      bikeY -= 2.5;
      const minY = ROAD_TOP + 2;
      if (bikeY < minY) bikeY = minY;
      bikeLane = Math.round((bikeY - ROAD_TOP) / LANE_HEIGHT);
    }
    if (input.isDown('ArrowDown')) {
      bikeY += 2.5;
      const maxY = ROAD_BOTTOM - BIKE_H - 2;
      if (bikeY > maxY) bikeY = maxY;
      bikeLane = Math.round((bikeY - ROAD_TOP) / LANE_HEIGHT);
    }
    if (input.isDown('ArrowRight')) {
      scrollSpeed = BASE_SCROLL_SPEED + (day - 1) * 0.3 + 1.5;
      if (scrollSpeed > MAX_SCROLL_SPEED + 1) scrollSpeed = MAX_SCROLL_SPEED + 1;
    } else if (input.isDown('ArrowLeft')) {
      scrollSpeed = Math.max(1, BASE_SCROLL_SPEED + (day - 1) * 0.3 - 1);
    } else {
      scrollSpeed = BASE_SCROLL_SPEED + (day - 1) * 0.3;
      if (scrollSpeed > MAX_SCROLL_SPEED) scrollSpeed = MAX_SCROLL_SPEED;
    }

    // Paper cooldown
    if (paperCooldown > 0) paperCooldown--;

    // Throw paper on space
    if (input.wasPressed(' ')) {
      throwPaper();
    }

    // Update papers
    for (let i = papers.length - 1; i >= 0; i--) {
      const p = papers[i];
      p.x += PAPER_SPEED + scrollSpeed;
      p.y -= 4;
      p.rotation += 0.3;

      const paperScreenX = p.x - scrollOffset;
      let hitHouse = false;

      for (let h = 0; h < houses.length; h++) {
        const house = houses[h];
        if (house.delivered || house.hit) continue;
        const houseScreenX = house.x - scrollOffset;
        const mailboxX = houseScreenX + HOUSE_W / 2;
        const mailboxY = HOUSE_ZONE_BOTTOM - 5;

        if (Math.abs(paperScreenX - mailboxX) < 25 && p.y < ROAD_TOP + 10) {
          if (house.isSubscriber) {
            house.delivered = true;
            housesDelivered++;
            if (Math.abs(paperScreenX - mailboxX) < 10) {
              score += 50;
              spawnParticles(paperScreenX, mailboxY, '#ff0', 8);
            } else {
              score += 25;
              spawnParticles(paperScreenX, mailboxY, '#6ca', 5);
            }
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
          } else {
            house.hit = true;
            score = Math.max(0, score - 15);
            scoreEl.textContent = score;
            spawnParticles(paperScreenX, mailboxY, '#f44', 5);
          }
          hitHouse = true;
          papers.splice(i, 1);
          break;
        }
      }

      if (!hitHouse) {
        if (paperScreenX > W + 50 || p.y < -20) {
          papers.splice(i, 1);
        }
      }
    }

    // Update obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.type === 'dog') {
        obs.moveTimer++;
        if (obs.moveTimer > 60) {
          obs.moveTimer = 0;
          obs.lane += obs.moveDir;
          if (obs.lane <= 0 || obs.lane >= LANE_COUNT - 1) {
            obs.moveDir *= -1;
            obs.lane = Math.max(0, Math.min(LANE_COUNT - 1, obs.lane));
          }
        }
      }

      const obsScreenX = obs.x - scrollOffset;
      const obsY = laneCenterY(obs.lane) - obs.h / 2;
      if (obsScreenX > -50 && obsScreenX < W + 50) {
        if (rectsOverlap(bikeX, bikeY, BIKE_W, BIKE_H, obsScreenX, obsY, obs.w, obs.h)) {
          // Crash
          crashTimer = 40;
          crashX = bikeX;
          crashY = bikeY;
          spawnParticles(bikeX, bikeY, '#f44', 15);
          spawnParticles(bikeX, bikeY, '#ff0', 8);
          return;
        }
      }
    }

    // Check missed subscriber houses
    for (let h = 0; h < houses.length; h++) {
      const house = houses[h];
      const houseScreenX = house.x - scrollOffset;
      if (houseScreenX < -HOUSE_W && house.isSubscriber && !house.delivered && !house.missed) {
        house.missed = true;
        score = Math.max(0, score - 10);
        scoreEl.textContent = score;
      }
    }

    // Check if day is complete
    const lastHouse = houses[houses.length - 1];
    if (lastHouse && (lastHouse.x - scrollOffset) < -HOUSE_W * 2) {
      // Day complete bonus
      const deliveryBonus = housesDelivered * 20;
      const perfectBonus = (housesDelivered === housesTotal && housesTotal > 0) ? 100 * day : 0;
      score += deliveryBonus + perfectBonus;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      day++;
      dayEl.textContent = day;
      initDay();
    }

    updateParticles();
  };

  game.onDraw = (renderer, text) => {
    // Sky background (darker at top)
    renderer.fillRect(0, 0, W, HOUSE_ZONE_BOTTOM, '#0d0d1a');

    // Draw houses
    for (let i = 0; i < houses.length; i++) {
      const house = houses[i];
      const sx = house.x - scrollOffset;
      if (sx < -HOUSE_W - 10 || sx > W + 10) continue;

      const baseY = HOUSE_ZONE_BOTTOM - HOUSE_H - 2;

      // House body
      let bodyColor;
      if (house.isSubscriber) {
        bodyColor = house.delivered ? '#1a4a3a' : '#1a3a4a';
      } else {
        bodyColor = '#1a1a28';
      }
      renderer.fillRect(sx, baseY + 12, HOUSE_W, HOUSE_H - 12, bodyColor);

      // Roof (triangle)
      let roofColor;
      if (house.isSubscriber) {
        roofColor = house.delivered ? '#2a6a4a' : '#2a4a5a';
      } else {
        roofColor = '#22222e';
      }
      renderer.fillPoly([
        { x: sx - 4, y: baseY + 14 },
        { x: sx + HOUSE_W / 2, y: baseY },
        { x: sx + HOUSE_W + 4, y: baseY + 14 }
      ], roofColor);

      // Door
      const doorColor = house.isSubscriber ? '#3a6a7a' : '#222238';
      renderer.fillRect(sx + HOUSE_W / 2 - 5, baseY + 30, 10, 18, doorColor);

      // Windows
      if (house.isSubscriber && !house.delivered) {
        renderer.setGlow('#ff8', 0.6);
        renderer.fillRect(sx + 8, baseY + 18, 10, 8, '#ff8');
        renderer.fillRect(sx + HOUSE_W - 18, baseY + 18, 10, 8, '#ff8');
        renderer.setGlow(null);
      } else {
        renderer.fillRect(sx + 8, baseY + 18, 10, 8, '#1a1a2e');
        renderer.fillRect(sx + HOUSE_W - 18, baseY + 18, 10, 8, '#1a1a2e');
      }

      // Mailbox
      const mbx = sx + HOUSE_W / 2;
      const mby = HOUSE_ZONE_BOTTOM - 6;
      const mbColor = house.isSubscriber ? '#6ca' : '#444';
      renderer.fillRect(mbx - 3, mby, 6, 6, mbColor);
      renderer.fillRect(mbx - 1, mby - 4, 2, 4, mbColor);

      // Subscriber indicator - glowing border
      if (house.isSubscriber && !house.delivered) {
        renderer.setGlow('#6ca', 0.5);
        // Draw border as four thin rects
        renderer.fillRect(sx - 2, baseY - 2, HOUSE_W + 4, 1, '#6ca');
        renderer.fillRect(sx - 2, baseY - 2, 1, HOUSE_H + 6, '#6ca');
        renderer.fillRect(sx + HOUSE_W + 1, baseY - 2, 1, HOUSE_H + 6, '#6ca');
        renderer.fillRect(sx - 2, baseY + HOUSE_H + 3, HOUSE_W + 4, 1, '#6ca');
        renderer.setGlow(null);
      }

      // Delivery checkmark
      if (house.delivered) {
        renderer.setGlow('#0f0', 0.7);
        text.drawText('\u2713', sx + HOUSE_W / 2, baseY + 1, 16, '#0f0', 'center');
        renderer.setGlow(null);
      }

      // Hit X mark
      if (house.hit) {
        renderer.setGlow('#f44', 0.7);
        text.drawText('\u2717', sx + HOUSE_W / 2, baseY + 1, 16, '#f44', 'center');
        renderer.setGlow(null);
      }
    }

    // Sidewalk
    renderer.fillRect(0, ROAD_TOP - 8, W, 10, '#2a2a3e');
    // Sidewalk pattern
    for (let x = -(scrollOffset % 20); x < W; x += 20) {
      renderer.fillRect(x, ROAD_TOP - 8, 18, 2, '#3a3a4e');
    }

    // Road
    renderer.fillRect(0, ROAD_TOP, W, ROAD_HEIGHT, '#111122');

    // Lane markings (dashed lines)
    for (let i = 1; i < LANE_COUNT; i++) {
      const ly = ROAD_TOP + i * LANE_HEIGHT;
      renderer.dashedLine(-(scrollOffset % 35), ly, W, ly, '#333350', 1, 20, 15);
    }

    // Road edges with glow
    renderer.setGlow('#6ca', 0.5);
    renderer.fillRect(0, ROAD_TOP, W, 2, '#6ca');
    renderer.fillRect(0, ROAD_BOTTOM, W, 2, '#6ca');
    renderer.setGlow(null);

    // Curb
    renderer.fillRect(0, ROAD_BOTTOM + 2, W, 18, '#444460');
    for (let x = -(scrollOffset % 30); x < W; x += 30) {
      renderer.fillRect(x, ROAD_BOTTOM + 4, 2, 14, '#333348');
    }

    // Draw obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const sx = obs.x - scrollOffset;
      if (sx < -50 || sx > W + 50) continue;

      const oy = laneCenterY(obs.lane) - obs.h / 2;

      switch (obs.type) {
        case 'car':
          drawCar(renderer, sx, oy, obs.w, obs.h);
          break;
        case 'dog':
          drawDog(renderer, sx, oy);
          break;
        case 'skater':
          drawSkater(renderer, sx, oy);
          break;
        case 'cone':
          drawCone(renderer, sx, oy);
          break;
        case 'grate':
          drawGrate(renderer, sx, oy, obs.w);
          break;
      }
    }

    // Draw newspapers in flight
    for (let i = 0; i < papers.length; i++) {
      const p = papers[i];
      const sx = p.x - scrollOffset;
      renderer.setGlow('#fff', 0.5);
      renderer.fillRect(sx - PAPER_SIZE / 2, p.y - PAPER_SIZE * 0.35, PAPER_SIZE, PAPER_SIZE * 0.7, '#fff');
      // Fold line
      renderer.fillRect(sx - PAPER_SIZE / 2, p.y - 0.5, PAPER_SIZE, 1, '#aaa');
      renderer.setGlow(null);
    }

    // Draw bike or crash
    if (crashTimer > 0) {
      // Flashing crash effect
      const flash = Math.floor(crashTimer / 4) % 2 === 0;
      if (flash) {
        renderer.setGlow('#f44', 0.8);
        text.drawText('CRASH!', bikeX + BIKE_W / 2, bikeY + BIKE_H / 2 - 10, 20, '#f44', 'center');
        renderer.setGlow(null);
      }
      // Draw fading bike in red
      const alpha = Math.floor((crashTimer / 40) * 255).toString(16).padStart(2, '0');
      drawBikeShape(renderer, text, bikeX, bikeY, '#ff4444' + alpha);
    } else {
      drawBike(renderer, text, bikeX, bikeY);
    }

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const alpha = Math.floor((p.life / p.maxLife) * 255).toString(16).padStart(2, '0');
      const fullColor = expandHex(p.color);
      renderer.setGlow(p.color, 0.4);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, fullColor + alpha);
      renderer.setGlow(null);
    }

    // HUD on canvas
    renderer.setGlow('#6ca', 0.5);
    text.drawText(`Deliveries: ${housesDelivered}/${housesTotal}`, 10, H - 14, 12, '#6ca', 'left');
    renderer.setGlow(null);
    text.drawText('SPACE = throw', W - 10, H - 14, 12, '#aaa', 'right');
  };

  game.start();
  return game;
}

// ── Utility: expand #rgb to #rrggbb for alpha appending ──
function expandHex(color) {
  if (color.length === 4) { // #rgb
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
}

// ── Drawing helpers ──

function drawBike(renderer, text, x, y) {
  renderer.setGlow('#6ca', 0.6);

  // Wheels (circles)
  renderer.fillCircle(x + 4, y + BIKE_H - 6, 5, '#1a1a2e');
  drawCircleOutline(renderer, x + 4, y + BIKE_H - 6, 5, '#6ca');
  renderer.fillCircle(x + BIKE_W - 4, y + BIKE_H - 6, 5, '#1a1a2e');
  drawCircleOutline(renderer, x + BIKE_W - 4, y + BIKE_H - 6, 5, '#6ca');

  // Frame lines
  renderer.drawLine(x + 4, y + BIKE_H - 6, x + 10, y + 10, '#6ca', 2);
  renderer.drawLine(x + 10, y + 10, x + BIKE_W - 4, y + BIKE_H - 6, '#6ca', 2);
  renderer.drawLine(x + 10, y + 10, x + BIKE_W - 4, y + 10, '#6ca', 2);
  renderer.drawLine(x + BIKE_W - 4, y + 10, x + BIKE_W - 4, y + BIKE_H - 6, '#6ca', 2);

  // Rider body
  renderer.fillRect(x + 8, y + 2, 6, 10, '#6ca');

  // Rider head
  renderer.fillCircle(x + 11, y, 4, '#fca');

  // Newspaper bag
  renderer.fillRect(x + 14, y + 4, 6, 8, '#886');
  renderer.fillRect(x + 15, y + 5, 4, 2, '#aaa');

  renderer.setGlow(null);
}

function drawBikeShape(renderer, text, x, y, color) {
  // Simplified bike shape for crash animation
  drawCircleOutline(renderer, x + 4, y + BIKE_H - 6, 5, color);
  drawCircleOutline(renderer, x + BIKE_W - 4, y + BIKE_H - 6, 5, color);
  renderer.drawLine(x + 4, y + BIKE_H - 6, x + 10, y + 10, color, 2);
  renderer.drawLine(x + 10, y + 10, x + BIKE_W - 4, y + BIKE_H - 6, color, 2);
}

function drawCircleOutline(renderer, cx, cy, r, color) {
  // Approximate circle outline with small line segments
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a1 = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    renderer.drawLine(
      cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
      cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
      color, 2
    );
  }
}

function drawCar(renderer, x, y, w, h) {
  renderer.setGlow('#f44', 0.5);
  // Car body
  renderer.fillRect(x, y + 4, w, h - 4, '#c44');
  // Windshield
  renderer.fillRect(x + w - 10, y + 7, 8, h - 10, '#48f');
  // Wheels
  renderer.fillRect(x + 4, y + 1, 8, 5, '#333');
  renderer.fillRect(x + 4, y + h - 2, 8, 5, '#333');
  renderer.fillRect(x + w - 12, y + 1, 8, 5, '#333');
  renderer.fillRect(x + w - 12, y + h - 2, 8, 5, '#333');
  // Headlights
  renderer.fillRect(x + w - 2, y + 6, 3, 4, '#ff0');
  renderer.fillRect(x + w - 2, y + h - 6, 3, 4, '#ff0');
  renderer.setGlow(null);
}

function drawDog(renderer, x, y) {
  renderer.setGlow('#a86', 0.4);
  // Body
  renderer.fillRect(x, y + 6, 16, 10, '#a86');
  // Head
  renderer.fillRect(x + 14, y + 3, 8, 10, '#a86');
  // Legs
  renderer.fillRect(x + 2, y + 14, 3, 6, '#865');
  renderer.fillRect(x + 10, y + 14, 3, 6, '#865');
  // Eye
  renderer.fillRect(x + 19, y + 5, 2, 2, '#f00');
  // Tail
  renderer.fillRect(x - 3, y + 4, 4, 2, '#865');
  renderer.setGlow(null);
}

function drawSkater(renderer, x, y) {
  renderer.setGlow('#f80', 0.4);
  // Board
  renderer.fillRect(x, y + 18, 20, 3, '#f80');
  // Wheels
  renderer.fillRect(x + 2, y + 21, 4, 3, '#888');
  renderer.fillRect(x + 14, y + 21, 4, 3, '#888');
  // Body
  renderer.fillRect(x + 6, y + 4, 8, 14, '#f80');
  // Head
  renderer.fillRect(x + 7, y, 6, 6, '#fca');
  renderer.setGlow(null);
}

function drawCone(renderer, x, y) {
  renderer.setGlow('#f80', 0.5);
  // Base
  renderer.fillRect(x, y + 14, 16, 4, '#f80');
  // Cone body (triangle)
  renderer.fillPoly([
    { x: x + 2, y: y + 14 },
    { x: x + 8, y: y + 2 },
    { x: x + 14, y: y + 14 }
  ], '#f80');
  // Stripe
  renderer.fillRect(x + 5, y + 8, 6, 2, '#fff');
  renderer.setGlow(null);
}

function drawGrate(renderer, x, y, w) {
  renderer.fillRect(x, y + 6, w, 16, '#333');
  // Grate lines
  for (let gx = x + 3; gx < x + w - 2; gx += 4) {
    renderer.drawLine(gx, y + 8, gx, y + 20, '#555', 1);
  }
}
