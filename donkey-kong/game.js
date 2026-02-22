// donkey-kong/game.js — Donkey Kong game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// Physics
const GRAVITY = 0.45;
const JUMP_VEL = -8.5;
const MOVE_SPEED = 3;
const CLIMB_SPEED = 2.5;

// Theme
const THEME = '#e82';

// ── State ──
let score, best, level, lives;
let player, gorilla, princess;
let barrels, platforms, ladders;
let barrelTimer, barrelInterval;
let frameCount, animFrame;
let jumpedBarrels;
let reachedTop, levelTransition, deathTimer;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');

// ── Level layout ──

function buildLevel() {
  platforms = [];
  ladders = [];

  const PH = 8;
  const pw = W;

  // Ground platform (level 0) - flat
  platforms.push({ x: 0, y: H - 30, w: pw, h: PH, slope: 0 });
  // Platform 1 - slopes right
  platforms.push({ x: 0, y: H - 120, w: pw, h: PH, slope: 0.04 });
  // Platform 2 - slopes left
  platforms.push({ x: 0, y: H - 210, w: pw, h: PH, slope: -0.04 });
  // Platform 3 - slopes right
  platforms.push({ x: 0, y: H - 300, w: pw, h: PH, slope: 0.04 });
  // Platform 4 - slopes left
  platforms.push({ x: 0, y: H - 390, w: pw, h: PH, slope: -0.04 });
  // Top platform (gorilla + princess) - short
  platforms.push({ x: 60, y: H - 470, w: 200, h: PH, slope: 0 });

  // Ladders connecting platforms
  ladders.push({ x: 400, y: H - 120, h: 90 });
  ladders.push({ x: 120, y: H - 120, h: 90, broken: true, breakGap: 30 });

  ladders.push({ x: 80, y: H - 210, h: 90 });
  ladders.push({ x: 340, y: H - 210, h: 90, broken: true, breakGap: 25 });

  ladders.push({ x: 380, y: H - 300, h: 90 });
  ladders.push({ x: 200, y: H - 300, h: 90, broken: true, breakGap: 30 });

  ladders.push({ x: 100, y: H - 390, h: 90 });
  ladders.push({ x: 320, y: H - 390, h: 90, broken: true, breakGap: 28 });

  ladders.push({ x: 130, y: H - 470, h: 80 });
}

function getPlatformYAt(plat, x) {
  let relX = x - plat.x;
  return plat.y - plat.slope * relX;
}

function resetPlayer() {
  player = {
    x: 40,
    y: H - 30 - 28,
    w: 20,
    h: 28,
    vx: 0,
    vy: 0,
    onGround: true,
    climbing: false,
    facingRight: true,
    walkFrame: 0,
    climbFrame: 0
  };
}

function startLevel() {
  buildLevel();
  resetPlayer();
  barrels = [];
  barrelTimer = 0;
  frameCount = 0;
  jumpedBarrels = new Set();
  reachedTop = false;
  levelTransition = 0;
  deathTimer = 0;
  barrelInterval = Math.max(40, 120 - (level - 1) * 15);
  gorilla = { x: 70, y: H - 470 - 48, w: 50, h: 48, throwAnim: 0 };
  princess = { x: 190, y: H - 470 - 26, w: 20, h: 26 };
}

// ── Helpers ──

function isOnLadder(entity, allowPartial) {
  const eCX = entity.x + entity.w / 2;
  const eBottom = entity.y + entity.h;
  for (let lad of ladders) {
    const ladRight = lad.x + 20;
    const ladBottom = lad.y + lad.h;
    if (eCX > lad.x && eCX < ladRight) {
      if (allowPartial) {
        if (eBottom >= lad.y - 5 && eBottom <= ladBottom + 5) {
          return lad;
        }
      } else {
        if (entity.y + entity.h > lad.y && entity.y < ladBottom) {
          return lad;
        }
      }
    }
  }
  return null;
}

function isOnLadderTop(entity) {
  const eCX = entity.x + entity.w / 2;
  const eBottom = entity.y + entity.h;
  for (let lad of ladders) {
    const ladRight = lad.x + 20;
    if (eCX > lad.x && eCX < ladRight) {
      if (Math.abs(eBottom - lad.y) < 8) {
        return lad;
      }
    }
  }
  return null;
}

function getGroundY(entity) {
  let groundY = null;
  const eCX = entity.x + entity.w / 2;
  const eBottom = entity.y + entity.h;
  for (let plat of platforms) {
    if (eCX >= plat.x && eCX <= plat.x + plat.w) {
      let platYAtX = getPlatformYAt(plat, eCX);
      if (eBottom <= platYAtX + 10 && eBottom >= platYAtX - 20) {
        if (groundY === null || platYAtX < groundY) {
          groundY = platYAtX;
        }
      }
    }
  }
  return groundY;
}

function getStandingPlatformY(entity) {
  const eCX = entity.x + entity.w / 2;
  const eBottom = entity.y + entity.h;
  for (let plat of platforms) {
    if (eCX >= plat.x && eCX <= plat.x + plat.w) {
      let platYAtX = getPlatformYAt(plat, eCX);
      if (eBottom >= platYAtX - 4 && eBottom <= platYAtX + 8) {
        return platYAtX;
      }
    }
  }
  return null;
}

function getLandingPlatform(entity) {
  const eCX = entity.x + entity.w / 2;
  const eBottom = entity.y + entity.h;
  let bestPlat = null;
  let bestDist = Infinity;
  for (let plat of platforms) {
    if (eCX >= plat.x && eCX <= plat.x + plat.w) {
      let platYAtX = getPlatformYAt(plat, eCX);
      let dist = platYAtX - eBottom;
      if (dist >= -4 && dist < bestDist) {
        bestDist = dist;
        bestPlat = plat;
      }
    }
  }
  return bestPlat;
}

function canUseBrokenLadder(lad, entity) {
  let eBottom = entity.y + entity.h;
  let gapStart = lad.y + lad.h * 0.35;
  let gapEnd = lad.y + lad.h * 0.65;
  return eBottom < gapStart || eBottom > gapEnd;
}

function throwBarrel() {
  gorilla.throwAnim = 20;
  let barrel = {
    x: gorilla.x + gorilla.w / 2 - 8,
    y: gorilla.y + gorilla.h - 16,
    w: 16,
    h: 16,
    vx: 1.5 + level * 0.2,
    vy: 0,
    onGround: false,
    rollDir: 1,
    rotation: 0,
    id: frameCount,
    scored: false
  };
  barrels.push(barrel);
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  function die() {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      gameOverFn();
    } else {
      deathTimer = 60;
      resetPlayer();
      barrels = [];
      barrelTimer = 0;
      jumpedBarrels = new Set();
    }
  }

  function gameOverFn() {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
  }

  game.onInit = () => {
    score = 0;
    level = 1;
    lives = 3;
    best = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    livesEl.textContent = '3';
    frameCount = 0;
    animFrame = 0;
    barrelTimer = 0;
    barrelInterval = 120;
    jumpedBarrels = new Set();
    reachedTop = false;
    levelTransition = 0;
    deathTimer = 0;
    buildLevel();
    resetPlayer();
    barrels = [];
    gorilla = { x: 70, y: H - 470 - 48, w: 50, h: 48, throwAnim: 0 };
    princess = { x: 190, y: H - 470 - 26, w: 20, h: 26 };
    game.showOverlay('DONKEY KONG', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        startLevel();
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;
    animFrame++;

    // Death pause
    if (deathTimer > 0) {
      deathTimer--;
      return;
    }

    // Level transition
    if (levelTransition > 0) {
      levelTransition--;
      if (levelTransition === 0) {
        level++;
        levelEl.textContent = level;
        score += 100;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        startLevel();
      }
      return;
    }

    // Barrel throwing
    barrelTimer++;
    if (barrelTimer >= barrelInterval) {
      barrelTimer = 0;
      throwBarrel();
    }

    // Gorilla animation
    if (gorilla.throwAnim > 0) gorilla.throwAnim--;

    // Player movement
    let moving = false;

    if (player.climbing) {
      player.vx = 0;
      player.vy = 0;
      if (input.isDown('ArrowUp')) {
        player.y -= CLIMB_SPEED;
        player.climbFrame += 0.15;
        moving = true;
      }
      if (input.isDown('ArrowDown')) {
        player.y += CLIMB_SPEED;
        player.climbFrame += 0.15;
        moving = true;
      }

      let lad = isOnLadder(player, false);
      if (!lad) {
        player.climbing = false;
        player.vy = 0;
        let platY = getStandingPlatformY(player);
        if (platY !== null) {
          player.y = platY - player.h;
          player.onGround = true;
        }
      }
    } else {
      if (input.isDown('ArrowLeft')) {
        player.vx = -MOVE_SPEED;
        player.facingRight = false;
        moving = true;
      } else if (input.isDown('ArrowRight')) {
        player.vx = MOVE_SPEED;
        player.facingRight = true;
        moving = true;
      } else {
        player.vx = 0;
      }

      // Jumping
      if (input.isDown(' ') && player.onGround && !player.climbing) {
        player.vy = JUMP_VEL;
        player.onGround = false;
      }

      // Climbing up
      if (input.isDown('ArrowUp') && !player.climbing) {
        let lad = isOnLadder(player, true);
        if (lad) {
          if (!lad.broken || canUseBrokenLadder(lad, player)) {
            player.climbing = true;
            player.onGround = false;
            player.vx = 0;
            player.vy = 0;
            player.x = lad.x + 10 - player.w / 2;
          }
        }
      }

      // Climbing down
      if (input.isDown('ArrowDown') && !player.climbing) {
        let lad = isOnLadderTop(player);
        if (lad) {
          if (!lad.broken || canUseBrokenLadder(lad, player)) {
            player.climbing = true;
            player.onGround = false;
            player.vx = 0;
            player.vy = 0;
            player.x = lad.x + 10 - player.w / 2;
          }
        }
      }

      // Apply gravity
      if (!player.onGround) {
        player.vy += GRAVITY;
      }

      // Move player
      player.x += player.vx;
      player.y += player.vy;

      // Walk animation
      if (moving && player.onGround) {
        player.walkFrame += 0.2;
      }

      // Platform collision
      if (player.vy >= 0) {
        let plat = getLandingPlatform(player);
        if (plat) {
          let platYAtX = getPlatformYAt(plat, player.x + player.w / 2);
          if (player.y + player.h >= platYAtX - 2) {
            player.y = platYAtX - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        }
      }

      // Adjust y for slopes when on ground
      if (player.onGround && player.vy === 0) {
        let plat = getLandingPlatform(player);
        if (plat) {
          let platYAtX = getPlatformYAt(plat, player.x + player.w / 2);
          player.y = platYAtX - player.h;
        }
      }
    }

    // Bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > W) player.x = W - player.w;

    // Fall off screen
    if (player.y > H + 50) {
      die();
      return;
    }

    // Update barrels
    for (let i = barrels.length - 1; i >= 0; i--) {
      let b = barrels[i];

      if (!b.onGround) {
        b.vy += GRAVITY;
      }

      b.x += b.vx * b.rollDir;
      b.y += b.vy;
      b.rotation += b.rollDir * 0.15;

      // Barrel platform collision
      let bPlat = getLandingPlatform(b);
      if (bPlat && b.vy >= 0) {
        let platYAtB = getPlatformYAt(bPlat, b.x + b.w / 2);
        if (b.y + b.h >= platYAtB - 2) {
          b.y = platYAtB - b.h;
          b.vy = 0;
          b.onGround = true;
        }
      }

      // Barrel slides along slope when on ground
      if (b.onGround) {
        let bPlat2 = getLandingPlatform(b);
        if (bPlat2) {
          let platYAtB = getPlatformYAt(bPlat2, b.x + b.w / 2);
          b.y = platYAtB - b.h;

          if (bPlat2.slope > 0) b.rollDir = 1;
          else if (bPlat2.slope < 0) b.rollDir = -1;

          let speed = 2 + level * 0.3;
          b.vx = speed;
        }
      }

      // Barrel falls off edges
      if (b.onGround) {
        let nextPlat = getLandingPlatform(b);
        if (!nextPlat) {
          b.onGround = false;
          b.vy = 0;
        }
      }

      // Barrel falls off screen
      if (b.y > H + 50 || b.x < -50 || b.x > W + 50) {
        barrels.splice(i, 1);
        continue;
      }

      // Barrel-player collision
      let dx = (player.x + player.w / 2) - (b.x + b.w / 2);
      let dy = (player.y + player.h / 2) - (b.y + b.h / 2);
      if (Math.abs(dx) < (player.w + b.w) / 2 - 4 && Math.abs(dy) < (player.h + b.h) / 2 - 4) {
        die();
        return;
      }

      // Score for jumping over barrels
      if (!b.scored && player.onGround === false && player.vy < 0) {
        if (Math.abs(player.x - b.x) < 30 && player.y + player.h < b.y + 5) {
          b.scored = true;
          score += 100;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
        }
      }
    }

    // Check if player reached the princess
    let dx = Math.abs((player.x + player.w / 2) - (princess.x + princess.w / 2));
    let dy = Math.abs((player.y + player.h / 2) - (princess.y + princess.h / 2));
    if (dx < 30 && dy < 30) {
      reachedTop = true;
      levelTransition = 90;
      score += 200;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }

    // Update game data for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerVX: player.vx,
      playerVY: player.vy,
      climbing: player.climbing,
      onGround: player.onGround,
      barrels: barrels.map(b => ({ x: b.x, y: b.y, vx: b.vx * b.rollDir, vy: b.vy })),
      level: level,
      lives: lives
    };
  };

  game.onDraw = (renderer, text) => {
    // Draw platforms
    for (let plat of platforms) {
      drawPlatform(renderer, plat);
    }

    // Draw ladders
    for (let lad of ladders) {
      drawLadder(renderer, lad);
    }

    // Draw barrels
    for (let b of barrels) {
      drawBarrel(renderer, b);
    }

    // Draw gorilla
    drawGorilla(renderer, text);

    // Draw princess
    drawPrincess(renderer, text);

    // Draw player
    drawPlayer(renderer);

    // Level transition flash
    if (levelTransition > 0) {
      let alpha = Math.sin(levelTransition * 0.2) * 0.3 + 0.2;
      let r = Math.floor(238 * alpha);
      let g = Math.floor(136 * alpha);
      let b = Math.floor(34 * alpha);
      renderer.fillRect(0, 0, W, H, `rgba(238, 136, 34, ${alpha})`);
      renderer.setGlow(THEME, 0.8);
      text.drawText('LEVEL COMPLETE!', W / 2, H / 2 - 10, 28, THEME, 'center');
      text.drawText('+200 BONUS', W / 2, H / 2 + 20, 16, THEME, 'center');
      renderer.setGlow(null);
    }

    // Death pause indicator
    if (deathTimer > 0) {
      renderer.fillRect(0, 0, W, H, 'rgba(255, 50, 50, 0.5)');
    }
  };

  game.start();
  return game;
}

// ── Drawing functions ──

function drawPlatform(renderer, plat) {
  let leftY = getPlatformYAt(plat, plat.x);
  let rightY = getPlatformYAt(plat, plat.x + plat.w);

  // Steel girder body as polygon
  let points = [
    { x: plat.x, y: leftY },
    { x: plat.x + plat.w, y: rightY },
    { x: plat.x + plat.w, y: rightY + plat.h },
    { x: plat.x, y: leftY + plat.h }
  ];

  renderer.setGlow('#f44', 0.3);
  renderer.fillPoly(points, '#c44');

  // Girder cross pattern
  let step = 20;
  for (let sx = plat.x; sx < plat.x + plat.w; sx += step) {
    let yAtSx = getPlatformYAt(plat, sx);
    let sx2 = Math.min(sx + step, plat.x + plat.w);
    let yAtSx2 = getPlatformYAt(plat, sx2);
    renderer.drawLine(sx, yAtSx, sx2, yAtSx2 + plat.h, '#822', 1);
    renderer.drawLine(sx, yAtSx + plat.h, sx2, yAtSx2, '#822', 1);
  }
  renderer.setGlow(null);
}

function drawLadder(renderer, lad) {
  let lw = 20;
  let x = lad.x;
  let y = lad.y;
  let h = lad.h;

  renderer.setGlow('#6cf', 0.3);

  if (lad.broken) {
    let gapStart = y + h * 0.35;
    let gapEnd = y + h * 0.65;

    // Top section - side rails
    renderer.drawLine(x, y, x, gapStart, '#6cf', 2);
    renderer.drawLine(x + lw, y, x + lw, gapStart, '#6cf', 2);
    // Top section - rungs
    for (let ry = y + 10; ry < gapStart; ry += 15) {
      renderer.drawLine(x, ry, x + lw, ry, '#6cf', 2);
    }

    // Bottom section - side rails
    renderer.drawLine(x, gapEnd, x, y + h, '#6cf', 2);
    renderer.drawLine(x + lw, gapEnd, x + lw, y + h, '#6cf', 2);
    // Bottom section - rungs
    for (let ry = gapEnd + 10; ry < y + h; ry += 15) {
      renderer.drawLine(x, ry, x + lw, ry, '#6cf', 2);
    }
  } else {
    // Full ladder - side rails
    renderer.drawLine(x, y, x, y + h, '#6cf', 2);
    renderer.drawLine(x + lw, y, x + lw, y + h, '#6cf', 2);
    // Rungs
    for (let ry = y + 10; ry < y + h; ry += 15) {
      renderer.drawLine(x, ry, x + lw, ry, '#6cf', 2);
    }
  }

  renderer.setGlow(null);
}

function drawBarrel(renderer, b) {
  // Barrels rotate, but we can't rotate in WebGL renderer easily.
  // Approximate with a filled rect + cross pattern.
  // Use the barrel center position and draw it as a square with stripes.
  let cx = b.x + b.w / 2;
  let cy = b.y + b.h / 2;
  let hw = b.w / 2;
  let hh = b.h / 2;

  // Since we can't rotate in the renderer, draw the barrel as-is with
  // visual indication of rolling via shifting stripe pattern
  renderer.setGlow('#e82', 0.5);
  renderer.fillRect(b.x, b.y, b.w, b.h, '#e82');

  // Stripes: shift based on rotation for rolling effect
  let stripeOffset = (b.rotation * 5) % b.w;
  // Horizontal stripe
  renderer.fillRect(b.x, cy - 2, b.w, 4, '#a52');
  // Vertical stripe (shifted by rotation)
  let vx = cx - 2 + Math.sin(b.rotation) * 4;
  renderer.fillRect(vx, b.y, 4, b.h, '#a52');

  renderer.setGlow(null);
}

function drawGorilla(renderer, text) {
  let g = gorilla;

  renderer.setGlow('#e82', 0.5);

  // Torso
  renderer.fillRect(g.x + 8, g.y + 14, 34, 26, '#a52');

  // Head (circle)
  renderer.fillCircle(g.x + g.w / 2, g.y + 12, 16, '#c64');

  // Face
  renderer.fillCircle(g.x + g.w / 2, g.y + 14, 9, '#e8b');

  // Eyes - white
  renderer.fillRect(g.x + 18, g.y + 8, 5, 5, '#fff');
  renderer.fillRect(g.x + 28, g.y + 8, 5, 5, '#fff');
  // Eyes - pupils
  renderer.fillRect(g.x + 20, g.y + 10, 3, 3, '#000');
  renderer.fillRect(g.x + 30, g.y + 10, 3, 3, '#000');

  // Mouth
  renderer.fillRect(g.x + 20, g.y + 18, 10, 3, '#800');

  // Arms
  if (g.throwAnim > 10) {
    // Arms up (throwing)
    renderer.fillRect(g.x - 2, g.y + 4, 12, 8, '#a52');
    renderer.fillRect(g.x + g.w - 10, g.y + 4, 12, 8, '#a52');
  } else {
    // Arms down
    renderer.fillRect(g.x, g.y + 18, 10, 18, '#a52');
    renderer.fillRect(g.x + g.w - 10, g.y + 18, 10, 18, '#a52');
  }

  // Legs
  renderer.fillRect(g.x + 12, g.y + 38, 10, 10, '#a52');
  renderer.fillRect(g.x + 28, g.y + 38, 10, 10, '#a52');

  renderer.setGlow(null);
}

function drawPrincess(renderer, text) {
  let p = princess;

  renderer.setGlow('#f8d', 0.6);

  // Dress (trapezoid)
  let dressPoints = [
    { x: p.x, y: p.y + p.h },
    { x: p.x + p.w, y: p.y + p.h },
    { x: p.x + p.w - 2, y: p.y + 10 },
    { x: p.x + 2, y: p.y + 10 }
  ];
  renderer.fillPoly(dressPoints, '#f6a');

  // Head
  renderer.fillCircle(p.x + p.w / 2, p.y + 7, 7, '#fc8');

  // Hair (upper hemisphere approximated)
  renderer.fillCircle(p.x + p.w / 2, p.y + 4, 7, '#fd0');
  // Cover lower part of hair circle with face color
  renderer.fillRect(p.x + p.w / 2 - 7, p.y + 5, 14, 6, '#fc8');

  // HELP text (blinks)
  if (Math.sin(frameCount * 0.08) > 0) {
    text.drawText('HELP!', p.x + p.w / 2, p.y - 12, 10, '#fff', 'center');
  }

  renderer.setGlow(null);
}

function drawPlayer(renderer) {
  let p = player;

  renderer.setGlow(THEME, 0.4);

  if (p.climbing) {
    // Climbing pose
    let offset = Math.floor(p.climbFrame) % 2 === 0 ? -2 : 2;

    // Body
    renderer.fillRect(p.x + 4, p.y + 8, 12, 10, '#e22');

    // Head
    renderer.fillCircle(p.x + p.w / 2, p.y + 6, 6, '#fc8');

    // Hat
    renderer.fillRect(p.x + 3, p.y - 1, 14, 5, '#e22');

    // Arms (reaching up alternately)
    renderer.fillRect(p.x + offset, p.y + 4, 6, 4, '#fc8');
    renderer.fillRect(p.x + p.w - 6 - offset, p.y + 10, 6, 4, '#fc8');

    // Legs
    renderer.fillRect(p.x + 4 + offset, p.y + 18, 5, 10, '#22e');
    renderer.fillRect(p.x + 11 - offset, p.y + 18, 5, 10, '#22e');
  } else {
    let dir = p.facingRight ? 1 : -1;
    let cx = p.x + p.w / 2;

    // Legs (walk animation)
    if (p.onGround && Math.abs(p.vx) > 0) {
      let step = Math.sin(p.walkFrame * 3) * 4;
      renderer.fillRect(cx - 7, p.y + 18, 5, 10, '#22e');
      renderer.fillRect(cx + 2, p.y + 18, 5, 10, '#22e');
      if (Math.floor(p.walkFrame) % 2 === 0) {
        renderer.fillRect(cx - 7 + step, p.y + 18, 5, 10, '#22e');
      }
    } else {
      renderer.fillRect(cx - 7, p.y + 18, 5, 10, '#22e');
      renderer.fillRect(cx + 2, p.y + 18, 5, 10, '#22e');
    }

    // Body / shirt
    renderer.fillRect(p.x + 3, p.y + 8, 14, 12, '#e22');

    // Overalls
    renderer.fillRect(p.x + 5, p.y + 12, 10, 8, '#22e');

    // Overall straps
    renderer.fillRect(p.x + 6, p.y + 8, 3, 6, '#22e');
    renderer.fillRect(p.x + 11, p.y + 8, 3, 6, '#22e');

    // Head
    renderer.fillCircle(cx, p.y + 6, 6, '#fc8');

    // Hat
    renderer.fillRect(cx - 8, p.y - 2, 16, 5, '#e22');
    renderer.fillRect(cx + (dir > 0 ? -3 : -8), p.y - 4, 11, 4, '#e22');

    // Hat brim
    renderer.fillRect(cx + (dir > 0 ? 2 : -10), p.y + 1, 8, 2, '#c00');

    // Eye
    renderer.fillRect(cx + (dir > 0 ? 2 : -4), p.y + 4, 2, 2, '#000');

    // Mustache
    renderer.fillRect(cx + (dir > 0 ? 0 : -5), p.y + 8, 5, 2, '#420');

    // Arms
    if (!p.onGround) {
      // Arms up when jumping
      renderer.fillRect(p.x - 2, p.y + 4, 5, 4, '#fc8');
      renderer.fillRect(p.x + p.w - 3, p.y + 4, 5, 4, '#fc8');
    } else {
      renderer.fillRect(p.x - 1, p.y + 10, 4, 6, '#fc8');
      renderer.fillRect(p.x + p.w - 3, p.y + 10, 4, 6, '#fc8');
    }

    // Shoes
    renderer.fillRect(p.x + 2, p.y + 26, 7, 2, '#620');
    renderer.fillRect(p.x + 11, p.y + 26, 7, 2, '#620');
  }

  renderer.setGlow(null);
}
