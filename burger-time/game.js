// burger-time/game.js — BurgerTime game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// ── Constants ──
const TILE = 16;
const COLS = W / TILE;  // 30
const ROWS = H / TILE;  // 35

// Platform rows (tile Y positions) - 6 horizontal floors
const PLAT_ROWS = [4, 10, 16, 22, 28, 33];
const PLAT_THICKNESS = 3;
const NUM_FLOORS = PLAT_ROWS.length;

// Ingredient dimensions
const ING_W = 6;      // width in tiles
const ING_H = 8;      // pixel height

// Burger column X positions (in tiles)
const BURGER_COLS = [1, 9, 17, 25];

// Ladder X positions (in tiles)
const LADDER_XS = [0, 5, 12, 19, 24, 29];
const LADDER_W = 2; // tiles wide

// Player
const P_W = 14;
const P_H = 28;
const P_SPEED = 1.6;

// ── State ──
let score, best, pepperCount, lives, level;
let player, enemies, ingredients, platYPixels;
let pepperCloud, frameCount, invincibleTimer, levelCompleteTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const pepperEl = document.getElementById('pepper');

// ── Platform & Ladder Helpers ──

function ladderExists(ladderIdx, floorIdx) {
  if (ladderIdx === 0 || ladderIdx === LADDER_XS.length - 1) return true;
  return ((ladderIdx + floorIdx + level) % 3) !== 0;
}

function getFloorY(entity) {
  const feetY = entity.y + entity.h;
  for (const py of platYPixels) {
    if (feetY >= py - 2 && feetY <= py + PLAT_THICKNESS + 2) {
      return py;
    }
  }
  return null;
}

function getFloorIndex(pixelY) {
  for (let i = 0; i < platYPixels.length; i++) {
    if (Math.abs(platYPixels[i] - pixelY) < 4) return i;
  }
  return -1;
}

function getLadderAt(cx, feetY) {
  for (let li = 0; li < LADDER_XS.length; li++) {
    const lx = LADDER_XS[li] * TILE;
    const lw = LADDER_W * TILE;
    if (cx >= lx && cx <= lx + lw) {
      for (let fi = 0; fi < NUM_FLOORS - 1; fi++) {
        if (!ladderExists(li, fi)) continue;
        const top = platYPixels[fi];
        const bottom = platYPixels[fi + 1] + PLAT_THICKNESS;
        if (feetY >= top - 4 && feetY <= bottom + 4) {
          return { lx, top, bottom, lw, floorTop: fi, floorBot: fi + 1, ladderIdx: li };
        }
      }
    }
  }
  return null;
}

function snapToFloor(entity, floorPixelY) {
  entity.y = floorPixelY - entity.h;
  entity.onLadder = false;
}

// ── Level Generation ──

function buildLevel() {
  platYPixels = PLAT_ROWS.map(r => r * TILE);

  ingredients = [];
  const types = ['bunTop', 'lettuce', 'patty', 'bunBottom'];

  for (let bi = 0; bi < BURGER_COLS.length; bi++) {
    for (let ti = 0; ti < types.length; ti++) {
      const floorIdx = ti;
      ingredients.push({
        type: types[ti],
        burgerIdx: bi,
        x: BURGER_COLS[bi] * TILE,
        y: platYPixels[floorIdx] - ING_H,
        restY: platYPixels[floorIdx] - ING_H,
        w: ING_W * TILE,
        floorIdx: floorIdx,
        sections: new Array(ING_W).fill(false),
        sectionsWalked: 0,
        falling: false,
        fallVel: 0,
        landed: false,
        stackOrder: ti
      });
    }
  }

  player = {
    x: W / 2 - P_W / 2,
    y: platYPixels[2] - P_H,
    w: P_W,
    h: P_H,
    speed: P_SPEED,
    onLadder: false,
    dir: 1,
    frame: 0
  };

  enemies = [];
  const numEnemies = Math.min(2 + level, 6);
  const enemyTypes = ['hotdog', 'pickle', 'egg'];
  for (let i = 0; i < numEnemies; i++) {
    const floor = 3 + (i % 2);
    const side = i % 2 === 0;
    enemies.push({
      type: enemyTypes[i % 3],
      x: side ? TILE * 2 : W - TILE * 4,
      y: platYPixels[floor] - P_H,
      w: P_W,
      h: P_H,
      speed: 0.5 + level * 0.08,
      dir: side ? 1 : -1,
      onLadder: false,
      stunned: false,
      stunTimer: 0,
      alive: true,
      respawnTimer: 0,
      frame: 0,
      targetLadder: null,
      climbDir: 0
    });
  }

  pepperCloud = null;
  invincibleTimer = 0;
  levelCompleteTimer = 0;
  frameCount = 0;
}

// ── Game Logic ──

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function dropIngredient(ing) {
  if (ing.falling || ing.landed) return;
  ing.falling = true;
  ing.fallVel = 0;
  ing.sections = new Array(ING_W).fill(false);
  ing.sectionsWalked = 0;

  addScore(50);

  for (const e of enemies) {
    if (!e.alive || e.stunned) continue;
    if (e.x + e.w > ing.x && e.x < ing.x + ing.w &&
        Math.abs((e.y + e.h) - (ing.y + ING_H)) < TILE * 2) {
      e.alive = false;
      e.respawnTimer = 240 + Math.random() * 120;
      addScore(300);
    }
  }
}

function checkIngredientWalk(floorY) {
  const floorIdx = getFloorIndex(floorY);
  if (floorIdx < 0) return;

  for (const ing of ingredients) {
    if (ing.landed || ing.falling) continue;
    if (ing.floorIdx !== floorIdx) continue;

    if (player.x + player.w > ing.x + 2 && player.x < ing.x + ing.w - 2) {
      const playerCenter = player.x + player.w / 2;
      const secIdx = Math.floor((playerCenter - ing.x) / TILE);
      if (secIdx >= 0 && secIdx < ING_W && !ing.sections[secIdx]) {
        ing.sections[secIdx] = true;
        ing.sectionsWalked++;

        if (ing.sectionsWalked >= ING_W) {
          dropIngredient(ing);
        }
      }
    }
  }
}

function updatePlayer(input) {
  player.frame += 0.12;
  const floorY = getFloorY(player);

  if (player.onLadder) {
    if (input.isDown('ArrowUp')) player.y -= player.speed;
    if (input.isDown('ArrowDown')) player.y += player.speed;

    const newFloor = getFloorY(player);
    if (newFloor !== null) {
      if (input.isDown('ArrowLeft') || input.isDown('ArrowRight') ||
          (!input.isDown('ArrowUp') && !input.isDown('ArrowDown'))) {
        snapToFloor(player, newFloor);
      }
    }

    const ladder = getLadderAt(player.x + player.w / 2, player.y + player.h);
    if (!ladder) {
      const nearest = platYPixels.reduce((best, py) =>
        Math.abs(py - (player.y + player.h)) < Math.abs(best - (player.y + player.h)) ? py : best
      );
      snapToFloor(player, nearest);
    }
  } else {
    if (input.isDown('ArrowLeft')) {
      player.x -= player.speed;
      player.dir = -1;
    }
    if (input.isDown('ArrowRight')) {
      player.x += player.speed;
      player.dir = 1;
    }
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    if (floorY !== null) {
      snapToFloor(player, floorY);
    }

    if (input.isDown('ArrowUp') && floorY !== null) {
      const ladder = getLadderAt(player.x + player.w / 2, player.y + player.h);
      if (ladder && getFloorIndex(floorY) > 0) {
        player.onLadder = true;
        player.x = ladder.lx + (ladder.lw - player.w) / 2;
      }
    }

    if (input.isDown('ArrowDown') && floorY !== null) {
      const ladder = getLadderAt(player.x + player.w / 2, floorY + PLAT_THICKNESS + 2);
      if (ladder) {
        player.onLadder = true;
        player.x = ladder.lx + (ladder.lw - player.w) / 2;
        player.y += 4;
      }
    }

    if (floorY === null && !player.onLadder) {
      player.y += 3;
      const newFloor = getFloorY(player);
      if (newFloor !== null) snapToFloor(player, newFloor);
    }

    if (floorY !== null) {
      checkIngredientWalk(floorY);
    }
  }

  player.y = Math.max(0, Math.min(H - player.h, player.y));
}

function updateIngredients() {
  for (const ing of ingredients) {
    if (!ing.falling || ing.landed) continue;

    ing.fallVel = Math.min(ing.fallVel + 0.15, 4);
    ing.y += ing.fallVel;

    const nextFloorIdx = ing.floorIdx + 1;
    if (nextFloorIdx < NUM_FLOORS) {
      const nextFloorY = platYPixels[nextFloorIdx] - ING_H;

      if (ing.y >= nextFloorY) {
        ing.y = nextFloorY;
        ing.floorIdx = nextFloorIdx;
        ing.falling = false;
        ing.fallVel = 0;
        ing.restY = nextFloorY;

        if (nextFloorIdx >= NUM_FLOORS - 1) {
          ing.landed = true;
          addScore(100);
        }

        for (const other of ingredients) {
          if (other === ing) continue;
          if (other.burgerIdx !== ing.burgerIdx) continue;
          if (other.landed || other.falling) continue;
          if (other.floorIdx === ing.floorIdx) {
            dropIngredient(other);
          }
        }

        for (const e of enemies) {
          if (!e.alive || e.stunned) continue;
          if (e.x + e.w > ing.x && e.x < ing.x + ing.w) {
            const eFloor = getFloorY(e);
            if (eFloor !== null && getFloorIndex(eFloor) === nextFloorIdx) {
              e.alive = false;
              e.respawnTimer = 240 + Math.random() * 120;
              addScore(200);
            }
          }
        }
      }
    } else {
      ing.y = platYPixels[NUM_FLOORS - 1] - ING_H;
      ing.floorIdx = NUM_FLOORS - 1;
      ing.landed = true;
      ing.falling = false;
      addScore(100);
    }
  }
}

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) {
      e.respawnTimer--;
      if (e.respawnTimer <= 0) {
        e.alive = true;
        e.stunned = false;
        const fi = 3 + Math.floor(Math.random() * 2);
        e.y = platYPixels[fi] - e.h;
        e.x = Math.random() > 0.5 ? TILE : W - TILE * 3;
        e.dir = e.x < W / 2 ? 1 : -1;
        e.onLadder = false;
      }
      continue;
    }

    if (e.stunned) {
      e.stunTimer--;
      if (e.stunTimer <= 0) e.stunned = false;
      continue;
    }

    e.frame += 0.08;

    const dx = player.x - e.x;
    const dy = player.y - e.y;

    if (e.onLadder) {
      e.y += e.climbDir * e.speed;

      const floorY = getFloorY(e);
      if (floorY !== null) {
        const fi = getFloorIndex(floorY);
        const playerFloor = getFloorY(player);
        const pfi = playerFloor !== null ? getFloorIndex(playerFloor) : -1;
        if (fi === pfi || Math.random() < 0.03) {
          snapToFloor(e, floorY);
          e.targetLadder = null;
        }
      }

      if (e.y < platYPixels[0] - e.h - 10 || e.y + e.h > platYPixels[NUM_FLOORS - 1] + 20) {
        const nearest = platYPixels.reduce((b, py) =>
          Math.abs(py - (e.y + e.h)) < Math.abs(b - (e.y + e.h)) ? py : b
        );
        snapToFloor(e, nearest);
      }
    } else {
      const floorY = getFloorY(e);
      if (floorY !== null) {
        snapToFloor(e, floorY);

        if (Math.abs(dx) > 4) {
          e.x += (dx > 0 ? 1 : -1) * e.speed;
          e.dir = dx > 0 ? 1 : -1;
        }

        if (Math.abs(dy) > TILE * 3 && Math.random() < 0.02) {
          const climbDir = dy < 0 ? -1 : 1;
          const ladder = getLadderAt(e.x + e.w / 2, e.y + e.h);
          if (ladder) {
            e.onLadder = true;
            e.climbDir = climbDir;
            e.x = ladder.lx + (ladder.lw - e.w) / 2;
          } else {
            let bestLadder = null, bestDist = Infinity;
            for (let li = 0; li < LADDER_XS.length; li++) {
              const fi = getFloorIndex(floorY);
              const checkFi = climbDir < 0 ? fi - 1 : fi;
              if (checkFi >= 0 && checkFi < NUM_FLOORS - 1 && ladderExists(li, checkFi)) {
                const lx = LADDER_XS[li] * TILE + LADDER_W * TILE / 2;
                const d = Math.abs(e.x + e.w / 2 - lx);
                if (d < bestDist) { bestDist = d; bestLadder = lx; }
              }
            }
            if (bestLadder !== null) {
              e.x += (bestLadder > e.x + e.w / 2 ? 1 : -1) * e.speed;
            }
          }
        }
      } else {
        e.y += 3;
        const newFloor = getFloorY(e);
        if (newFloor !== null) snapToFloor(e, newFloor);
      }
    }

    e.x = Math.max(0, Math.min(W - e.w, e.x));
    e.y = Math.max(0, Math.min(H - e.h, e.y));
  }
}

function updatePepper() {
  if (!pepperCloud) return;
  pepperCloud.timer--;
  pepperCloud.x += pepperCloud.dir * 4;

  if (pepperCloud.timer <= 0) {
    pepperCloud = null;
    return;
  }

  for (const e of enemies) {
    if (!e.alive || e.stunned) continue;
    if (Math.abs(e.x + e.w / 2 - pepperCloud.x) < TILE * 2.5 &&
        Math.abs(e.y + e.h / 2 - pepperCloud.y) < TILE * 2.5) {
      e.stunned = true;
      e.stunTimer = 150;
      addScore(100);
    }
  }
}

function throwPepper() {
  if (pepperCount <= 0 || pepperCloud) return;
  pepperCount--;
  pepperEl.textContent = pepperCount;
  pepperCloud = {
    x: player.x + player.w / 2 + player.dir * TILE,
    y: player.y + player.h / 2,
    dir: player.dir,
    timer: 25
  };
}

function checkCollisions(game) {
  if (invincibleTimer > 0) return;
  for (const e of enemies) {
    if (!e.alive || e.stunned) continue;
    if (player.x < e.x + e.w && player.x + player.w > e.x &&
        player.y < e.y + e.h && player.y + player.h > e.y) {
      lives--;
      if (lives <= 0) {
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Press any key to restart');
        game.setState('over');
        return;
      }
      player.x = W / 2 - P_W / 2;
      player.y = platYPixels[2] - P_H;
      player.onLadder = false;
      invincibleTimer = 120;
    }
  }
}

function checkLevelComplete() {
  if (levelCompleteTimer > 0) return;
  const allLanded = ingredients.every(ing => ing.landed);
  if (allLanded) {
    levelCompleteTimer = 90;
    addScore(1000 * level);
  }
}

// ── Drawing ──

function drawPlatforms(renderer) {
  for (const py of platYPixels) {
    renderer.setGlow('#4a8a4a', 0.3);
    renderer.fillRect(0, py, W, PLAT_THICKNESS, '#3a6a3a');
    renderer.setGlow(null);

    // Brick details
    for (let bx = 0; bx < W; bx += TILE) {
      renderer.fillRect(bx, py, 1, PLAT_THICKNESS, '#2a5a2a');
    }
    // Top highlight
    renderer.fillRect(0, py, W, 1, '#5aaa5a');
  }
}

function drawLadders(renderer) {
  for (let li = 0; li < LADDER_XS.length; li++) {
    const lx = LADDER_XS[li] * TILE;
    const lw = LADDER_W * TILE;

    for (let fi = 0; fi < NUM_FLOORS - 1; fi++) {
      if (!ladderExists(li, fi)) continue;
      const top = platYPixels[fi];
      const bottom = platYPixels[fi + 1] + PLAT_THICKNESS;
      const lh = bottom - top;

      // Rails
      renderer.fillRect(lx + 2, top, 2, lh, '#5a4a3a');
      renderer.fillRect(lx + lw - 4, top, 2, lh, '#5a4a3a');

      // Rungs
      for (let ry = top + 8; ry < bottom - 4; ry += 10) {
        renderer.fillRect(lx + 4, ry, lw - 8, 2, '#8a7a6a');
      }
    }
  }
}

function drawIngredients(renderer) {
  for (const ing of ingredients) {
    const ix = ing.x;
    const iy = ing.y;
    const iw = ing.w;

    // Drop shadow hint
    if (!ing.landed && !ing.falling) {
      const progress = ing.sectionsWalked / ING_W;
      if (progress > 0) {
        const alpha = Math.floor(progress * 0.15 * 255);
        const alphaHex = alpha.toString(16).padStart(2, '0');
        renderer.fillRect(ix, iy + ING_H + 2, iw, 2, '#ee44aa' + alphaHex);
      }
    }

    switch (ing.type) {
      case 'bunTop': {
        renderer.setGlow('#d4a030', 0.4);
        // Approximate dome with stacked rects
        const cx = ix + iw / 2;
        const halfW = iw / 2 - 2;
        for (let row = 0; row < ING_H; row++) {
          const t = row / ING_H;
          const w = halfW * Math.sqrt(1 - (1 - t) * (1 - t)) * 2;
          renderer.fillRect(cx - w / 2, iy + row, w, 1, '#d4a030');
        }
        renderer.setGlow(null);
        // Sesame seeds
        renderer.fillRect(ix + iw * 0.25, iy + 2, 3, 2, '#f0e0a0');
        renderer.fillRect(ix + iw * 0.5, iy + 1, 3, 2, '#f0e0a0');
        renderer.fillRect(ix + iw * 0.75, iy + 3, 3, 2, '#f0e0a0');
        break;
      }
      case 'lettuce': {
        renderer.setGlow('#30c040', 0.4);
        // Wavy lettuce: alternating tall/short rects
        for (let wx = 0; wx < iw; wx += 6) {
          const tall = (wx % 12 < 6);
          const h = tall ? ING_H - 1 : Math.floor(ING_H * 0.4);
          const y = tall ? iy + 1 : iy + ING_H * 0.6;
          renderer.fillRect(ix + wx, y, 6, h, '#30c040');
        }
        renderer.setGlow(null);
        break;
      }
      case 'patty': {
        renderer.setGlow('#c06020', 0.4);
        renderer.fillRect(ix + 2, iy + 1, iw - 4, ING_H - 2, '#8b4513');
        renderer.setGlow(null);
        // Grill marks
        for (let gx = ix + 8; gx < ix + iw - 8; gx += 14) {
          renderer.fillRect(gx, iy + 3, 8, 1, '#5a2a08');
          renderer.fillRect(gx + 2, iy + 6, 8, 1, '#5a2a08');
        }
        break;
      }
      case 'bunBottom': {
        renderer.setGlow('#c89020', 0.4);
        renderer.fillRect(ix + 2, iy, iw - 4, ING_H, '#c89020');
        renderer.setGlow(null);
        // Bottom curve
        renderer.fillRect(ix + 4, iy + ING_H - 2, iw - 8, 2, '#b08018');
        break;
      }
    }

    // Walk progress overlay
    if (!ing.falling && !ing.landed && ing.sectionsWalked > 0) {
      for (let s = 0; s < ING_W; s++) {
        if (ing.sections[s]) {
          renderer.fillRect(ix + s * TILE, iy, TILE, ING_H, 'rgba(255,255,100,0.25)');
        }
      }
    }

    // Landed glow
    if (ing.landed) {
      renderer.setGlow('#e4a', 0.3);
      // Draw outline using 4 rects
      renderer.fillRect(ix, iy, iw, 1, 'rgba(238,68,170,0.3)');
      renderer.fillRect(ix, iy + ING_H - 1, iw, 1, 'rgba(238,68,170,0.3)');
      renderer.fillRect(ix, iy, 1, ING_H, 'rgba(238,68,170,0.3)');
      renderer.fillRect(ix + iw - 1, iy, 1, ING_H, 'rgba(238,68,170,0.3)');
      renderer.setGlow(null);
    }
  }
}

function drawPlayer(renderer) {
  if (invincibleTimer > 0 && frameCount % 8 < 4) return;

  const px = player.x;
  const py = player.y;

  renderer.setGlow('#e4a', 0.6);

  // Hat
  renderer.fillRect(px, py, P_W, 5, '#fff');
  renderer.fillRect(px + 2, py - 4, P_W - 4, 5, '#fff');

  // Head
  renderer.fillRect(px + 1, py + 5, P_W - 2, 7, '#ffcc88');

  // Eyes
  if (player.dir > 0) {
    renderer.fillRect(px + 7, py + 7, 2, 2, '#222');
    renderer.fillRect(px + 11, py + 7, 2, 2, '#222');
  } else {
    renderer.fillRect(px + 1, py + 7, 2, 2, '#222');
    renderer.fillRect(px + 5, py + 7, 2, 2, '#222');
  }

  // Body (white chef coat)
  renderer.fillRect(px + 1, py + 12, P_W - 2, 9, '#fff');

  // Arms
  const arm = Math.sin(player.frame * 3) * 2;
  renderer.fillRect(px - 3, py + 14 + arm, 4, 5, '#ffcc88');
  renderer.fillRect(px + P_W - 1, py + 14 - arm, 4, 5, '#ffcc88');

  // Legs
  const leg = Math.sin(player.frame * 3) * 2;
  renderer.fillRect(px + 2, py + 21, 4, 7 + leg, '#338');
  renderer.fillRect(px + P_W - 6, py + 21, 4, 7 - leg, '#338');

  renderer.setGlow(null);
}

function drawEnemies(renderer, text) {
  for (const e of enemies) {
    if (!e.alive) continue;

    const ex = e.x, ey = e.y;

    if (e.stunned) {
      // Stun stars
      const starY = ey - 4 + Math.sin(frameCount * 0.3) * 3;
      text.drawText('*  *', ex + e.w / 2, starY - 10, 10, '#ff0', 'center');
    }

    let bodyCol, detailCol;
    switch (e.type) {
      case 'hotdog':  bodyCol = '#d44'; detailCol = '#f88'; break;
      case 'pickle':  bodyCol = '#4a4'; detailCol = '#8d8'; break;
      case 'egg':     bodyCol = '#ee8'; detailCol = '#fff'; break;
    }

    // Stunned enemies: draw dimmer
    if (e.stunned) {
      renderer.setGlow(bodyCol, 0.2);
    } else {
      renderer.setGlow(bodyCol, 0.5);
    }

    // Body (ellipse approximation with a filled circle + rect)
    const bodyCx = ex + e.w / 2;
    const bodyCy = ey + e.h * 0.4;
    const bodyRx = e.w / 2 + 2;
    const bodyRy = e.h * 0.4;
    // Approximate ellipse: draw filled oval using stacked rects
    for (let row = -bodyRy; row <= bodyRy; row++) {
      const t = row / bodyRy;
      const halfW = bodyRx * Math.sqrt(1 - t * t);
      if (halfW > 0) {
        const col = e.stunned ? dimColor(bodyCol) : bodyCol;
        renderer.fillRect(bodyCx - halfW, bodyCy + row, halfW * 2, 1, col);
      }
    }

    // Detail
    if (e.type === 'hotdog') {
      renderer.fillRect(ex + 3, ey + e.h * 0.3, e.w - 6, 2, e.stunned ? dimColor(detailCol) : detailCol);
    } else if (e.type === 'pickle') {
      for (let pi = 0; pi < 3; pi++) {
        renderer.fillRect(ex + 3 + pi * 4, ey + 4 + pi * 3, 2, 2, e.stunned ? dimColor(detailCol) : detailCol);
      }
    } else {
      // Yolk
      const yolkCol = e.stunned ? '#843' : '#f80';
      renderer.fillCircle(ex + e.w / 2, ey + e.h * 0.35, 4, yolkCol);
    }

    // Eyes
    const eyeCol = e.stunned ? '#888' : '#fff';
    renderer.fillRect(ex + 3, ey + 6, 3, 3, eyeCol);
    renderer.fillRect(ex + e.w - 6, ey + 6, 3, 3, eyeCol);
    const pupilCol = e.stunned ? '#444' : '#000';
    const po = e.dir > 0 ? 1 : 0;
    renderer.fillRect(ex + 3 + po, ey + 7, 2, 2, pupilCol);
    renderer.fillRect(ex + e.w - 6 + po, ey + 7, 2, 2, pupilCol);

    // Feet
    const legA = Math.sin(e.frame * 3) * 2;
    const feetCol = e.stunned ? dimColor(bodyCol) : bodyCol;
    renderer.fillRect(ex + 2, ey + e.h - 6, 4, 6 + legA, feetCol);
    renderer.fillRect(ex + e.w - 6, ey + e.h - 6, 4, 6 - legA, feetCol);

    renderer.setGlow(null);
  }
}

function dimColor(hex) {
  // Simple dim: blend toward dark
  // Parse hex color and halve each channel
  if (hex.length === 4) {
    const r = parseInt(hex[1], 16);
    const g = parseInt(hex[2], 16);
    const b = parseInt(hex[3], 16);
    return '#' + Math.floor(r / 2).toString(16) + Math.floor(g / 2).toString(16) + Math.floor(b / 2).toString(16);
  }
  return hex;
}

function drawPepperCloud(renderer, text) {
  if (!pepperCloud) return;

  renderer.setGlow('#ff0', 0.8);

  for (let i = 0; i < 6; i++) {
    const a = frameCount * 0.3 + i * Math.PI / 3;
    const r = 6 + Math.sin(a * 2) * 3;
    renderer.fillCircle(
      pepperCloud.x + Math.cos(a) * r,
      pepperCloud.y + Math.sin(a) * r,
      3,
      'rgba(255,200,50,0.7)'
    );
  }

  renderer.setGlow(null);
  text.drawText('PEPPER!', pepperCloud.x, pepperCloud.y - 22, 9, '#ff0', 'center');
}

function drawHUD(renderer, text) {
  // Lives
  renderer.setGlow('#e4a', 0.4);
  text.drawText('Lives: ' + '\u2665'.repeat(Math.max(0, lives)), 6, H - 18, 13, '#e4a', 'left');

  // Level
  text.drawText('Lv ' + level, W - 6, H - 18, 13, '#e4a', 'right');
  renderer.setGlow(null);

  // Level complete banner
  if (levelCompleteTimer > 0) {
    const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.15);
    const r = Math.floor(238 * pulse);
    const g = Math.floor(68 * pulse);
    const b = Math.floor(170 * pulse);
    const bannerCol = 'rgb(' + r + ',' + g + ',' + b + ')';
    renderer.setGlow('#e4a', 0.8);
    text.drawText('LEVEL COMPLETE!', W / 2, H / 2 - 20, 26, bannerCol, 'center');
    text.drawText('+' + (1000 * level) + ' pts', W / 2, H / 2 + 10, 14, '#aaa', 'center');
    renderer.setGlow(null);
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = parseInt(bestEl.textContent) || 0;
    pepperCount = 5;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    pepperEl.textContent = pepperCount;
    buildLevel();
    game.showOverlay('BURGERTIME', 'Arrows: Move/Climb | Space: Pepper -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    if (levelCompleteTimer > 0) {
      levelCompleteTimer--;
      if (levelCompleteTimer === 0) {
        level++;
        pepperCount = Math.min(pepperCount + 2, 9);
        pepperEl.textContent = pepperCount;
        buildLevel();
      }
      return;
    }

    if (invincibleTimer > 0) invincibleTimer--;

    updatePlayer(input);
    updateIngredients();
    updateEnemies();
    updatePepper();
    checkCollisions(game);
    checkLevelComplete();

    // Pepper throw
    if (input.wasPressed(' ')) {
      throwPepper();
    }
  };

  game.onDraw = (renderer, text) => {
    drawLadders(renderer);
    drawPlatforms(renderer);
    drawIngredients(renderer);
    drawPlayer(renderer);
    drawEnemies(renderer, text);
    drawPepperCloud(renderer, text);
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
