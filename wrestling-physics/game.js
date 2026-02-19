// wrestling-physics/game.js — WebGL 2 port of Wrestling Physics

import { Game } from '../engine/core.js';

const W = 500, H = 400;

// Ring geometry
const RING_L = 55, RING_R = 445;
const MAT_Y = 310;
const ROPE_YS = [155, 200, 248];
const GRAVITY = 0.38;
const FRICTION = 0.93;

// Game state
let gameState = 'waiting';
let score = 0;
let aiScoreVal = 0;
let round = 1;
const maxRounds = 3;
let roundTimer = 0;
let pinTimer = 0;
let pinTarget = null;
let matchMessage = '';
let matchMsgTimer = 0;
let shakeTimer = 0;
let shakeX = 0, shakeY = 0;
let comboText = [];
let aiTimer = 0;
let aiAct = { aL: 0, aR: 0, lL: 0, lR: 0 };
let aiPhase = 'approach';

let player = null;
let ai = null;

// DOM elements
const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');
const roundInfoEl = document.getElementById('roundInfo');

// --- RAGDOLL ---

function pt(x, y, r, mass) {
  return { x, y, ox: x, oy: y, vx: 0, vy: 0, r: r || 4, mass: mass || 1 };
}

function createWrestler(x, face, col, outline, trunksCol) {
  const f = face;
  const p = {
    head:  pt(x, MAT_Y - 108, 11, 2.5),
    neck:  pt(x, MAT_Y - 93, 3, 1),
    shlL:  pt(x - 14*f, MAT_Y - 88, 5, 1.5),
    shlR:  pt(x + 14*f, MAT_Y - 88, 5, 1.5),
    elbL:  pt(x - 26*f, MAT_Y - 75, 4, 1),
    elbR:  pt(x + 26*f, MAT_Y - 75, 4, 1),
    hndL:  pt(x - 36*f, MAT_Y - 64, 5, 0.7),
    hndR:  pt(x + 36*f, MAT_Y - 64, 5, 0.7),
    hip:   pt(x, MAT_Y - 52, 7, 4),
    knL:   pt(x - 8*f, MAT_Y - 28, 4, 1.3),
    knR:   pt(x + 8*f, MAT_Y - 28, 4, 1.3),
    ftL:   pt(x - 14*f, MAT_Y - 5, 5, 1.2),
    ftR:   pt(x + 14*f, MAT_Y - 5, 5, 1.2),
  };
  const bones = [
    ['head','neck',15], ['neck','shlL',16], ['neck','shlR',16],
    ['shlL','elbL',18], ['shlR','elbR',18],
    ['elbL','hndL',16], ['elbR','hndR',16],
    ['neck','hip',41],
    ['hip','knL',26], ['hip','knR',26],
    ['knL','ftL',25], ['knR','ftR',25],
    // structural
    ['shlL','shlR',28], ['shlL','hip',44], ['shlR','hip',44], ['head','hip',56],
  ];
  return { pts: p, bones, face: f, col, outline, trunksCol, motors: {aL:0,aR:0,lL:0,lR:0}, grabbing: false };
}

// --- PHYSICS ---

function applyGrav(w) {
  for (const k in w.pts) { w.pts[k].vy += GRAVITY; }
}

function applyMotors(w) {
  const m = w.motors, f = w.face, s = 3.2;
  if (m.aL) {
    w.pts.elbL.vy += m.aL * s * 1.3;
    w.pts.elbL.vx -= f * s * 0.7;
    w.pts.hndL.vy += m.aL * s * 1.6;
    w.pts.hndL.vx -= f * s * 0.4;
  }
  if (m.aR) {
    w.pts.elbR.vy += m.aR * s * 1.3;
    w.pts.elbR.vx += f * s * 0.7;
    w.pts.hndR.vy += m.aR * s * 1.6;
    w.pts.hndR.vx += f * s * 0.4;
  }
  if (m.lL) {
    const grounded = w.pts.ftL.y + w.pts.ftL.r >= MAT_Y - 2;
    w.pts.knL.vy += m.lL * s * 0.9;
    w.pts.knL.vx -= f * s * 0.5;
    w.pts.ftL.vy += m.lL * s * 1.3;
    w.pts.ftL.vx -= f * s * 0.3;
    if (grounded && m.lL > 0) { w.pts.hip.vx += f * 1.8; w.pts.hip.vy -= 0.5; }
    if (m.lL < 0) { w.pts.hip.vx -= f * 0.3; }
  }
  if (m.lR) {
    const grounded = w.pts.ftR.y + w.pts.ftR.r >= MAT_Y - 2;
    w.pts.knR.vy += m.lR * s * 0.9;
    w.pts.knR.vx += f * s * 0.5;
    w.pts.ftR.vy += m.lR * s * 1.3;
    w.pts.ftR.vx += f * s * 0.3;
    if (grounded && m.lR > 0) { w.pts.hip.vx += f * 1.8; w.pts.hip.vy -= 0.5; }
    if (m.lR < 0) { w.pts.hip.vx -= f * 0.3; }
  }
}

function integrate(w) {
  for (const k in w.pts) {
    const p = w.pts[k];
    p.vx *= FRICTION;
    p.vy *= FRICTION;
    p.x += p.vx;
    p.y += p.vy;
  }
}

function solveBones(w) {
  for (let it = 0; it < 6; it++) {
    for (const [a, b, len] of w.bones) {
      const pa = w.pts[a], pb = w.pts[b];
      let dx = pb.x - pa.x, dy = pb.y - pa.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 0.01;
      const diff = (d - len) / d;
      const tm = pa.mass + pb.mass;
      const rA = pb.mass / tm, rB = pa.mass / tm;
      pa.x += dx * diff * rA * 0.5;
      pa.y += dy * diff * rA * 0.5;
      pb.x -= dx * diff * rB * 0.5;
      pb.y -= dy * diff * rB * 0.5;
    }
    for (const k in w.pts) {
      const p = w.pts[k];
      if (p.y + p.r > MAT_Y) {
        p.y = MAT_Y - p.r;
        p.vy *= -0.25;
        p.vx *= 0.82;
      }
      if (p.y - p.r < 120) {
        p.y = 120 + p.r;
        p.vy = Math.abs(p.vy) * 0.3;
      }
    }
  }
}

function pdist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function collide(a, b) {
  const parts = ['head','shlL','shlR','hip','knL','knR'];
  for (const ka of parts) {
    for (const kb of parts) {
      const pa = a.pts[ka], pb = b.pts[kb];
      let dx = pb.x - pa.x, dy = pb.y - pa.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      const minD = pa.r + pb.r + 3;
      if (d < minD) {
        const push = (minD - d) / d * 0.45;
        pa.x -= dx * push * 0.5; pa.y -= dy * push * 0.5;
        pb.x += dx * push * 0.5; pb.y += dy * push * 0.5;
        pa.vx -= dx * push * 0.12; pa.vy -= dy * push * 0.12;
        pb.vx += dx * push * 0.12; pb.vy += dy * push * 0.12;
      }
    }
  }
}

function applyGrab(atk, def) {
  let grabbed = false;
  for (const hk of ['hndL','hndR']) {
    const hand = atk.pts[hk];
    for (const bk of ['head','neck','shlL','shlR','hip']) {
      const bp = def.pts[bk];
      const d = pdist(hand, bp);
      if (d < hand.r + bp.r + 10) {
        grabbed = true;
        const dx = hand.x - bp.x, dy = hand.y - bp.y;
        const dd = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = 0.9;
        bp.vx += (dx/dd) * f;
        bp.vy += (dy/dd) * f;
        hand.vx -= (dx/dd) * f * 0.25;
        hand.vy -= (dy/dd) * f * 0.25;
      }
    }
  }
  atk.grabbing = grabbed;
}

function upright(w) {
  const h = w.pts.head, hip = w.pts.hip;
  if (h.y > hip.y) { h.vy -= 1.0; hip.vy += 0.4; }
  const fmx = (w.pts.ftL.x + w.pts.ftR.x) / 2;
  const dx = hip.x - fmx;
  hip.vx -= dx * 0.008;
}

function shouldersDown(w) {
  const sl = w.pts.shlL, sr = w.pts.shlR;
  return (MAT_Y - sl.y - sl.r < 14) && (MAT_Y - sr.y - sr.r < 14);
}

function isRingOut(w) {
  return w.pts.hip.x < RING_L - 25 || w.pts.hip.x > RING_R + 25;
}

// --- AI ---

function updateAI() {
  aiTimer++;
  const pH = player.pts.hip, aH = ai.pts.hip;
  const dx = pH.x - aH.x;
  const dist = Math.abs(dx);

  if (shouldersDown(ai)) {
    aiPhase = 'recover';
  } else if (aH.x < RING_L + 50 || aH.x > RING_R - 50) {
    aiPhase = 'flee';
  } else if (dist > 60) {
    aiPhase = 'approach';
  } else {
    aiPhase = 'attack';
  }

  if (aiTimer % 6 === 0) {
    switch (aiPhase) {
      case 'approach':
        if (aiTimer % 24 < 12) { aiAct.lL = -1; aiAct.lR = 1; }
        else { aiAct.lL = 1; aiAct.lR = -1; }
        aiAct.aL = -1; aiAct.aR = -1;
        break;
      case 'attack':
        if (aiTimer % 12 < 6) { aiAct.aL = 1; aiAct.aR = -1; }
        else { aiAct.aL = -1; aiAct.aR = 1; }
        aiAct.lL = (Math.random() > 0.4) ? 1 : -1;
        aiAct.lR = (Math.random() > 0.4) ? 1 : -1;
        if (Math.random() < 0.08) {
          aiAct.aL = 1; aiAct.aR = 1;
          aiAct.lL = 1; aiAct.lR = 1;
        }
        break;
      case 'recover':
        aiAct.aL = (Math.random() > 0.3) ? -1 : 1;
        aiAct.aR = (Math.random() > 0.3) ? -1 : 1;
        aiAct.lL = (Math.random() > 0.3) ? -1 : 1;
        aiAct.lR = (Math.random() > 0.3) ? -1 : 1;
        break;
      case 'flee': {
        const toCenter = 250 - aH.x;
        if (toCenter > 0) {
          if (aiTimer % 24 < 12) { aiAct.lL = 1; aiAct.lR = -1; }
          else { aiAct.lL = -1; aiAct.lR = 1; }
        } else {
          if (aiTimer % 24 < 12) { aiAct.lL = -1; aiAct.lR = 1; }
          else { aiAct.lL = 1; aiAct.lR = -1; }
        }
        aiAct.aL = -1; aiAct.aR = -1;
        break;
      }
    }
    if (Math.random() < 0.12 && aiPhase !== 'recover') {
      aiAct.aL = (Math.random() > 0.5) ? -1 : 1;
      aiAct.aR = (Math.random() > 0.5) ? -1 : 1;
      aiAct.lL = (Math.random() > 0.5) ? -1 : 1;
      aiAct.lR = (Math.random() > 0.5) ? -1 : 1;
    }
  }

  ai.motors.aL = aiAct.aL;
  ai.motors.aR = aiAct.aR;
  ai.motors.lL = aiAct.lL;
  ai.motors.lR = aiAct.lR;
}

// --- GAME LIFECYCLE ---

function initRound() {
  player = createWrestler(170, 1, '#4af', '#28d', '#24a');
  ai = createWrestler(330, -1, '#f55', '#c22', '#c22');
  pinTimer = 0; pinTarget = null; roundTimer = 0;
  matchMessage = ''; matchMsgTimer = 0; comboText = [];
  aiTimer = 0;
  aiPhase = 'approach';
  aiAct = { aL: 0, aR: 0, lL: 0, lR: 0 };
  if (roundInfoEl) roundInfoEl.textContent = `Round ${round}/${maxRounds}`;
}

function endRound(game) {
  pinTimer = 0; pinTarget = null;

  if (round >= maxRounds || score >= 2 || aiScoreVal >= 2) {
    if (score > aiScoreVal) {
      game.showOverlay('CHAMPION!', `You win ${score}-${aiScoreVal}! Press any key to rematch`);
    } else if (aiScoreVal > score) {
      game.showOverlay('DEFEATED!', `CPU wins ${aiScoreVal}-${score}. Press any key to rematch`);
    } else {
      game.showOverlay('DRAW!', `${score}-${aiScoreVal}. Press any key to rematch`);
    }
    game.setState('over');
  } else {
    round++;
    game.showOverlay(matchMessage, `Round ${round} - Press any key`);
    game.setState('waiting');
    // Prepare next round silently (reset happens on next keypress via onUpdate)
  }
}

// --- DRAWING HELPERS ---

function drawLimb(renderer, pa, pb, col, thick) {
  renderer.drawLine(pa.x, pa.y, pb.x, pb.y, col, thick);
}

function drawWrestler(renderer, text, w) {
  const p = w.pts;

  // Shadow under wrestler
  const shadowPts = [];
  const shadowCx = p.hip.x;
  const shadowRx = 20, shadowRy = 4;
  const shadowY = MAT_Y + 2;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    shadowPts.push({ x: shadowCx + Math.cos(a) * shadowRx, y: shadowY + Math.sin(a) * shadowRy });
  }
  renderer.fillPoly(shadowPts, '#00000033');

  // Limb pairs: outline then color
  const limbs = [
    [p.neck,p.shlL],[p.neck,p.shlR],[p.shlL,p.elbL],[p.shlR,p.elbR],
    [p.elbL,p.hndL],[p.elbR,p.hndR],[p.neck,p.hip],
    [p.hip,p.knL],[p.hip,p.knR],[p.knL,p.ftL],[p.knR,p.ftR]
  ];
  for (const [a, b] of limbs) drawLimb(renderer, a, b, w.outline, 6);
  for (const [a, b] of limbs) drawLimb(renderer, a, b, w.col, 4);

  // Trunks (shorts) as filled polygon
  const trunksPts = [
    { x: p.shlL.x, y: p.hip.y - 8 },
    { x: p.shlR.x, y: p.hip.y - 8 },
    { x: p.knR.x,  y: p.knR.y - 4 },
    { x: p.knL.x,  y: p.knL.y - 4 },
  ];
  renderer.fillPoly(trunksPts, w.trunksCol);

  // Torso fill (semi-transparent)
  const torsoPts = [
    { x: p.shlL.x, y: p.shlL.y },
    { x: p.shlR.x, y: p.shlR.y },
    { x: p.hip.x + 8, y: p.hip.y },
    { x: p.hip.x - 8, y: p.hip.y },
  ];
  // Build color with alpha from w.col — parse hex and add 66 (alpha ~0.4)
  const torsoCol = w.col + '66';
  renderer.fillPoly(torsoPts, torsoCol);

  // Joints
  for (const k in p) {
    const pt2 = p[k];
    const isHand = (k === 'hndL' || k === 'hndR');
    renderer.fillCircle(pt2.x, pt2.y, pt2.r, isHand ? '#ffe0c0' : w.col);
    // Outline ring around joint
    const outlineR = pt2.r + 1;
    const steps2 = 12;
    const outerPts = [];
    for (let i = 0; i <= steps2; i++) {
      const a = (i / steps2) * Math.PI * 2;
      outerPts.push({ x: pt2.x + Math.cos(a) * outlineR, y: pt2.y + Math.sin(a) * outlineR });
    }
    renderer.strokePoly(outerPts, w.outline, 1, true);
  }

  // Boots
  for (const fk of ['ftL','ftR']) {
    const bootCol = (w.col === '#4af') ? '#26c' : '#a11';
    renderer.fillCircle(p[fk].x, p[fk].y, p[fk].r + 1, bootCol);
    const outerPts = [];
    const steps3 = 12;
    for (let i = 0; i <= steps3; i++) {
      const a = (i / steps3) * Math.PI * 2;
      outerPts.push({ x: p[fk].x + Math.cos(a) * (p[fk].r + 2), y: p[fk].y + Math.sin(a) * (p[fk].r + 2) });
    }
    renderer.strokePoly(outerPts, w.outline, 1, true);
  }

  // Head: skin + mask
  renderer.fillCircle(p.head.x, p.head.y, p.head.r, '#ffe0c0');

  // Mask top half — arc approximated as polygon
  {
    const hx = p.head.x, hy = p.head.y - 1, hr = p.head.r - 1;
    const maskPts = [{ x: hx, y: hy }];
    const arcStart = Math.PI + 0.4;
    const arcEnd = Math.PI * 2 - 0.4;
    const arcSteps = 14;
    for (let i = 0; i <= arcSteps; i++) {
      const a = arcStart + (arcEnd - arcStart) * (i / arcSteps);
      maskPts.push({ x: hx + Math.cos(a) * hr, y: hy + Math.sin(a) * hr });
    }
    renderer.fillPoly(maskPts, w.col);
  }

  // Eyes
  const eyeF = w.face;
  renderer.fillCircle(p.head.x + eyeF*2 - 2, p.head.y - 1, 2, '#fff');
  renderer.fillCircle(p.head.x + eyeF*2 + 3, p.head.y - 1, 2, '#fff');
  renderer.fillCircle(p.head.x + eyeF*2 - 1.5, p.head.y - 1, 0.8, '#111');
  renderer.fillCircle(p.head.x + eyeF*2 + 3.5, p.head.y - 1, 0.8, '#111');

  // Mouth
  const effort = Math.abs(w.motors.aL) + Math.abs(w.motors.aR) + Math.abs(w.motors.lL) + Math.abs(w.motors.lR);
  if (effort > 2) {
    // Yelling — small ellipse approximated as circle
    renderer.fillCircle(p.head.x + eyeF*2, p.head.y + 4, 2, '#300');
  } else {
    renderer.drawLine(
      p.head.x + eyeF*2 - 2, p.head.y + 4,
      p.head.x + eyeF*2 + 2, p.head.y + 4,
      '#300', 1
    );
  }

  // Grab sparks
  if (w.grabbing) {
    for (const hk of ['hndL','hndR']) {
      const hp = p[hk];
      const sparkR = hp.r + 7;
      const sparkPts = [];
      const sSteps = 16;
      for (let i = 0; i <= sSteps; i++) {
        const a = (i / sSteps) * Math.PI * 2;
        sparkPts.push({ x: hp.x + Math.cos(a) * sparkR, y: hp.y + Math.sin(a) * sparkR });
      }
      renderer.strokePoly(sparkPts, '#ff0', 1.5, true);
    }
    if (roundTimer % 4 === 0) {
      for (const hk of ['hndL','hndR']) {
        comboText.push({
          x: p[hk].x + (Math.random()-0.5)*10,
          y: p[hk].y - 5,
          t: 15, txt: '*', col: '#ff0', sz: 10
        });
      }
    }
  }
}

function drawRing(renderer) {
  // Arena floor/apron
  renderer.fillRect(RING_L - 15, MAT_Y, RING_R - RING_L + 30, 80, '#2a1a14');

  // Mat top surface — single color (no gradient in WebGL batch)
  renderer.fillRect(RING_L, MAT_Y - 3, RING_R - RING_L, 6, '#6a4430');

  // Center circle on mat — upper half arc
  {
    const steps = 24;
    const cx = 250, cy = MAT_Y, cr = 40;
    const arcPts = [];
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (Math.PI * i / steps); // PI to 2PI (upper half)
      arcPts.push({ x: cx + Math.cos(a) * cr, y: cy + Math.sin(a) * cr });
    }
    renderer.strokePoly(arcPts, '#ff882233', 1, false);
  }

  // Posts
  renderer.fillRect(RING_L - 5, 135, 7, MAT_Y - 135, '#777');
  renderer.fillRect(RING_R - 2, 135, 7, MAT_Y - 135, '#777');

  // Turnbuckle pads
  renderer.setGlow('#f82', 0.5);
  renderer.fillCircle(RING_L - 2, 138, 7, '#f82');
  renderer.fillCircle(RING_R + 2, 138, 7, '#f82');
  renderer.setGlow(null);

  // Ropes — quadratic bezier approximated as line segments
  const ropeColors = ['#f82', '#e72', '#d62'];
  for (let ri = 0; ri < ROPE_YS.length; ri++) {
    const ry = ROPE_YS[ri];
    const col = ropeColors[ri];
    // Approximate quadratic bezier with 12 segments
    const steps = 12;
    const x0 = RING_L - 2, x2 = RING_R + 2;
    const cpx = 250, cpy = ry + 3;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const ax = (1-t0)*(1-t0)*x0 + 2*(1-t0)*t0*cpx + t0*t0*x2;
      const ay = (1-t0)*(1-t0)*ry + 2*(1-t0)*t0*cpy + t0*t0*ry;
      const bx = (1-t1)*(1-t1)*x0 + 2*(1-t1)*t1*cpx + t1*t1*x2;
      const by2 = (1-t1)*(1-t1)*ry + 2*(1-t1)*t1*cpy + t1*t1*ry;
      renderer.drawLine(ax, ay, bx, by2, col, 2.5);
    }
  }

  // Audience (stylized dots) — static, no random per frame
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 22; i++) {
      const ax = 12 + i * 23 + row * 8;
      const ay = 50 + row * 22 + Math.sin(i * 1.7 + row) * 5;
      renderer.fillCircle(ax, ay, 5, '#1e1e26');
      renderer.fillRect(ax - 3, ay + 5, 6, 7, '#1e1e26');
    }
  }

  // Spotlight glow (radial gradient approximated as large faint circle)
  renderer.setGlow('#ff8822', 0.07);
  renderer.fillCircle(250, MAT_Y - 80, 220, '#ff882207');
  renderer.setGlow(null);
}

function drawPin(renderer, text) {
  if (!pinTarget || pinTimer <= 0) return;
  const w = pinTarget === 'ai' ? ai : player;
  const cx = (w.pts.shlL.x + w.pts.shlR.x) / 2;
  const cy = Math.min(w.pts.shlL.y, w.pts.shlR.y) - 30;
  const progress = pinTimer / 180;
  const secs = (pinTimer / 60).toFixed(1);

  // Background
  renderer.fillRect(cx - 40, cy - 8, 80, 32, '#000000b3');

  // Bar background
  renderer.fillRect(cx - 35, cy + 12, 70, 6, '#333');
  // Bar fill
  const barCol = progress < 0.5 ? '#f82' : (progress < 0.8 ? '#fa2' : '#f22');
  renderer.fillRect(cx - 35, cy + 12, 70 * progress, 6, barCol);

  // Border flash
  if (Math.floor(pinTimer / 6) % 2 === 0) {
    renderer.strokePoly([
      { x: cx - 42, y: cy - 10 },
      { x: cx + 42, y: cy - 10 },
      { x: cx + 42, y: cy + 26 },
      { x: cx - 42, y: cy + 26 },
    ], '#f82', 2, true);
  }

  // Pin text
  renderer.setGlow('#f82', 0.4);
  text.drawText(`PIN ${secs}s`, cx, cy + 2, 14, '#f82', 'center');
  renderer.setGlow(null);

  // Big count numbers
  const count = Math.floor(pinTimer / 60) + 1;
  if (pinTimer % 60 < 20) {
    const alpha = Math.floor((1 - (pinTimer % 60) / 20) * 255).toString(16).padStart(2,'0');
    renderer.setGlow('#f82', 0.6);
    text.drawText(count.toString(), 250, 176, 48, `#ff8822${alpha}`, 'center');
    renderer.setGlow(null);
  }
}

function drawHUD(renderer, text) {
  // Player key guide box
  renderer.fillRect(3, H - 52, 155, 49, '#00000080');
  // CPU info box
  renderer.fillRect(W - 158, H - 52, 155, 49, '#00000080');

  text.drawText('YOU', 8, H - 44, 10, '#4af', 'left');

  const plKeys = [
    ['Q/W: L.Arm', player.motors.aL],
    ['O/P: R.Arm', player.motors.aR],
    ['A/S: L.Leg', player.motors.lL],
    ['K/L: R.Leg', player.motors.lR],
  ];
  for (let i = 0; i < plKeys.length; i++) {
    const [label, val] = plKeys[i];
    const y = H - 34 + i * 9;
    const col = val === -1 ? '#4f4' : (val === 1 ? '#f44' : '#555');
    text.drawText(label, 8, y, 8, col, 'left');
  }

  text.drawText('CPU', W - 8, H - 44, 10, '#f55', 'right');
  text.drawText('Pin = 3s shoulders', W - 8, H - 34, 8, '#777', 'right');
  text.drawText('Ring-out = off edge', W - 8, H - 25, 8, '#777', 'right');
  text.drawText('Best of 3 rounds', W - 8, H - 16, 8, '#777', 'right');
}

function drawFloatingText(renderer, text) {
  for (let i = comboText.length - 1; i >= 0; i--) {
    const t = comboText[i];
    t.y -= 0.8;
    t.t--;
    if (t.t <= 0) { comboText.splice(i, 1); continue; }
    const alpha = Math.min(1, t.t / 10);
    const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2,'0');
    renderer.setGlow(t.col, alpha * 0.5);
    text.drawText(t.txt, t.x, t.y, t.sz, t.col + alphaHex, 'center');
    renderer.setGlow(null);
  }
}

function drawMsg(renderer, text) {
  if (matchMsgTimer <= 0) return;
  const a = Math.min(1, matchMsgTimer / 30);
  const alphaHex = Math.floor(a * 255).toString(16).padStart(2,'0');
  renderer.setGlow('#f82', a * 0.6);
  text.drawText(matchMessage, 250, 121, 22, `#ff8822${alphaHex}`, 'center');
  renderer.setGlow(null);
}

// --- EXPORTED GAME ---

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    aiScoreVal = 0;
    round = 1;
    gameState = 'waiting';
    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    if (roundInfoEl) roundInfoEl.textContent = `Best of 3`;
    initRound();
    game.showOverlay('WRESTLING PHYSICS', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      // Any key starts/continues
      for (const k of ['q','w','o','p','a','s','k','l',' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']) {
        if (input.wasPressed(k)) {
          // If coming from matchEnd, reset scores
          if (gameState === 'matchEnd') {
            score = 0; aiScoreVal = 0; round = 1;
            if (scoreEl) scoreEl.textContent = '0';
            if (aiScoreEl) aiScoreEl.textContent = '0';
          }
          gameState = 'playing';
          initRound();
          game.setState('playing');
          return;
        }
      }
      return;
    }

    if (game.state === 'over') {
      gameState = 'matchEnd';
      for (const k of ['q','w','o','p','a','s','k','l',' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']) {
        if (input.wasPressed(k)) {
          score = 0; aiScoreVal = 0; round = 1;
          if (scoreEl) scoreEl.textContent = '0';
          if (aiScoreEl) aiScoreEl.textContent = '0';
          gameState = 'playing';
          initRound();
          game.setState('playing');
          return;
        }
      }
      return;
    }

    if (game.state !== 'playing') return;

    roundTimer++;

    // Player input
    player.motors.aL = input.isDown('q') ? -1 : (input.isDown('w') ? 1 : 0);
    player.motors.aR = input.isDown('o') ? -1 : (input.isDown('p') ? 1 : 0);
    player.motors.lL = input.isDown('a') ? -1 : (input.isDown('s') ? 1 : 0);
    player.motors.lR = input.isDown('k') ? -1 : (input.isDown('l') ? 1 : 0);

    updateAI();

    for (const w of [player, ai]) {
      applyMotors(w);
      applyGrav(w);
      integrate(w);
      solveBones(w);
      upright(w);
    }
    collide(player, ai);
    applyGrab(player, ai);
    applyGrab(ai, player);

    // Pin logic
    const pDown = shouldersDown(player);
    const aDown = shouldersDown(ai);

    if (aDown && !pDown) {
      if (pinTarget === 'ai') pinTimer++;
      else { pinTarget = 'ai'; pinTimer = 1; }
    } else if (pDown && !aDown) {
      if (pinTarget === 'player') pinTimer++;
      else { pinTarget = 'player'; pinTimer = 1; }
    } else {
      pinTimer = Math.max(0, pinTimer - 3);
      if (pinTimer <= 0) pinTarget = null;
    }

    if (pinTimer >= 180) {
      if (pinTarget === 'ai') {
        score++;
        if (scoreEl) scoreEl.textContent = score;
        matchMessage = 'PIN! You score!';
        comboText.push({ x: 250, y: 180, t: 60, txt: 'PINFALL!', col: '#f82', sz: 28 });
      } else {
        aiScoreVal++;
        if (aiScoreEl) aiScoreEl.textContent = aiScoreVal;
        matchMessage = 'PIN! CPU scores!';
        comboText.push({ x: 250, y: 180, t: 60, txt: 'PINFALL!', col: '#f55', sz: 28 });
      }
      matchMsgTimer = 90;
      shakeTimer = 15;
      endRound(game);
      return;
    }

    // Ring out
    if (isRingOut(player)) {
      aiScoreVal++;
      if (aiScoreEl) aiScoreEl.textContent = aiScoreVal;
      matchMessage = 'RING OUT! CPU scores!';
      comboText.push({ x: 250, y: 180, t: 60, txt: 'RING OUT!', col: '#f55', sz: 28 });
      matchMsgTimer = 90;
      shakeTimer = 20;
      endRound(game);
      return;
    }
    if (isRingOut(ai)) {
      score++;
      if (scoreEl) scoreEl.textContent = score;
      matchMessage = 'RING OUT! You score!';
      comboText.push({ x: 250, y: 180, t: 60, txt: 'RING OUT!', col: '#f82', sz: 28 });
      matchMsgTimer = 90;
      shakeTimer = 20;
      endRound(game);
      return;
    }

    if (matchMsgTimer > 0) matchMsgTimer--;

    // Screen shake
    if (shakeTimer > 0) {
      shakeTimer--;
      shakeX = (Math.random()-0.5) * shakeTimer;
      shakeY = (Math.random()-0.5) * shakeTimer * 0.6;
    } else { shakeX = 0; shakeY = 0; }
  };

  game.onDraw = (renderer, text) => {
    // Screen shake: shift all drawing by offsetting the ring/wrestlers
    // We bake the shake into every position by setting a global offset
    // Achieved by drawing everything shifted — store as closure vars used below
    const ox = shakeX, oy = shakeY;

    // Background already cleared by engine (begin() clears to bg color '#1a1a2e')

    // Draw ring (shake applied by temporarily shifting all points would require wrapping,
    // so instead we draw a slightly larger bg rect to cover shake edges)
    if (ox !== 0 || oy !== 0) {
      renderer.fillRect(-10 + ox, -10 + oy, W + 20, H + 20, '#1a1a2e');
    }

    drawRingShifted(renderer, ox, oy);

    if (player && ai) {
      drawWrestlerShifted(renderer, text, player, ox, oy);
      drawWrestlerShifted(renderer, text, ai, ox, oy);
      drawPinShifted(renderer, text, ox, oy);
    }

    drawFloatingTextShifted(renderer, text, ox, oy);
    drawHUD(renderer, text);
    drawMsgShifted(renderer, text, ox, oy);
  };

  game.start();
  return game;
}

// --- SHAKE-SHIFTED WRAPPERS ---
// Screen shake: the original code used ctx.translate(shakeX, shakeY).
// In the WebGL engine we have no global transform. We implement shake by offsetting
// all coordinates passed to the renderer.

function shiftPts(pts, ox, oy) {
  return pts.map(p => ({ x: p.x + ox, y: p.y + oy }));
}

function shiftWrestler(w, ox, oy) {
  // Returns a shallow copy of wrestler with shifted pts
  const newPts = {};
  for (const k in w.pts) {
    const p = w.pts[k];
    newPts[k] = { ...p, x: p.x + ox, y: p.y + oy };
  }
  return { ...w, pts: newPts };
}

function drawRingShifted(renderer, ox, oy) {
  const RL = RING_L + ox, RR = RING_R + ox;
  const MY = MAT_Y + oy;

  // Arena floor/apron
  renderer.fillRect(RL - 15, MY, RR - RL + 30, 80, '#2a1a14');

  // Mat surface
  renderer.fillRect(RL, MY - 3, RR - RL, 6, '#6a4430');

  // Center circle arc
  {
    const steps = 24;
    const cx = 250 + ox, cy = MY, cr = 40;
    const arcPts = [];
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (Math.PI * i / steps);
      arcPts.push({ x: cx + Math.cos(a) * cr, y: cy + Math.sin(a) * cr });
    }
    renderer.strokePoly(arcPts, '#ff882233', 1, false);
  }

  // Posts
  renderer.fillRect(RL - 5, 135 + oy, 7, MY - (135 + oy), '#777');
  renderer.fillRect(RR - 2, 135 + oy, 7, MY - (135 + oy), '#777');

  // Turnbuckle pads
  renderer.setGlow('#f82', 0.5);
  renderer.fillCircle(RL - 2, 138 + oy, 7, '#f82');
  renderer.fillCircle(RR + 2, 138 + oy, 7, '#f82');
  renderer.setGlow(null);

  // Ropes
  const ropeColors = ['#f82', '#e72', '#d62'];
  for (let ri = 0; ri < ROPE_YS.length; ri++) {
    const ry = ROPE_YS[ri] + oy;
    const col = ropeColors[ri];
    const steps = 12;
    const x0 = RL - 2, x2 = RR + 2;
    const cpx = 250 + ox, cpy = ry + 3;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const ax = (1-t0)*(1-t0)*x0 + 2*(1-t0)*t0*cpx + t0*t0*x2;
      const ay = (1-t0)*(1-t0)*ry + 2*(1-t0)*t0*cpy + t0*t0*ry;
      const bx = (1-t1)*(1-t1)*x0 + 2*(1-t1)*t1*cpx + t1*t1*x2;
      const by2 = (1-t1)*(1-t1)*ry + 2*(1-t1)*t1*cpy + t1*t1*ry;
      renderer.drawLine(ax, ay, bx, by2, col, 2.5);
    }
  }

  // Audience
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 22; i++) {
      const ax = 12 + i * 23 + row * 8 + ox;
      const ay = 50 + row * 22 + Math.sin(i * 1.7 + row) * 5 + oy;
      renderer.fillCircle(ax, ay, 5, '#1e1e26');
      renderer.fillRect(ax - 3, ay + 5, 6, 7, '#1e1e26');
    }
  }

  // Spotlight
  renderer.setGlow('#ff8822', 0.07);
  renderer.fillCircle(250 + ox, MY - 80, 220, '#ff882207');
  renderer.setGlow(null);
}

function drawWrestlerShifted(renderer, text, w, ox, oy) {
  const sw = shiftWrestler(w, ox, oy);
  drawWrestler(renderer, text, sw);
}

function drawPinShifted(renderer, text, ox, oy) {
  if (!pinTarget || pinTimer <= 0) return;
  const w = pinTarget === 'ai' ? ai : player;
  const cx = (w.pts.shlL.x + w.pts.shlR.x) / 2 + ox;
  const cy = Math.min(w.pts.shlL.y, w.pts.shlR.y) - 30 + oy;
  const progress = pinTimer / 180;
  const secs = (pinTimer / 60).toFixed(1);

  renderer.fillRect(cx - 40, cy - 8, 80, 32, '#000000b3');
  renderer.fillRect(cx - 35, cy + 12, 70, 6, '#333');
  const barCol = progress < 0.5 ? '#f82' : (progress < 0.8 ? '#fa2' : '#f22');
  renderer.fillRect(cx - 35, cy + 12, 70 * progress, 6, barCol);

  if (Math.floor(pinTimer / 6) % 2 === 0) {
    renderer.strokePoly([
      { x: cx - 42, y: cy - 10 },
      { x: cx + 42, y: cy - 10 },
      { x: cx + 42, y: cy + 26 },
      { x: cx - 42, y: cy + 26 },
    ], '#f82', 2, true);
  }

  renderer.setGlow('#f82', 0.4);
  text.drawText(`PIN ${secs}s`, cx, cy + 2, 14, '#f82', 'center');
  renderer.setGlow(null);

  const count = Math.floor(pinTimer / 60) + 1;
  if (pinTimer % 60 < 20) {
    const alpha = Math.floor((1 - (pinTimer % 60) / 20) * 255).toString(16).padStart(2,'0');
    renderer.setGlow('#f82', 0.6);
    text.drawText(count.toString(), 250 + ox, 176 + oy, 48, `#ff8822${alpha}`, 'center');
    renderer.setGlow(null);
  }
}

function drawFloatingTextShifted(renderer, text, ox, oy) {
  for (let i = comboText.length - 1; i >= 0; i--) {
    const t = comboText[i];
    t.y -= 0.8;
    t.t--;
    if (t.t <= 0) { comboText.splice(i, 1); continue; }
    const alpha = Math.min(1, t.t / 10);
    const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2,'0');
    renderer.setGlow(t.col, alpha * 0.5);
    text.drawText(t.txt, t.x + ox, t.y + oy, t.sz, t.col + alphaHex, 'center');
    renderer.setGlow(null);
  }
}

function drawMsgShifted(renderer, text, ox, oy) {
  if (matchMsgTimer <= 0) return;
  const a = Math.min(1, matchMsgTimer / 30);
  const alphaHex = Math.floor(a * 255).toString(16).padStart(2,'0');
  renderer.setGlow('#f82', a * 0.6);
  text.drawText(matchMessage, 250 + ox, 121 + oy, 22, `#ff8822${alphaHex}`, 'center');
  renderer.setGlow(null);
}
