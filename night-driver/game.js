// night-driver/game.js — Night Driver game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// Road parameters
const HORIZON_Y = 120;
const ROAD_BOTTOM_Y = H - 80;
const DASH_Y = H - 80;
const VANISH_X = W / 2;
const NUM_SEGMENTS = 200;
const DRAW_DISTANCE = 120;
const SEGMENT_LENGTH = 5;
const ROAD_HALF_WIDTH = 300;

// Marker posts
const MARKER_SPACING = 8;
const MARKER_HEIGHT_BASE = 16;

// Speed / difficulty
const MIN_SPEED = 0;
const MAX_SPEED = 12;
const ACCEL = 0.08;
const BRAKE = 0.15;
const FRICTION = 0.02;
const STEER_SPEED = 0.045;
const STEER_RETURN = 0.03;
const MAX_STEER = 1.0;

// ── State ──
let playerX, playerSpeed, position, steerAngle;
let roadSegments;
let oncomingCars, nextCarSpawn;
let score, best;
let distanceTraveled, frameCount;
let crashTimer;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// Generate road segments with smooth curves
function generateRoad() {
  roadSegments = [];
  let curvature = 0;
  let curveTarget = 0;
  let curveChangeTimer = 0;
  const baseDifficulty = 0.003;

  for (let i = 0; i < NUM_SEGMENTS * 3; i++) {
    curveChangeTimer--;
    if (curveChangeTimer <= 0) {
      const difficultyScale = Math.min(1 + (i / NUM_SEGMENTS) * 0.5, 3.0);
      const maxCurve = baseDifficulty * difficultyScale;
      curveTarget = (Math.random() - 0.5) * 2 * maxCurve;
      curveChangeTimer = 30 + Math.floor(Math.random() * 60);
    }
    curvature += (curveTarget - curvature) * 0.02;
    roadSegments.push(curvature);
  }
}

function spawnOncomingCar(segmentAhead) {
  const lane = (Math.random() < 0.5) ? -0.4 : -0.6;
  oncomingCars.push({
    segmentPos: Math.floor(position / SEGMENT_LENGTH) + segmentAhead,
    lane: lane,
    speed: 3 + Math.random() * 4,
    headlightPhase: Math.random() * Math.PI * 2
  });
}

// Precompute star positions (deterministic)
const stars = [];
const starSeed = 42;
for (let i = 0; i < 40; i++) {
  stars.push({
    x: ((i * 137 + starSeed * 31) % W),
    y: ((i * 97 + starSeed * 17) % HORIZON_Y),
    brightness: 0.3 + (i % 5) * 0.15
  });
}

export function createGame() {
  const game = new Game('game');
  best = 0;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    playerX = 0;
    playerSpeed = 0;
    position = 0;
    steerAngle = 0;
    distanceTraveled = 0;
    frameCount = 0;
    crashTimer = 0;
    oncomingCars = [];
    nextCarSpawn = 60 + Math.floor(Math.random() * 120);
    generateRoad();

    game.showOverlay('NIGHT DRIVER', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
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

    // Steering
    if (input.isDown('ArrowLeft')) {
      steerAngle -= STEER_SPEED;
      if (steerAngle < -MAX_STEER) steerAngle = -MAX_STEER;
    } else if (input.isDown('ArrowRight')) {
      steerAngle += STEER_SPEED;
      if (steerAngle > MAX_STEER) steerAngle = MAX_STEER;
    } else {
      if (steerAngle > STEER_RETURN) steerAngle -= STEER_RETURN;
      else if (steerAngle < -STEER_RETURN) steerAngle += STEER_RETURN;
      else steerAngle = 0;
    }

    // Acceleration / braking
    if (input.isDown('ArrowUp')) {
      playerSpeed += ACCEL;
      if (playerSpeed > MAX_SPEED) playerSpeed = MAX_SPEED;
    } else if (input.isDown('ArrowDown')) {
      playerSpeed -= BRAKE;
      if (playerSpeed < MIN_SPEED) playerSpeed = MIN_SPEED;
    } else {
      playerSpeed -= FRICTION;
      if (playerSpeed < MIN_SPEED) playerSpeed = MIN_SPEED;
    }

    // Current road curvature
    const currentSegIndex = Math.floor(position / SEGMENT_LENGTH);
    const curvature = roadSegments[currentSegIndex % roadSegments.length] || 0;

    // Move player laterally
    playerX += steerAngle * playerSpeed * 0.015;
    playerX += curvature * playerSpeed * 80;

    // Move forward
    position += playerSpeed;
    distanceTraveled += playerSpeed;

    // Scoring
    if (frameCount % 6 === 0 && playerSpeed > 1) {
      const speedBonus = Math.floor(playerSpeed);
      score += speedBonus;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }

    // Off-road check
    const offRoadThreshold = 1.05;
    if (Math.abs(playerX) > offRoadThreshold) {
      crashTimer++;
      if (crashTimer > 10) {
        doGameOver();
        return;
      }
      playerSpeed *= 0.95;
      playerX = Math.sign(playerX) * Math.min(Math.abs(playerX), 1.3);
    } else {
      crashTimer = 0;
    }

    // Spawn oncoming cars
    nextCarSpawn--;
    if (nextCarSpawn <= 0) {
      const spawnDist = DRAW_DISTANCE - 10 + Math.floor(Math.random() * 20);
      spawnOncomingCar(spawnDist);
      const minSpawn = Math.max(30, 100 - Math.floor(distanceTraveled / 500));
      nextCarSpawn = minSpawn + Math.floor(Math.random() * minSpawn);
    }

    // Update oncoming cars
    const curSeg = Math.floor(position / SEGMENT_LENGTH);
    for (let i = oncomingCars.length - 1; i >= 0; i--) {
      const car = oncomingCars[i];
      car.segmentPos -= car.speed / SEGMENT_LENGTH;

      if (car.segmentPos < curSeg - 5) {
        oncomingCars.splice(i, 1);
        continue;
      }

      // Collision
      const relSegment = car.segmentPos - curSeg;
      if (relSegment >= -1 && relSegment <= 1) {
        const carLateralDist = Math.abs(playerX - car.lane);
        if (carLateralDist < 0.3) {
          doGameOver();
          return;
        }
      }
    }

    // Expose game state for ML
    window.gameData = {
      playerX, speed: playerSpeed, steer: steerAngle,
      curvature, score, position
    };
  };

  function doGameOver() {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    const currentSegIdx = Math.floor((position || 0) / SEGMENT_LENGTH);

    // Night background (fill entire canvas first)
    renderer.fillRect(0, 0, W, H, '#0a0a12');

    // Sky
    renderer.fillRect(0, 0, W, HORIZON_Y, '#334');

    // Stars
    for (const star of stars) {
      const a = Math.floor(star.brightness * 255);
      const hex = a.toString(16).padStart(2, '0');
      renderer.fillRect(star.x, star.y, 1, 1, `#ffffff${hex}`);
    }

    // Horizon glow — approximate gradient with layered translucent rects
    renderer.fillRect(0, HORIZON_Y - 15, W, 10, '#cc44aa08');
    renderer.fillRect(0, HORIZON_Y - 8, W, 8, '#cc44aa0d');
    renderer.fillRect(0, HORIZON_Y - 3, W, 6, '#cc44aa08');

    // Build projected road points
    const leftPoints = [];
    const rightPoints = [];
    const centerPoints = [];
    const segFraction = ((position || 0) % SEGMENT_LENGTH) / SEGMENT_LENGTH;

    for (let i = 1; i <= DRAW_DISTANCE; i++) {
      const segIdx = currentSegIdx + i;
      const relSeg = i - segFraction;
      if (relSeg <= 0) continue;

      // Accumulate curve offset
      let horizOffset = 0;
      for (let j = currentSegIdx; j < segIdx; j++) {
        const c = roadSegments[j % roadSegments.length] || 0;
        horizOffset += c * (segIdx - j) * 1.5;
      }

      // Perspective
      const perspScale = 1 / (relSeg * 0.04 + 0.1);
      const screenY = HORIZON_Y + (ROAD_BOTTOM_Y - HORIZON_Y) * (1 - 1 / (1 + relSeg * 0.06));

      const roadCenterX = VANISH_X + horizOffset * 800 * perspScale - (playerX || 0) * perspScale * 60;
      const halfWidth = ROAD_HALF_WIDTH * perspScale * 0.015;

      leftPoints.push({ x: roadCenterX - halfWidth, y: screenY, seg: segIdx, perspScale });
      rightPoints.push({ x: roadCenterX + halfWidth, y: screenY, seg: segIdx, perspScale });
      centerPoints.push({ x: roadCenterX, y: screenY, seg: segIdx, perspScale, halfWidth });
    }

    // Draw road surface as filled polygon
    if (leftPoints.length > 1 && rightPoints.length > 1) {
      const polyPts = [];
      for (let i = 0; i < leftPoints.length; i++) {
        polyPts.push({ x: leftPoints[i].x, y: leftPoints[i].y });
      }
      for (let i = rightPoints.length - 1; i >= 0; i--) {
        polyPts.push({ x: rightPoints[i].x, y: rightPoints[i].y });
      }
      renderer.fillPoly(polyPts, '#111118');
    }

    // Center dashed line — draw segments manually
    for (let i = 0; i < centerPoints.length - 1; i++) {
      const seg = centerPoints[i].seg;
      if (Math.floor(seg / 4) % 2 === 0) {
        const lineWidth = Math.max(0.5, centerPoints[i].perspScale * 0.3);
        renderer.drawLine(
          centerPoints[i].x, centerPoints[i].y,
          centerPoints[i + 1].x, centerPoints[i + 1].y,
          '#ffff644d', lineWidth
        );
      }
    }

    // Road edge markers (posts)
    for (let i = 0; i < leftPoints.length; i++) {
      const segIdx = leftPoints[i].seg;
      if (segIdx % MARKER_SPACING !== 0) continue;

      const lp = leftPoints[i];
      const rp = rightPoints[i];
      const ps = lp.perspScale;
      const markerH = Math.max(1, MARKER_HEIGHT_BASE * ps * 0.02);
      const markerW = Math.max(1, 4 * ps * 0.015);
      const glowAmt = Math.min(0.8, ps * 0.1);

      // Left marker
      if (lp.y > HORIZON_Y && lp.y < ROAD_BOTTOM_Y) {
        renderer.setGlow('#fff', glowAmt);
        renderer.fillRect(lp.x - markerW / 2, lp.y - markerH, markerW, markerH, '#fff');
      }

      // Right marker
      if (rp.y > HORIZON_Y && rp.y < ROAD_BOTTOM_Y) {
        renderer.setGlow('#fff', glowAmt);
        renderer.fillRect(rp.x - markerW / 2, rp.y - markerH, markerW, markerH, '#fff');
      }
    }
    renderer.setGlow(null);

    // Road edge lines (connecting markers)
    if (leftPoints.length > 1) {
      for (let i = 0; i < leftPoints.length - 1; i++) {
        if (leftPoints[i].y > HORIZON_Y && leftPoints[i + 1].y > HORIZON_Y) {
          renderer.drawLine(
            leftPoints[i].x, leftPoints[i].y,
            leftPoints[i + 1].x, leftPoints[i + 1].y,
            '#ffffff26', 1
          );
        }
      }
      for (let i = 0; i < rightPoints.length - 1; i++) {
        if (rightPoints[i].y > HORIZON_Y && rightPoints[i + 1].y > HORIZON_Y) {
          renderer.drawLine(
            rightPoints[i].x, rightPoints[i].y,
            rightPoints[i + 1].x, rightPoints[i + 1].y,
            '#ffffff26', 1
          );
        }
      }
    }

    // Oncoming cars (headlights)
    for (const car of oncomingCars) {
      const relSeg = car.segmentPos - currentSegIdx;
      if (relSeg <= 0 || relSeg > DRAW_DISTANCE) continue;

      let horizOffset = 0;
      for (let j = currentSegIdx; j < Math.floor(car.segmentPos); j++) {
        const c = roadSegments[j % roadSegments.length] || 0;
        horizOffset += c * (car.segmentPos - j) * 1.5;
      }

      const perspScale = 1 / (relSeg * 0.04 + 0.1);
      const screenY = HORIZON_Y + (ROAD_BOTTOM_Y - HORIZON_Y) * (1 - 1 / (1 + relSeg * 0.06));
      const roadCenterX = VANISH_X + horizOffset * 800 * perspScale - (playerX || 0) * perspScale * 60;
      const carScreenX = roadCenterX + car.lane * perspScale * 60;

      if (screenY <= HORIZON_Y || screenY >= ROAD_BOTTOM_Y) continue;

      const headlightSize = Math.max(1, 5 * perspScale * 0.02);
      const headlightSpacing = Math.max(2, 15 * perspScale * 0.015);

      // Flickering
      car.headlightPhase += 0.1;
      const flicker = 0.85 + Math.sin(car.headlightPhase) * 0.15;

      const glowAlpha = Math.min(0.6, 0.1 + (1 / (relSeg * 0.1 + 1)) * 0.5) * flicker;
      const brightAlpha = Math.min(1, glowAlpha * 2);

      // Glow circles (larger, dimmer)
      const glowSize = headlightSize * 3;
      const ga = Math.floor(glowAlpha * 128);
      const gaHex = ga.toString(16).padStart(2, '0');
      renderer.fillCircle(carScreenX - headlightSpacing, screenY, glowSize, `#ffffc8${gaHex}`);
      renderer.fillCircle(carScreenX + headlightSpacing, screenY, glowSize, `#ffffc8${gaHex}`);

      // Bright headlight centers
      const ba = Math.floor(brightAlpha * 255);
      const baHex = ba.toString(16).padStart(2, '0');
      renderer.setGlow('#ffa', Math.min(0.9, glowAlpha * 3));
      renderer.fillCircle(carScreenX - headlightSpacing, screenY, headlightSize, `#ffffe6${baHex}`);
      renderer.fillCircle(carScreenX + headlightSpacing, screenY, headlightSize, `#ffffe6${baHex}`);
      renderer.setGlow(null);
    }

    // Headlight beams from player car
    drawHeadlights(renderer);

    // Dashboard
    drawDashboard(renderer, text);

    // Off-road warning flash
    if (crashTimer > 0) {
      const flashAlpha = 0.15 + Math.sin((frameCount || 0) * 0.5) * 0.1;
      const fa = Math.floor(Math.max(0, flashAlpha) * 255);
      const faHex = fa.toString(16).padStart(2, '0');
      renderer.fillRect(0, 0, W, H, `#ff3232${faHex}`);
    }
  };

  function drawHeadlights(renderer) {
    const beamBottomY = DASH_Y;
    const beamTopY = HORIZON_Y + 40;
    const beamBottomSpread = 60;
    const beamTopSpread = 20;
    const playerScreenOffset = -(steerAngle || 0) * 15;

    const leftBeamX = W / 2 - 40 + playerScreenOffset;
    const rightBeamX = W / 2 + 40 + playerScreenOffset;

    // Left headlight beam as polygon (trapezoid)
    renderer.fillPoly([
      { x: leftBeamX - beamBottomSpread, y: beamBottomY },
      { x: leftBeamX + beamBottomSpread, y: beamBottomY },
      { x: leftBeamX + beamTopSpread, y: beamTopY },
      { x: leftBeamX - beamTopSpread, y: beamTopY }
    ], '#ffffc80f');

    // Right headlight beam
    renderer.fillPoly([
      { x: rightBeamX - beamBottomSpread, y: beamBottomY },
      { x: rightBeamX + beamBottomSpread, y: beamBottomY },
      { x: rightBeamX + beamTopSpread, y: beamTopY },
      { x: rightBeamX - beamTopSpread, y: beamTopY }
    ], '#ffffc80f');
  }

  function drawDashboard(renderer, text) {
    const dashH = H - DASH_Y;

    // Dashboard background
    renderer.fillRect(0, DASH_Y, W, dashH, '#0d0d15');

    // Chrome strip
    renderer.fillRect(0, DASH_Y, W, 2, '#333');
    renderer.fillRect(0, DASH_Y, W, 1, '#555');

    // Steering wheel
    const wheelCX = W / 2;
    const wheelCY = DASH_Y + dashH * 0.6;
    const wheelR = 35;
    const sa = (steerAngle || 0) * 0.8;

    // Wheel shadow ring — draw as circle outline using small rects
    drawRing(renderer, wheelCX, wheelCY, wheelR, 5, '#1a1a1a');

    // Wheel ring
    drawRing(renderer, wheelCX, wheelCY, wheelR, 3, '#444');

    // Wheel spokes (3 spokes rotated by steer angle)
    for (let a = 0; a < 3; a++) {
      const angle = (a / 3) * Math.PI * 2 - Math.PI / 2 + sa;
      const ex = wheelCX + Math.cos(angle) * wheelR;
      const ey = wheelCY + Math.sin(angle) * wheelR;
      renderer.drawLine(wheelCX, wheelCY, ex, ey, '#333', 4);
    }

    // Center hub
    renderer.fillCircle(wheelCX, wheelCY, 8, '#333');

    // Speed indicator
    const speedPct = (playerSpeed || 0) / MAX_SPEED;
    const speedBarX = 30;
    const speedBarY = DASH_Y + 15;
    const speedBarW = 80;
    const speedBarH = 10;

    // Background
    renderer.fillRect(speedBarX, speedBarY, speedBarW, speedBarH, '#222');

    // Speed bar color
    let sr, sg;
    if (speedPct < 0.5) {
      sr = Math.floor(speedPct * 2 * 255);
      sg = 255;
    } else {
      sr = 255;
      sg = Math.floor((1 - speedPct) * 2 * 255);
    }
    const speedHex = '#' +
      sr.toString(16).padStart(2, '0') +
      sg.toString(16).padStart(2, '0') + '00';

    renderer.setGlow(speedHex, 0.5);
    renderer.fillRect(speedBarX, speedBarY, speedBarW * speedPct, speedBarH, speedHex);
    renderer.setGlow(null);

    // Speed label
    text.drawText('SPEED', speedBarX, speedBarY + speedBarH + 4, 10, '#888', 'left');

    // Speed number
    const mph = Math.floor((playerSpeed || 0) * 15);
    renderer.setGlow('#c4a', 0.4);
    text.drawText(mph + ' mph', speedBarX, speedBarY + speedBarH + 18, 16, '#cc44aa', 'left');
    renderer.setGlow(null);

    // Distance indicator (right side)
    const distMiles = ((distanceTraveled || 0) / 100).toFixed(1);
    text.drawText('DISTANCE', W - 30, speedBarY + speedBarH + 4, 10, '#888', 'right');
    renderer.setGlow('#c4a', 0.4);
    text.drawText(distMiles + ' mi', W - 30, speedBarY + speedBarH + 18, 16, '#cc44aa', 'right');
    renderer.setGlow(null);

    // Headlight indicator
    const lightsOn = (playerSpeed || 0) > 0;
    const lightsColor = lightsOn ? '#ffa' : '#333';
    if (lightsOn) renderer.setGlow('#ffa', 0.5);
    text.drawText('LIGHTS', W / 2, DASH_Y + 15, 10, lightsColor, 'center');
    if (lightsOn) {
      renderer.fillCircle(W / 2 - 26, DASH_Y + 21, 3, '#ffa');
      renderer.setGlow(null);
    }
  }

  // Draw a ring (circle outline) as a series of small line segments
  function drawRing(renderer, cx, cy, r, width, color) {
    const segments = 24;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      renderer.drawLine(
        cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
        cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
        color, width
      );
    }
  }

  game.start();
  return game;
}
