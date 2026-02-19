// pool-billiards/game.js — WebGL 2 port of pool/billiards
import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 400;

  // Table geometry
  const TABLE_LEFT = 50, TABLE_TOP = 50;
  const TABLE_W = 500, TABLE_H = 300;
  const TABLE_RIGHT = TABLE_LEFT + TABLE_W;
  const TABLE_BOTTOM = TABLE_TOP + TABLE_H;
  const RAIL = 18;
  const PLAY_LEFT = TABLE_LEFT + RAIL;
  const PLAY_TOP = TABLE_TOP + RAIL;
  const PLAY_RIGHT = TABLE_RIGHT - RAIL;
  const PLAY_BOTTOM = TABLE_BOTTOM - RAIL;
  const PLAY_W = PLAY_RIGHT - PLAY_LEFT;
  const PLAY_H = PLAY_BOTTOM - PLAY_TOP;

  const BALL_R = 8;
  const POCKET_R = 15;
  const FRICTION = 0.986;
  const MIN_VEL = 0.06;
  const MAX_POWER = 18;

  // Pocket positions
  const pockets = [
    { x: PLAY_LEFT + 1,                    y: PLAY_TOP + 1 },
    { x: (PLAY_LEFT + PLAY_RIGHT) / 2,     y: PLAY_TOP - 3 },
    { x: PLAY_RIGHT - 1,                   y: PLAY_TOP + 1 },
    { x: PLAY_LEFT + 1,                    y: PLAY_BOTTOM - 1 },
    { x: (PLAY_LEFT + PLAY_RIGHT) / 2,     y: PLAY_BOTTOM + 3 },
    { x: PLAY_RIGHT - 1,                   y: PLAY_BOTTOM - 1 },
  ];

  // Standard ball colors
  const BALL_COLORS = {
    0: '#ffffff',
    1: '#f5d742', 2: '#2255cc', 3: '#dd2222', 4: '#8822bb',
    5: '#ff6600', 6: '#118833', 7: '#882222', 8: '#111111',
    9: '#f5d742', 10: '#2255cc', 11: '#dd2222', 12: '#8822bb',
    13: '#ff6600', 14: '#118833', 15: '#882222',
  };

  // Game state
  let score = 0;
  let balls = [];
  let cueBall = null;
  let currentPlayer = 1;
  let player1Type = null;
  let player2Type = null;
  let player1Score = 0;
  let player2Score = 0;
  let pocketedThisTurn = [];
  let scratchThisTurn = false;
  let ballInHand = false;
  let aiming = false;
  let aimStart = { x: 0, y: 0 };
  let mousePos = { x: 300, y: 200 };
  let shotInProgress = false;
  let firstBallHit = null;
  let foulThisTurn = false;
  let gameOverReason = '';
  let aiThinking = false;
  let breakShot = true;
  let messageTimer = 0;
  let messageText = '';

  // DOM refs
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const turnLabel = document.getElementById('turnLabel');
  const turnInfo  = document.getElementById('turnInfo');
  const ballRackEl = document.getElementById('ballRack');

  // ── Helpers ──

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function createBall(num, x, y) {
    return {
      num, x, y, vx: 0, vy: 0, active: true,
      isStripe: num >= 9 && num <= 15,
      isSolid:  num >= 1 && num <= 7,
      is8Ball:  num === 8,
      isCue:    num === 0,
    };
  }

  function rackBalls() {
    balls = [];
    const cx = PLAY_LEFT + PLAY_W * 0.73;
    const cy = PLAY_TOP + PLAY_H / 2;
    const d  = BALL_R * 2 + 0.8;
    const rackOrder = [1, 9, 2, 10, 8, 3, 11, 14, 6, 13, 4, 12, 7, 15, 5];
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const bx = cx + row * d * 0.866;
        const by = cy + (col - row / 2) * d;
        balls.push(createBall(rackOrder[idx], bx, by));
        idx++;
      }
    }
    cueBall = createBall(0, PLAY_LEFT + PLAY_W * 0.25, cy);
    balls.push(cueBall);
  }

  function showMessage(msg, duration) {
    messageText = msg;
    messageTimer = duration || 90;
  }

  function updateTurnInfo() {
    if (game.state !== 'playing') { turnInfo.textContent = ''; return; }
    const p = currentPlayer === 1 ? 'YOUR' : "CPU's";
    const type = currentPlayer === 1 ? player1Type : player2Type;
    let typeStr = type === 'solids' ? ' [Solids 1-7]'
                : type === 'stripes' ? ' [Stripes 9-15]'
                : ' [Open Table]';
    if (ballInHand && currentPlayer === 1) {
      turnInfo.textContent = p + ' TURN' + typeStr + ' -- Click to place cue ball';
    } else {
      turnInfo.textContent = p + ' TURN' + typeStr;
    }
    turnLabel.textContent = currentPlayer === 1 ? 'YOUR TURN' : 'CPU TURN';
    turnLabel.style.color = currentPlayer === 1 ? '#0a6' : '#f66';
  }

  function updateBallRack() {
    let html = '';
    for (let i = 1; i <= 15; i++) {
      const b = balls.find(b => b.num === i);
      const pocketed = !b || !b.active;
      const col = BALL_COLORS[i];
      const isStripe = i >= 9;
      let style = '';
      if (pocketed) {
        style = 'background:#333;';
      } else if (isStripe) {
        style = `background: linear-gradient(180deg, ${col} 20%, #fff 20%, #fff 80%, ${col} 80%);`;
      } else {
        style = `background:${col};`;
      }
      html += `<div class="ball-indicator${pocketed ? ' pocketed' : ''}" style="${style}">${i}</div>`;
    }
    ballRackEl.innerHTML = html;
  }

  function activeBallsOfType(type) {
    return balls.filter(b => b.active && !b.isCue && (type === 'solids' ? b.isSolid : b.isStripe));
  }

  function allStopped() {
    return balls.every(b => !b.active || (Math.abs(b.vx) < MIN_VEL && Math.abs(b.vy) < MIN_VEL));
  }

  function inPocket(ball) {
    for (const p of pockets) {
      if (dist(ball, p) < POCKET_R) return true;
    }
    return false;
  }

  // ── Physics ──

  function physics() {
    let moving = false;
    const substeps = 2;
    for (let step = 0; step < substeps; step++) {
      for (const b of balls) {
        if (!b.active) continue;
        if (Math.abs(b.vx) < MIN_VEL && Math.abs(b.vy) < MIN_VEL) {
          b.vx = 0; b.vy = 0; continue;
        }
        moving = true;
        b.x += b.vx / substeps;
        b.y += b.vy / substeps;
        b.vx *= Math.pow(FRICTION, 1 / substeps);
        b.vy *= Math.pow(FRICTION, 1 / substeps);

        if (b.x - BALL_R < PLAY_LEFT)  { b.x = PLAY_LEFT  + BALL_R; b.vx =  Math.abs(b.vx) * 0.78; }
        if (b.x + BALL_R > PLAY_RIGHT) { b.x = PLAY_RIGHT - BALL_R; b.vx = -Math.abs(b.vx) * 0.78; }
        if (b.y - BALL_R < PLAY_TOP)   { b.y = PLAY_TOP   + BALL_R; b.vy =  Math.abs(b.vy) * 0.78; }
        if (b.y + BALL_R > PLAY_BOTTOM){ b.y = PLAY_BOTTOM - BALL_R; b.vy = -Math.abs(b.vy) * 0.78; }

        if (inPocket(b)) {
          b.active = false; b.vx = 0; b.vy = 0;
          if (b.isCue) scratchThisTurn = true;
          else pocketedThisTurn.push(b.num);
        }
      }

      // Ball-ball collisions
      for (let i = 0; i < balls.length; i++) {
        if (!balls[i].active) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (!balls[j].active) continue;
          const a = balls[i], b = balls[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          const minD = BALL_R * 2;
          if (d2 < minD * minD && d2 > 0.01) {
            const d = Math.sqrt(d2);
            if (firstBallHit === null) {
              if (a.isCue && !b.isCue) firstBallHit = b.num;
              else if (b.isCue && !a.isCue) firstBallHit = a.num;
            }
            const nx = dx / d, ny = dy / d;
            const overlap = minD - d;
            a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
            b.x += nx * overlap / 2; b.y += ny * overlap / 2;
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
            const dot = dvx * nx + dvy * ny;
            if (dot > 0) {
              a.vx -= dot * nx * 0.96; a.vy -= dot * ny * 0.96;
              b.vx += dot * nx * 0.96; b.vy += dot * ny * 0.96;
            }
          }
        }
      }
    }
    return moving;
  }

  // ── Turn result ──

  function processTurnResult() {
    shotInProgress = false;
    let switchPlayer = false;
    let gameOver = false;
    const pType = currentPlayer === 1 ? player1Type : player2Type;

    if (scratchThisTurn) {
      foulThisTurn = true;
      showMessage('SCRATCH!', 120);
      cueBall.active = true; cueBall.vx = 0; cueBall.vy = 0;
    }

    if (pocketedThisTurn.includes(8)) {
      gameOver = true;
      if (breakShot) {
        gameOverReason = currentPlayer === 1 ? '8-ball pocketed on break! CPU wins!' : '8-ball pocketed on break! You win!';
      } else {
        const remaining = pType ? activeBallsOfType(pType).length : 99;
        if (remaining > 0 || scratchThisTurn) {
          gameOverReason = currentPlayer === 1 ? '8-ball pocketed too early! CPU wins!' : '8-ball pocketed too early! You win!';
        } else {
          if (currentPlayer === 1) { gameOverReason = 'You sank the 8-ball! You win!'; player1Score += 5; }
          else { gameOverReason = 'CPU sank the 8-ball! CPU wins!'; player2Score += 5; }
        }
      }
    }

    if (!gameOver) {
      if (!player1Type && !breakShot && pocketedThisTurn.length > 0) {
        const first = pocketedThisTurn.find(n => n !== 8);
        if (first !== undefined) {
          if (first >= 1 && first <= 7) {
            if (currentPlayer === 1) { player1Type = 'solids'; player2Type = 'stripes'; }
            else { player2Type = 'solids'; player1Type = 'stripes'; }
          } else {
            if (currentPlayer === 1) { player1Type = 'stripes'; player2Type = 'solids'; }
            else { player2Type = 'stripes'; player1Type = 'solids'; }
          }
          showMessage(currentPlayer === 1 ?
            'You are ' + player1Type.toUpperCase() + '!' :
            'CPU is ' + player2Type.toUpperCase() + '!', 120);
        }
      }

      for (const num of pocketedThisTurn) {
        if (num === 8) continue;
        if (currentPlayer === 1) player1Score++;
        else player2Score++;
      }

      if (foulThisTurn) {
        switchPlayer = true;
      } else if (breakShot) {
        switchPlayer = (pocketedThisTurn.length === 0);
      } else if (pocketedThisTurn.length === 0) {
        switchPlayer = true;
      } else if (pType) {
        const hitOwn = pocketedThisTurn.some(n => {
          if (pType === 'solids') return n >= 1 && n <= 7;
          return n >= 9 && n <= 15;
        });
        if (!hitOwn) switchPlayer = true;
      }
    }

    breakShot = false;
    pocketedThisTurn = [];
    scratchThisTurn = false;

    score = player1Score;
    if (scoreEl) scoreEl.textContent = player1Score;
    if (bestEl)  bestEl.textContent  = player2Score;
    updateBallRack();

    if (gameOver) {
      game.setState('over');
      game.showOverlay('GAME OVER', gameOverReason + '\nClick to play again');
      return;
    }

    if (switchPlayer) {
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      if (foulThisTurn) {
        ballInHand = true;
        if (currentPlayer === 2) cueBall.active = false;
      }
      foulThisTurn = false;
    } else {
      foulThisTurn = false;
    }

    updateTurnInfo();

    if (currentPlayer === 2) {
      aiThinking = true;
      setTimeout(() => doAITurn(), 600 + Math.random() * 400);
    }
  }

  // ── AI ──

  function getValidTargets() {
    const p2t = player2Type;
    if (!p2t) return balls.filter(b => b.active && !b.isCue && !b.is8Ball);
    return balls.filter(b => {
      if (!b.active || b.isCue) return false;
      if (p2t === 'solids') {
        return activeBallsOfType('solids').length === 0 ? b.is8Ball : b.isSolid;
      } else {
        return activeBallsOfType('stripes').length === 0 ? b.is8Ball : b.isStripe;
      }
    });
  }

  function isPathClear(x1, y1, x2, y2, excludeNums) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return true;
    const nx = dx / len, ny = dy / len;
    for (const b of balls) {
      if (!b.active || excludeNums.includes(b.num)) continue;
      const t = Math.max(0, Math.min(len, (b.x - x1) * nx + (b.y - y1) * ny));
      const cx = x1 + nx * t, cy = y1 + ny * t;
      if (dist(b, { x: cx, y: cy }) < BALL_R * 2.1) return false;
    }
    return true;
  }

  function findBestAIShot() {
    const targets = getValidTargets();
    let best = null, bestScore = -Infinity;
    for (const target of targets) {
      for (const pocket of pockets) {
        const dx = target.x - pocket.x, dy = target.y - pocket.y;
        const pDist = Math.sqrt(dx * dx + dy * dy);
        if (pDist < 1) continue;
        const ghostX = target.x + (dx / pDist) * BALL_R * 2;
        const ghostY = target.y + (dy / pDist) * BALL_R * 2;
        if (ghostX < PLAY_LEFT + BALL_R || ghostX > PLAY_RIGHT - BALL_R) continue;
        if (ghostY < PLAY_TOP + BALL_R || ghostY > PLAY_BOTTOM - BALL_R) continue;
        if (!isPathClear(cueBall.x, cueBall.y, ghostX, ghostY, [0, target.num])) continue;
        if (!isPathClear(target.x, target.y, pocket.x, pocket.y, [target.num, 0])) continue;
        const shotDx = ghostX - cueBall.x, shotDy = ghostY - cueBall.y;
        const shotDist = Math.sqrt(shotDx * shotDx + shotDy * shotDy);
        const incidence = Math.atan2(target.y - ghostY, target.x - ghostX);
        const pocketAngle = Math.atan2(pocket.y - target.y, pocket.x - target.x);
        let cutAngle = Math.abs(incidence - pocketAngle);
        if (cutAngle > Math.PI) cutAngle = 2 * Math.PI - cutAngle;
        let shotScore = 100;
        shotScore -= shotDist * 0.08;
        shotScore -= pDist * 0.1;
        shotScore -= cutAngle * 25;
        if (cutAngle < 0.25) shotScore += 15;
        if (shotDist > 350) shotScore -= 20;
        shotScore += (Math.random() - 0.5) * 8;
        if (shotScore > bestScore) {
          bestScore = shotScore;
          const power = Math.min(MAX_POWER * 0.85, Math.max(4, shotDist * 0.03 + pDist * 0.02 + 4));
          best = {
            angle: Math.atan2(shotDy, shotDx),
            power: power + (Math.random() - 0.5) * 1.5,
            target, pocket, ghostX, ghostY,
          };
        }
      }
    }
    return best;
  }

  function doAITurn() {
    if (game.state !== 'playing') return;

    if (ballInHand) {
      let bestPos = null, bestEval = -Infinity;
      for (let i = 0; i < 50; i++) {
        const tx = PLAY_LEFT + BALL_R + Math.random() * (PLAY_W - BALL_R * 2);
        const ty = PLAY_TOP + BALL_R + Math.random() * (PLAY_H - BALL_R * 2);
        let overlap = false;
        for (const b of balls) {
          if (!b.active || b.isCue) continue;
          if (dist({ x: tx, y: ty }, b) < BALL_R * 2.5) { overlap = true; break; }
        }
        if (overlap) continue;
        const oldX = cueBall.x, oldY = cueBall.y;
        cueBall.x = tx; cueBall.y = ty;
        const testShot = findBestAIShot();
        cueBall.x = oldX; cueBall.y = oldY;
        const ev = testShot ? 50 + (100 - Math.abs(testShot.power - 8) * 2) : 0;
        if (ev > bestEval) { bestEval = ev; bestPos = { x: tx, y: ty }; }
      }
      if (bestPos) { cueBall.x = bestPos.x; cueBall.y = bestPos.y; }
      else { cueBall.x = PLAY_LEFT + PLAY_W * 0.25; cueBall.y = PLAY_TOP + PLAY_H / 2; }
      cueBall.active = true;
      ballInHand = false;
    }

    const shot = findBestAIShot();
    const delay = 500 + Math.random() * 400;

    if (shot) {
      setTimeout(() => {
        if (game.state !== 'playing') return;
        cueBall.vx = Math.cos(shot.angle) * shot.power;
        cueBall.vy = Math.sin(shot.angle) * shot.power;
        shotInProgress = true;
        firstBallHit = null;
        pocketedThisTurn = [];
        scratchThisTurn = false;
        foulThisTurn = false;
        aiThinking = false;
      }, delay);
    } else {
      const targets = getValidTargets();
      setTimeout(() => {
        if (game.state !== 'playing') return;
        let angle, power;
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          angle = Math.atan2(t.y - cueBall.y, t.x - cueBall.x);
          power = 4 + Math.random() * 4;
        } else {
          angle = Math.random() * Math.PI * 2;
          power = 4 + Math.random() * 4;
        }
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
        shotInProgress = true;
        firstBallHit = null;
        pocketedThisTurn = [];
        scratchThisTurn = false;
        foulThisTurn = false;
        aiThinking = false;
      }, delay);
    }
  }

  // ── Colour helpers ──

  function lighten(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16) + amt;
    let g = parseInt(hex.slice(3, 5), 16) + amt;
    let b = parseInt(hex.slice(5, 7), 16) + amt;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Convert rgb(r,g,b) string (returned by lighten or raw) to #rrggbbaa
  function toHexAlpha(colorStr, alpha) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    const hex = colorStr.startsWith('#') ? colorStr : colorStr;
    return hex + a.toString(16).padStart(2, '0');
  }

  // rgba(r,g,b,a) string → #rrggbbaa
  function rgbaToHex(r, g, b, a = 1) {
    const toH = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    const ah  = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
    return '#' + toH(r) + toH(g) + toH(b) + ah;
  }

  // ── Drawing ──

  function drawTable(renderer) {
    // Outer wood border
    const bdr = 12;
    renderer.fillRect(TABLE_LEFT - bdr, TABLE_TOP - bdr, TABLE_W + bdr * 2, TABLE_H + bdr * 2, '#4a2808');
    renderer.fillRect(TABLE_LEFT - bdr + 2, TABLE_TOP - bdr + 2, TABLE_W + bdr * 2 - 4, TABLE_H + bdr * 2 - 4, '#5c3410');
    renderer.fillRect(TABLE_LEFT - 2, TABLE_TOP - 2, TABLE_W + 4, TABLE_H + 4, '#6b3d15');

    // Rail surface
    renderer.fillRect(TABLE_LEFT, TABLE_TOP, TABLE_W, TABLE_H, '#0a5535');

    // Playing felt
    renderer.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_W, PLAY_H, '#0c8855');

    // Head string (dashed vertical line at 25%)
    const headX = PLAY_LEFT + PLAY_W * 0.25;
    renderer.dashedLine(headX, PLAY_TOP, headX, PLAY_BOTTOM, '#ffffff09', 1, 3, 5);

    // Foot spot
    renderer.fillCircle(PLAY_LEFT + PLAY_W * 0.73, PLAY_TOP + PLAY_H / 2, 2.5, '#ffffff1a');

    // Pockets — hole + rim
    for (const p of pockets) {
      renderer.setGlow('#000000', 0.4);
      renderer.fillCircle(p.x, p.y, POCKET_R, '#0a0a0a');
      renderer.setGlow(null);
      // Rim as a stroked circle outline (thick ring via two circles)
      renderer.fillCircle(p.x, p.y, POCKET_R + 2, '#3a201080');
    }

    // Cushion edge highlight
    renderer.drawLine(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT, PLAY_TOP, '#0a7040', 1.5);
    renderer.drawLine(PLAY_RIGHT, PLAY_TOP, PLAY_RIGHT, PLAY_BOTTOM, '#0a7040', 1.5);
    renderer.drawLine(PLAY_RIGHT, PLAY_BOTTOM, PLAY_LEFT, PLAY_BOTTOM, '#0a7040', 1.5);
    renderer.drawLine(PLAY_LEFT, PLAY_BOTTOM, PLAY_LEFT, PLAY_TOP, '#0a7040', 1.5);

    // Diamond sights
    const diamondColor = '#c8a050';
    for (let i = 1; i <= 3; i++) {
      const dx = PLAY_LEFT + (PLAY_W / 4) * i;
      drawDiamond(renderer, dx, TABLE_TOP + RAIL / 2, 2.5, diamondColor);
      drawDiamond(renderer, dx, TABLE_BOTTOM - RAIL / 2, 2.5, diamondColor);
    }
    for (let i = 1; i <= 2; i++) {
      const dy = PLAY_TOP + (PLAY_H / 3) * i;
      drawDiamond(renderer, TABLE_LEFT + RAIL / 2, dy, 2.5, diamondColor);
      drawDiamond(renderer, TABLE_RIGHT - RAIL / 2, dy, 2.5, diamondColor);
    }
  }

  function drawDiamond(renderer, x, y, s, color) {
    renderer.fillPoly([
      { x: x,     y: y - s },
      { x: x + s, y: y },
      { x: x,     y: y + s },
      { x: x - s, y: y },
    ], color);
  }

  function drawBall(renderer, text, ball) {
    if (!ball.active) return;
    const { x, y, num } = ball;
    const color = BALL_COLORS[num];

    if (ball.isCue) {
      // White cue ball with subtle radial gradient effect — use two circles
      renderer.setGlow('#ffffff', 0.3);
      renderer.fillCircle(x, y, BALL_R, '#cccccc');
      renderer.fillCircle(x - 2, y - 2, BALL_R * 0.55, '#ffffff');
      renderer.setGlow(null);
    } else if (ball.is8Ball) {
      renderer.setGlow('#222222', 0.3);
      renderer.fillCircle(x, y, BALL_R, '#111111');
      renderer.fillCircle(x - 2, y - 2, BALL_R * 0.55, '#444444');
      renderer.setGlow(null);
    } else if (ball.isStripe) {
      // White base
      renderer.fillCircle(x, y, BALL_R, '#dddddd');
      // Coloured band clipped to ball — approximate with a narrow fillRect
      // since we have no clipping. Draw a rect covering the middle third.
      const bw = BALL_R * 1.1;
      renderer.fillRect(x - BALL_R, y - bw / 2, BALL_R * 2, bw, color);
      // Redraw the top/bottom white caps to clip the band visually
      renderer.fillCircle(x, y - BALL_R * 0.72, BALL_R * 0.72, '#dddddd');
      renderer.fillCircle(x, y + BALL_R * 0.72, BALL_R * 0.72, '#dddddd');
    } else {
      // Solid coloured ball
      renderer.setGlow(color, 0.25);
      renderer.fillCircle(x, y, BALL_R, color);
      renderer.fillCircle(x - 2, y - 2, BALL_R * 0.5, lighten(color, 50));
      renderer.setGlow(null);
    }

    // Number circle (except cue)
    if (!ball.isCue) {
      renderer.fillCircle(x, y, BALL_R * 0.42, '#ffffff');
      text.drawText(String(num), x, y - BALL_R * 0.33, BALL_R * 0.7, '#111111', 'center');
    }

    // Gloss highlight
    renderer.fillCircle(x - BALL_R * 0.3, y - BALL_R * 0.3, BALL_R * 0.28, '#ffffff38');
  }

  function drawAimGuide(renderer) {
    if (!cueBall || !cueBall.active || shotInProgress || aiThinking || currentPlayer === 2 || ballInHand) return;

    const angle = Math.atan2(cueBall.y - mousePos.y, cueBall.x - mousePos.x);
    const dirX = Math.cos(angle), dirY = Math.sin(angle);

    // Find first ball hit
    let hitBall = null, hitDist = Infinity;
    for (const b of balls) {
      if (!b.active || b.isCue) continue;
      const ocx = b.x - cueBall.x, ocy = b.y - cueBall.y;
      const proj = ocx * dirX + ocy * dirY;
      if (proj < BALL_R) continue;
      const perpSq = (ocx * ocx + ocy * ocy) - proj * proj;
      const minD = BALL_R * 2;
      if (perpSq < minD * minD) {
        const t = proj - Math.sqrt(minD * minD - perpSq);
        if (t > 0 && t < hitDist) { hitDist = t; hitBall = b; }
      }
    }

    // Cushion distance
    let cushionDist = Infinity;
    if (dirX > 0) cushionDist = Math.min(cushionDist, (PLAY_RIGHT  - BALL_R - cueBall.x) / dirX);
    if (dirX < 0) cushionDist = Math.min(cushionDist, (PLAY_LEFT   + BALL_R - cueBall.x) / dirX);
    if (dirY > 0) cushionDist = Math.min(cushionDist, (PLAY_BOTTOM - BALL_R - cueBall.y) / dirY);
    if (dirY < 0) cushionDist = Math.min(cushionDist, (PLAY_TOP    + BALL_R - cueBall.y) / dirY);

    const guideDist = hitBall ? hitDist : Math.min(cushionDist, 300);

    // Aim line (dashed)
    renderer.dashedLine(
      cueBall.x, cueBall.y,
      cueBall.x + dirX * guideDist, cueBall.y + dirY * guideDist,
      '#00aa6659', 1, 4, 4
    );

    if (hitBall) {
      const contactX = cueBall.x + dirX * hitDist;
      const contactY = cueBall.y + dirY * hitDist;

      // Ghost cue ball outline — use four-segment strokePoly approximation
      renderer.strokePoly(circlePoints(contactX, contactY, BALL_R, 16), '#ffffff40', 1, true);

      // Predicted object ball path (dashed)
      const hitAngle = Math.atan2(hitBall.y - contactY, hitBall.x - contactX);
      renderer.dashedLine(
        hitBall.x, hitBall.y,
        hitBall.x + Math.cos(hitAngle) * 100, hitBall.y + Math.sin(hitAngle) * 100,
        '#ffc83259', 1, 3, 3
      );

      // Target ball ring
      renderer.strokePoly(circlePoints(hitBall.x, hitBall.y, BALL_R + 2, 16), '#00aa664d', 1.5, true);
    }
  }

  function circlePoints(cx, cy, r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  function drawCueStick(renderer) {
    if (!cueBall || !cueBall.active || shotInProgress || aiThinking || currentPlayer === 2 || ballInHand) return;

    const angle = Math.atan2(cueBall.y - mousePos.y, cueBall.x - mousePos.x);
    let pullBack = 0, power = 0;

    if (aiming) {
      const dx = aimStart.x - mousePos.x, dy = aimStart.y - mousePos.y;
      const pullDist = Math.sqrt(dx * dx + dy * dy);
      power = Math.min(MAX_POWER, pullDist * 0.12);
      pullBack = Math.min(70, pullDist * 0.4);
    }

    const gapFromBall = BALL_R + 4 + pullBack;
    const stickLen = 150;
    const sx = cueBall.x - Math.cos(angle) * gapFromBall;
    const sy = cueBall.y - Math.sin(angle) * gapFromBall;
    const ex = sx - Math.cos(angle) * stickLen;
    const ey = sy - Math.sin(angle) * stickLen;

    // Shadow
    renderer.drawLine(sx + 2, sy + 2, ex + 2, ey + 2, '#00000040', 6);

    // Butt
    const midX = sx - Math.cos(angle) * 50;
    const midY = sy - Math.sin(angle) * 50;
    renderer.drawLine(midX, midY, ex, ey, '#6b4020', 6);

    // Shaft
    renderer.drawLine(sx, sy, midX, midY, '#c8a050', 5);

    // Ferrule
    const ferrX = sx + Math.cos(angle) * 4;
    const ferrY = sy + Math.sin(angle) * 4;
    renderer.drawLine(sx, sy, ferrX, ferrY, '#f0ece0', 4);

    // Tip
    renderer.fillCircle(sx + Math.cos(angle) * 2, sy + Math.sin(angle) * 2, 2.5, '#4a90cc');

    // Power meter
    if (aiming && power > 0) {
      const meterX = 18, meterY = TABLE_TOP + 5;
      const meterW = 10, meterH = TABLE_H - 10;
      const pct = power / MAX_POWER;

      renderer.fillRect(meterX - 1, meterY - 1, meterW + 2, meterH + 2, '#1a1a2e');
      renderer.fillRect(meterX, meterY, meterW, meterH, '#222222');

      const pColor = pct < 0.4 ? '#00aa66' : pct < 0.7 ? '#ffaa00' : '#ff3333';
      const fillH = meterH * pct;
      renderer.setGlow(pColor, 0.5);
      renderer.fillRect(meterX, meterY + meterH - fillH, meterW, fillH, pColor);
      renderer.setGlow(null);

      renderer.drawLine(meterX, meterY, meterX + meterW, meterY, '#444444', 1);
      renderer.drawLine(meterX + meterW, meterY, meterX + meterW, meterY + meterH, '#444444', 1);
      renderer.drawLine(meterX + meterW, meterY + meterH, meterX, meterY + meterH, '#444444', 1);
      renderer.drawLine(meterX, meterY + meterH, meterX, meterY, '#444444', 1);
    }
  }

  function drawMessage(renderer, text) {
    if (messageTimer <= 0) return;
    messageTimer--;
    const alpha = Math.min(1, messageTimer / 20);
    const col = rgbaToHex(0, 170, 102, alpha);
    renderer.setGlow('#00aa66', 0.6 * alpha);
    text.drawText(messageText, W / 2, TABLE_TOP - 22, 18, col, 'center');
    renderer.setGlow(null);
  }

  // ── Init ──

  function initGame() {
    rackBalls();
    currentPlayer = 1;
    player1Type = null;
    player2Type = null;
    player1Score = 0;
    player2Score = 0;
    score = 0;
    ballInHand = false;
    aiming = false;
    shotInProgress = false;
    firstBallHit = null;
    foulThisTurn = false;
    pocketedThisTurn = [];
    scratchThisTurn = false;
    gameOverReason = '';
    aiThinking = false;
    breakShot = true;
    messageTimer = 0;
    messageText = '';
    if (scoreEl) scoreEl.textContent = '0';
    if (bestEl)  bestEl.textContent  = '0';
    if (turnLabel) { turnLabel.textContent = '8-BALL'; turnLabel.style.color = '#0a6'; }
    updateTurnInfo();
    updateBallRack();
  }

  // ── Engine callbacks ──

  game.onInit = () => {
    initGame();
    game.showOverlay('8-BALL POOL', 'Click to break');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state === 'playing' && shotInProgress) {
      const moving = physics();
      if (!moving) {
        processTurnResult();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    drawTable(renderer);

    // Object balls
    for (const b of balls) {
      if (!b.isCue) drawBall(renderer, text, b);
    }
    // Cue ball on top
    if (cueBall && cueBall.active) drawBall(renderer, text, cueBall);

    if (game.state === 'playing') {
      if (ballInHand && currentPlayer === 1 && !shotInProgress) {
        // Ghost cue ball at mouse
        const mx = Math.max(PLAY_LEFT + BALL_R, Math.min(PLAY_RIGHT - BALL_R, mousePos.x));
        const my = Math.max(PLAY_TOP  + BALL_R, Math.min(PLAY_BOTTOM - BALL_R, mousePos.y));
        renderer.strokePoly(circlePoints(mx, my, BALL_R, 16), '#ffffff66', 1.5, true);
        renderer.fillCircle(mx, my, BALL_R, '#ffffff33');
      } else {
        drawAimGuide(renderer);
        drawCueStick(renderer);
      }
    }

    // AI thinking indicator
    if (aiThinking) {
      const dots = '.'.repeat(Math.floor(Date.now() / 300) % 4);
      renderer.setGlow('#ff6666', 0.5);
      text.drawText('CPU thinking' + dots, W / 2, H - 14, 13, '#ff6666', 'center');
      renderer.setGlow(null);
    }

    drawMessage(renderer, text);

    // Player type indicators
    if (player1Type) {
      const p1Rem = activeBallsOfType(player1Type).length;
      const p2Rem = activeBallsOfType(player2Type).length;
      renderer.setGlow('#00aa66', 0.4);
      text.drawText('YOU: ' + player1Type.toUpperCase() + ' (' + p1Rem + ' left)',
        TABLE_LEFT, H - 10, 9, '#00aa66', 'left');
      renderer.setGlow('#ff6666', 0.4);
      text.drawText('CPU: ' + player2Type.toUpperCase() + ' (' + p2Rem + ' left)',
        TABLE_RIGHT, H - 10, 9, '#ff6666', 'right');
      renderer.setGlow(null);
    }
  };

  // ── Mouse input (direct canvas listeners) ──

  const canvas = game.canvas;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (W / rect.width);
    mousePos.y = (e.clientY - rect.top)  * (H / rect.height);
  });

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
      updateTurnInfo();
      return;
    }
    if (game.state === 'over') {
      initGame();
      game.showOverlay('8-BALL POOL', 'Click to break');
      game.setState('waiting');
      return;
    }
    if (game.state !== 'playing' || currentPlayer !== 1 || shotInProgress || aiThinking) return;

    if (ballInHand) {
      const px = Math.max(PLAY_LEFT + BALL_R, Math.min(PLAY_RIGHT - BALL_R, mx));
      const py = Math.max(PLAY_TOP  + BALL_R, Math.min(PLAY_BOTTOM - BALL_R, my));
      let ok = true;
      for (const b of balls) {
        if (!b.active || b.isCue) continue;
        if (dist({ x: px, y: py }, b) < BALL_R * 2.5) { ok = false; break; }
      }
      if (ok) {
        cueBall.x = px; cueBall.y = py;
        cueBall.active = true;
        ballInHand = false;
        updateTurnInfo();
      }
      return;
    }

    if (!cueBall.active) return;
    aiming = true;
    aimStart.x = mx;
    aimStart.y = my;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!aiming || currentPlayer !== 1) { aiming = false; return; }

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    const dx = aimStart.x - mx, dy = aimStart.y - my;
    const pullDist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(MAX_POWER, pullDist * 0.12);

    aiming = false;
    if (power < 0.5) return;

    const angle = Math.atan2(cueBall.y - mousePos.y, cueBall.x - mousePos.x);
    cueBall.vx = Math.cos(angle) * power;
    cueBall.vy = Math.sin(angle) * power;

    shotInProgress = true;
    firstBallHit = null;
    pocketedThisTurn = [];
    scratchThisTurn = false;
    foulThisTurn = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.start();
  return game;
}
