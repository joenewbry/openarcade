// portal-2d-coop/game.js — WebGL 2 port

import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 400;
  const scoreEl  = document.getElementById('score');
  const roomEl   = document.getElementById('room');
  const timerEl  = document.getElementById('timer');

  let score = 0;
  let currentRoom = 0;
  let roomStartTime = 0;
  let elapsed = 0;

  const GRAVITY    = 0.45;
  const JUMP_FORCE = -8.5;
  const MOVE_SPEED = 3;
  const TILE       = 25;
  const COLS       = W / TILE; // 24
  const ROWS       = H / TILE; // 16

  // ── Classes ──────────────────────────────────────────────────────────────

  class Portal {
    constructor(x, y, nx, ny, color) {
      this.x = x; this.y = y;
      this.nx = nx; this.ny = ny;
      this.color = color;
      this.age = 0;
    }
  }

  class Player {
    constructor(x, y, color, name) {
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.w = 14; this.h = 22;
      this.color = color;
      this.name = name;
      this.onGround = false;
      this.portalBlue = null;
      this.portalOrange = null;
      this.facingRight = true;
      this.atExit = false;
      this.portalCooldown = 0;
      this.teleportCooldown = 0;
    }
  }

  class Cube {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.w = 20; this.h = 20;
      this.onGround = false;
      this.teleportCooldown = 0;
    }
  }

  class Button {
    constructor(x, y, targetId) {
      this.x = x; this.y = y;
      this.w = 30; this.h = 8;
      this.pressed = false;
      this.targetId = targetId;
    }
  }

  class Door {
    constructor(x, y, id) {
      this.x = x; this.y = y;
      this.w = TILE; this.h = TILE * 2;
      this.open = false;
      this.id = id;
      this.openAmount = 0;
    }
  }

  class Exit {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.w = 30; this.h = 40;
    }
  }

  // ── State ─────────────────────────────────────────────────────────────────

  let player, ai, cubes, buttons, doors, exits, tiles, particles, portalProjectiles;
  let aiThinkTimer = 0, aiAction = 'follow', aiPortalTimer = 0, aiJumpTimer = 0;

  // ── Tile helpers ──────────────────────────────────────────────────────────

  function getTile(px, py) {
    let c = Math.floor(px / TILE);
    let r = Math.floor(py / TILE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 1;
    return tiles[r][c];
  }

  function isSolid(px, py) {
    let t = getTile(px, py);
    if (t === 1 || t === 2) return true;
    for (let d of doors) {
      if (d.openAmount < 0.8 && px >= d.x && px < d.x + d.w && py >= d.y && py < d.y + d.h * (1 - d.openAmount)) return true;
    }
    return false;
  }

  // ── Room builder ──────────────────────────────────────────────────────────

  function buildRoom(roomNum) {
    tiles = [];
    cubes = [];
    buttons = [];
    doors = [];
    exits = [];
    particles = [];
    portalProjectiles = [];

    for (let r = 0; r < ROWS; r++) {
      tiles[r] = [];
      for (let c = 0; c < COLS; c++) tiles[r][c] = 0;
    }

    function wall(c, r)  { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tiles[r][c] = 1; }
    function pwall(c, r) { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tiles[r][c] = 2; }
    function fillRow(r, c1, c2, type) { for (let c = c1; c <= c2; c++) { type === 2 ? pwall(c, r) : wall(c, r); } }
    function fillCol(c, r1, r2, type) { for (let r = r1; r <= r2; r++) { type === 2 ? pwall(c, r) : wall(c, r); } }

    // Border
    for (let c = 0; c < COLS; c++) { wall(c, 0); wall(c, ROWS - 1); }
    for (let r = 0; r < ROWS; r++) { wall(0, r); wall(COLS - 1, r); }

    if (roomNum === 0) {
      fillRow(13, 1, 9, 1);
      fillRow(13, 14, 22, 1);
      fillCol(9, 3, 12, 2);
      fillCol(14, 3, 12, 2);
      fillCol(1, 3, 12, 2);
      fillRow(1, 2, 22, 2);
      player = new Player(75, 13 * TILE - 14, '#4af', 'You');
      ai = new Player(115, 13 * TILE - 14, '#fa4', 'ATLAS');
      exits.push(new Exit(540, 13 * TILE - 42));
    } else if (roomNum === 1) {
      fillRow(13, 1, 22, 1);
      fillRow(8, 12, 22, 1);
      fillCol(1, 1, 12, 2);
      fillRow(13, 3, 7, 2);
      fillCol(22, 1, 7, 2);
      fillRow(1, 1, 22, 2);
      doors.push(new Door(18 * TILE, 8 * TILE - TILE * 2 + 2, 'door1'));
      buttons.push(new Button(14 * TILE, 8 * TILE - 10, 'door1'));
      player = new Player(60, 13 * TILE - 14, '#4af', 'You');
      ai = new Player(95, 13 * TILE - 14, '#fa4', 'ATLAS');
      exits.push(new Exit(20 * TILE, 8 * TILE - 42));
    } else if (roomNum === 2) {
      fillRow(13, 1, 22, 1);
      fillRow(9, 1, 10, 1);
      fillRow(9, 15, 22, 1);
      fillCol(1, 1, 12, 2);
      fillCol(22, 1, 8, 2);
      fillRow(1, 2, 22, 2);
      fillCol(10, 10, 12, 2);
      fillCol(15, 10, 12, 2);
      cubes.push(new Cube(5 * TILE, 9 * TILE - 12));
      buttons.push(new Button(18 * TILE, 9 * TILE - 10, 'door1'));
      doors.push(new Door(21 * TILE, 9 * TILE - TILE * 2 + 2, 'door1'));
      player = new Player(60, 13 * TILE - 14, '#4af', 'You');
      ai = new Player(95, 13 * TILE - 14, '#fa4', 'ATLAS');
      exits.push(new Exit(22 * TILE - 35, 9 * TILE - 42));
    } else if (roomNum === 3) {
      fillRow(13, 1, 22, 1);
      fillRow(10, 1, 6, 1);
      fillRow(7, 9, 14, 1);
      fillRow(10, 17, 22, 1);
      fillCol(1, 1, 9, 2);
      fillCol(6, 1, 9, 2);
      fillCol(9, 1, 6, 2);
      fillCol(14, 1, 6, 2);
      fillCol(17, 1, 9, 2);
      fillCol(22, 1, 9, 2);
      fillRow(1, 2, 22, 2);
      buttons.push(new Button(3 * TILE, 10 * TILE - 10, 'door1'));
      buttons.push(new Button(19 * TILE, 10 * TILE - 10, 'door2'));
      doors.push(new Door(11 * TILE, 7 * TILE - TILE * 2 + 2, 'door1'));
      doors.push(new Door(12 * TILE, 7 * TILE - TILE * 2 + 2, 'door2'));
      player = new Player(60, 13 * TILE - 14, '#4af', 'You');
      ai = new Player(530, 13 * TILE - 14, '#fa4', 'ATLAS');
      exits.push(new Exit(11.5 * TILE, 7 * TILE - 42));
    } else if (roomNum === 4) {
      fillRow(13, 1, 7, 1);
      fillRow(13, 10, 22, 1);
      fillRow(4, 17, 22, 1);
      fillRow(9, 10, 14, 1);
      fillCol(1, 1, 12, 2);
      fillCol(7, 7, 12, 2);
      fillCol(10, 7, 12, 2);
      fillRow(13, 8, 9, 2);
      fillCol(22, 1, 12, 2);
      fillCol(17, 5, 12, 2);
      fillRow(1, 2, 22, 2);
      cubes.push(new Cube(12 * TILE, 9 * TILE - 12));
      buttons.push(new Button(12 * TILE, 13 * TILE - 10, 'door1'));
      buttons.push(new Button(20 * TILE, 4 * TILE - 10, 'door2'));
      doors.push(new Door(15 * TILE, 9 * TILE - TILE * 2 + 2, 'door1'));
      doors.push(new Door(19 * TILE, 4 * TILE - TILE * 2 + 2, 'door2'));
      player = new Player(60, 13 * TILE - 14, '#4af', 'You');
      ai = new Player(95, 13 * TILE - 14, '#fa4', 'ATLAS');
      exits.push(new Exit(21 * TILE, 4 * TILE - 42));
    }

    if (player) {
      player.portalBlue = null; player.portalOrange = null;
      player.atExit = false; player.teleportCooldown = 0;
    }
    if (ai) {
      ai.portalBlue = null; ai.portalOrange = null;
      ai.atExit = false; ai.teleportCooldown = 0;
    }
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  function moveEntity(ent) {
    ent.vy += GRAVITY;
    if (ent.vy > 12) ent.vy = 12;

    let hw = ent.w / 2, hh = ent.h / 2;

    let newX = ent.x + ent.vx;
    if (!isSolid(newX - hw, ent.y - hh + 2) && !isSolid(newX + hw - 1, ent.y - hh + 2) &&
        !isSolid(newX - hw, ent.y + hh - 1) && !isSolid(newX + hw - 1, ent.y + hh - 1) &&
        !isSolid(newX - hw, ent.y) && !isSolid(newX + hw - 1, ent.y)) {
      ent.x = newX;
    } else {
      ent.vx = 0;
    }

    ent.onGround = false;
    let newY = ent.y + ent.vy;
    if (!isSolid(ent.x - hw + 2, newY - hh) && !isSolid(ent.x + hw - 3, newY - hh) &&
        !isSolid(ent.x - hw + 2, newY + hh - 1) && !isSolid(ent.x + hw - 3, newY + hh - 1)) {
      ent.y = newY;
    } else {
      if (ent.vy > 0) ent.onGround = true;
      ent.vy = 0;
    }

    if (ent.teleportCooldown > 0) ent.teleportCooldown--;
    ent.x = Math.max(hw + TILE, Math.min(W - hw - TILE, ent.x));
    ent.y = Math.max(hh + TILE, Math.min(H - hh - TILE, ent.y));
  }

  // ── Portal mechanics ──────────────────────────────────────────────────────

  function firePortal(owner, type) {
    let dir = owner.facingRight ? 1 : -1;
    portalProjectiles.push({
      x: owner.x + dir * 10,
      y: owner.y - 4,
      vx: dir * 12,
      vy: -1.5,
      owner,
      type,
      color: type === 'blue' ? '#4af' : '#f84',
      life: 80
    });
  }

  function placePortal(proj) {
    let px = proj.x, py = proj.y;
    let nx = 0, ny = 0;

    let tc = Math.floor(px / TILE), tr = Math.floor(py / TILE);
    let prevX = px - proj.vx, prevY = py - proj.vy;
    let prevC = Math.floor(prevX / TILE), prevR = Math.floor(prevY / TILE);

    if (prevC < tc)      { nx = -1; px = tc * TILE; }
    else if (prevC > tc) { nx = 1;  px = (tc + 1) * TILE; }
    else if (prevR < tr) { ny = -1; py = tr * TILE; }
    else if (prevR > tr) { ny = 1;  py = (tr + 1) * TILE; }
    else {
      if (Math.abs(proj.vx) > Math.abs(proj.vy)) {
        nx = proj.vx > 0 ? -1 : 1;
        px = nx === -1 ? tc * TILE : (tc + 1) * TILE;
      } else {
        ny = proj.vy > 0 ? -1 : 1;
        py = ny === -1 ? tr * TILE : (tr + 1) * TILE;
      }
    }

    let portal = new Portal(px, py, nx, ny, proj.color);
    if (proj.type === 'blue') {
      proj.owner.portalBlue = portal;
    } else {
      proj.owner.portalOrange = portal;
    }

    // Spawn particles
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 20, color: proj.color
      });
    }
  }

  function checkPortalTransport(ent) {
    if (ent.teleportCooldown > 0) return;

    for (let owner of [player, ai]) {
      let portals = [
        { portal: owner.portalBlue,   other: owner.portalOrange },
        { portal: owner.portalOrange, other: owner.portalBlue   },
      ];

      for (let { portal, other } of portals) {
        if (!portal || !other) continue;

        let dist = Math.hypot(ent.x - portal.x, ent.y - portal.y);
        if (dist > 16) continue;

        // Teleport
        ent.x = other.x + other.nx * 18;
        ent.y = other.y + other.ny * 18;

        // Redirect velocity through the exit normal
        let speed = Math.hypot(ent.vx, ent.vy) + 1;
        if (other.nx !== 0) {
          ent.vx = other.nx * Math.max(speed, 4);
          ent.vy *= 0.5;
        } else if (other.ny !== 0) {
          ent.vy = other.ny < 0 ? -Math.max(speed, 6) : Math.max(speed, 4);
          ent.vx *= 0.5;
        }

        ent.teleportCooldown = 20;

        // Particles
        for (let i = 0; i < 8; i++) {
          particles.push({
            x: other.x, y: other.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 18, color: other.color
          });
        }
        return;
      }
    }
  }

  // ── Buttons / Doors / Exit ────────────────────────────────────────────────

  function checkButtons() {
    for (let btn of buttons) {
      btn.pressed = false;
      for (let p of [player, ai]) {
        if (Math.abs(p.x - btn.x - btn.w / 2) < 22 && Math.abs((p.y + p.h / 2) - btn.y) < 16) {
          btn.pressed = true;
        }
      }
      for (let c of cubes) {
        if (Math.abs(c.x - btn.x - btn.w / 2) < 22 && Math.abs((c.y + c.h / 2) - btn.y) < 16) {
          btn.pressed = true;
        }
      }
    }
    for (let d of doors) {
      let shouldOpen = buttons.some(b => b.targetId === d.id && b.pressed);
      d.open = shouldOpen;
      d.openAmount += ((d.open ? 1 : 0) - d.openAmount) * 0.1;
    }
  }

  function checkExit() {
    for (let ex of exits) {
      player.atExit = false;
      ai.atExit = false;
      for (let p of [player, ai]) {
        if (Math.abs(p.x - ex.x - ex.w / 2) < 25 && Math.abs(p.y - ex.y - ex.h / 2) < 30) {
          p.atExit = true;
        }
      }
    }
    if (player.atExit && ai.atExit) completeRoom();
  }

  function completeRoom() {
    let timeBonus = Math.max(0, 60 - elapsed);
    score += 100 + timeBonus;
    if (scoreEl) scoreEl.textContent = score;
    currentRoom++;
    if (currentRoom >= 5) {
      game.setState('over');
      game.showOverlay('ALL ROOMS COMPLETE!', 'Final Score: ' + score + ' | Click to play again');
    } else {
      if (roomEl) roomEl.textContent = currentRoom + 1;
      buildRoom(currentRoom);
      roomStartTime = Date.now();
    }
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  function updateAI() {
    aiThinkTimer++;
    aiPortalTimer--;
    if (aiJumpTimer > 0) aiJumpTimer--;

    if (aiThinkTimer % 20 === 0) aiAction = decideAIAction();

    let targetX = player.x, targetY = player.y;

    if (aiAction === 'goToButton') {
      for (let btn of buttons) {
        if (!btn.pressed) { targetX = btn.x + btn.w / 2; targetY = btn.y - 20; break; }
      }
    } else if (aiAction === 'goToExit') {
      if (exits.length > 0) { targetX = exits[0].x + exits[0].w / 2; targetY = exits[0].y; }
    } else if (aiAction === 'standOnButton') {
      for (let btn of buttons) {
        if (btn.pressed && Math.abs(ai.x - btn.x - btn.w / 2) < 25) {
          targetX = btn.x + btn.w / 2; targetY = btn.y - 15; break;
        }
        if (!btn.pressed) { targetX = btn.x + btn.w / 2; targetY = btn.y - 15; break; }
      }
    } else if (aiAction === 'pushCube') {
      if (cubes.length > 0) {
        let cube = cubes[0];
        let targetBtn = buttons.find(b => !b.pressed) || null;
        if (targetBtn) {
          let pushDir = cube.x < targetBtn.x + targetBtn.w / 2 ? -1 : 1;
          targetX = cube.x + pushDir * 18;
          targetY = cube.y;
        }
      }
    }

    let dx = targetX - ai.x;
    if (Math.abs(dx) > 6) {
      ai.vx += dx > 0 ? 0.6 : -0.6;
      ai.facingRight = dx > 0;
    } else {
      ai.vx *= 0.7;
    }
    ai.vx *= 0.88;
    if (Math.abs(ai.vx) > MOVE_SPEED) ai.vx = Math.sign(ai.vx) * MOVE_SPEED;

    if (ai.onGround && aiJumpTimer <= 0) {
      let needJump = false;
      if (targetY < ai.y - 35) needJump = true;
      if (Math.abs(dx) > 8 && isSolid(ai.x + Math.sign(dx) * 12, ai.y)) needJump = true;
      if (Math.abs(dx) > 8 && !isSolid(ai.x + Math.sign(dx) * 20, ai.y + ai.h / 2 + 5) &&
          isSolid(ai.x, ai.y + ai.h / 2 + 5)) needJump = true;
      if (needJump) { ai.vy = JUMP_FORCE; aiJumpTimer = 20; }
    }

    if (aiPortalTimer <= 0 && aiThinkTimer > 40) {
      if (aiPlacePortals()) aiPortalTimer = 120;
    }
  }

  function decideAIAction() {
    if (player.atExit) return 'goToExit';

    let hasClosedDoor = doors.some(d => d.openAmount < 0.5);
    let hasUnpressedButton = buttons.some(b => !b.pressed);

    for (let btn of buttons) {
      if (Math.abs(ai.x - btn.x - btn.w / 2) < 25 && Math.abs(ai.y + ai.h / 2 - btn.y) < 16) {
        if (doors.some(d => d.id === btn.targetId && d.openAmount < 0.5)) return 'standOnButton';
      }
    }

    if (hasClosedDoor && hasUnpressedButton) {
      if (cubes.length > 0) {
        let cubeOnButton = buttons.some(b => cubes.some(c => Math.abs(c.x - b.x - b.w / 2) < 22));
        if (!cubeOnButton && currentRoom === 2) return 'pushCube';
      }
      let playerNearButton = buttons.some(b => Math.abs(player.x - b.x - b.w / 2) < 50);
      if (playerNearButton) return 'goToExit';
      return 'goToButton';
    }

    if (!hasClosedDoor && exits.length > 0) {
      if (Math.hypot(player.x - exits[0].x, player.y - exits[0].y) < 100) return 'goToExit';
    }
    return 'follow';
  }

  function aiPlacePortals() {
    let target = null;
    if (aiAction === 'goToButton') {
      let btn = buttons.find(b => !b.pressed);
      if (btn) target = { x: btn.x + btn.w / 2, y: btn.y - 10 };
    } else if (aiAction === 'goToExit') {
      if (exits.length > 0) target = { x: exits[0].x + exits[0].w / 2, y: exits[0].y };
    }
    if (!target) return false;

    let dy = target.y - ai.y, dx = target.x - ai.x;
    if (Math.abs(dy) < 40 && Math.abs(dx) < 80) return false;

    let placed1 = false, placed2 = false;

    // Blue near AI
    let sr = Math.floor(ai.y / TILE), sc = Math.floor(ai.x / TILE);
    for (let dr = -2; dr <= 2 && !placed1; dr++) {
      for (let dc = -2; dc <= 2 && !placed1; dc++) {
        let r = sr + dr, c = sc + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || tiles[r][c] !== 2) continue;
        if (c > 0 && tiles[r][c-1] === 0)         { ai.portalBlue = new Portal(c * TILE, r * TILE + TILE/2, -1, 0, '#4af'); placed1 = true; }
        else if (c < COLS-1 && tiles[r][c+1] === 0) { ai.portalBlue = new Portal((c+1)*TILE, r*TILE+TILE/2, 1, 0, '#4af'); placed1 = true; }
        else if (r > 0 && tiles[r-1][c] === 0)      { ai.portalBlue = new Portal(c*TILE+TILE/2, r*TILE, 0, -1, '#4af'); placed1 = true; }
        else if (r < ROWS-1 && tiles[r+1][c] === 0) { ai.portalBlue = new Portal(c*TILE+TILE/2, (r+1)*TILE, 0, 1, '#4af'); placed1 = true; }
      }
    }

    // Orange near target
    sr = Math.floor(target.y / TILE); sc = Math.floor(target.x / TILE);
    for (let dr = -3; dr <= 3 && !placed2; dr++) {
      for (let dc = -3; dc <= 3 && !placed2; dc++) {
        let r = sr + dr, c = sc + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || tiles[r][c] !== 2) continue;
        if (c > 0 && tiles[r][c-1] === 0)           { ai.portalOrange = new Portal(c*TILE, r*TILE+TILE/2, -1, 0, '#f84'); placed2 = true; }
        else if (c < COLS-1 && tiles[r][c+1] === 0) { ai.portalOrange = new Portal((c+1)*TILE, r*TILE+TILE/2, 1, 0, '#f84'); placed2 = true; }
        else if (r > 0 && tiles[r-1][c] === 0)      { ai.portalOrange = new Portal(c*TILE+TILE/2, r*TILE, 0, -1, '#f84'); placed2 = true; }
        else if (r < ROWS-1 && tiles[r+1][c] === 0) { ai.portalOrange = new Portal(c*TILE+TILE/2, (r+1)*TILE, 0, 1, '#f84'); placed2 = true; }
      }
    }

    if (placed1 && placed2) {
      for (let p of [ai.portalBlue, ai.portalOrange]) {
        if (!p) continue;
        for (let i = 0; i < 6; i++) {
          particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 15, color: p.color });
        }
      }
      return true;
    }
    return false;
  }

  // ── Input / Projectiles / Particles / Cubes ───────────────────────────────

  function handleInput() {
    player.vx = 0;
    if (game.input.isDown('ArrowLeft'))  { player.vx = -MOVE_SPEED; player.facingRight = false; }
    if (game.input.isDown('ArrowRight')) { player.vx =  MOVE_SPEED; player.facingRight = true; }
    if (game.input.isDown('ArrowUp') && player.onGround) player.vy = JUMP_FORCE;
    if (game.input.wasPressed('z')) firePortal(player, 'blue');
    if (game.input.wasPressed('x')) firePortal(player, 'orange');
  }

  function updateProjectiles() {
    for (let i = portalProjectiles.length - 1; i >= 0; i--) {
      let p = portalProjectiles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.12;
      p.life--;

      if (p.life % 2 === 0) {
        particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5, life: 10, color: p.color });
      }

      let tc = Math.floor(p.x / TILE), tr = Math.floor(p.y / TILE);
      if (tc >= 0 && tc < COLS && tr >= 0 && tr < ROWS && tiles[tr][tc] !== 0) {
        if (tiles[tr][tc] === 2) {
          placePortal(p);
        } else {
          for (let j = 0; j < 4; j++) {
            particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 10, color: '#888' });
          }
        }
        portalProjectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        portalProjectiles.splice(i, 1);
      }
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateCubes() {
    for (let cube of cubes) {
      for (let p of [player, ai]) {
        let dx = cube.x - p.x, dy = cube.y - p.y;
        if (Math.abs(dx) < cube.w/2 + p.w/2 + 4 && Math.abs(dy) < cube.h/2 + p.h/2) {
          if (Math.abs(dx) > Math.abs(dy) * 0.5) cube.vx += Math.sign(dx) * 0.5;
        }
      }
      cube.vy += GRAVITY;
      cube.vx *= 0.82;
      moveEntity(cube);
      checkPortalTransport(cube);
    }
  }

  // ── Start / Restart ───────────────────────────────────────────────────────

  function startGame() {
    score = 0;
    currentRoom = 0;
    elapsed = 0;
    aiThinkTimer = 0; aiPortalTimer = 0; aiJumpTimer = 0; aiAction = 'follow';
    if (scoreEl) scoreEl.textContent = '0';
    if (roomEl)  roomEl.textContent  = '1';
    buildRoom(0);
    roomStartTime = Date.now();
    game.setState('playing');
  }

  // ── Engine hooks ──────────────────────────────────────────────────────────

  game.onInit = () => {
    buildRoom(0);
    game.showOverlay('PORTAL 2D CO-OP', 'Arrows = Move/Jump | Z = Blue Portal | X = Orange Portal');
    game.setState('waiting');

    game.canvas.parentElement.addEventListener('click', () => {
      if (game.state === 'waiting' || game.state === 'over') startGame();
    });
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;

    elapsed = Math.floor((Date.now() - roomStartTime) / 1000);
    if (timerEl) timerEl.textContent = elapsed;

    handleInput();
    updateAI();
    moveEntity(player);
    moveEntity(ai);
    checkPortalTransport(player);
    checkPortalTransport(ai);
    updateProjectiles();
    updateParticles();
    updateCubes();
    checkButtons();
    checkExit();
  };

  // ── Drawing ───────────────────────────────────────────────────────────────

  function drawPortalOval(renderer, portal) {
    if (!portal) return;

    let pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;
    let px = portal.x, py = portal.y;

    // Glow halo
    renderer.setGlow(portal.color, 0.8);
    let rX = portal.nx !== 0 ? 6 * pulse : 17 * pulse;
    let rY = portal.nx !== 0 ? 17 * pulse : 6 * pulse;
    renderer.fillRect(px - rX, py - rY, rX * 2, rY * 2, portal.color + '33');
    renderer.setGlow(null);

    // Outer ring — approximate ellipse with fillPoly
    let pts = [];
    let segs = 20;
    for (let i = 0; i < segs; i++) {
      let a = (i / segs) * Math.PI * 2;
      pts.push({ x: px + Math.cos(a) * rX, y: py + Math.sin(a) * rY });
    }
    renderer.setGlow(portal.color, 1.0);
    renderer.strokePoly(pts, portal.color, 3, true);
    renderer.setGlow(null);

    // Inner ring
    let rX2 = rX * 0.55, rY2 = rY * 0.55;
    let pts2 = [];
    for (let i = 0; i < segs; i++) {
      let a = (i / segs) * Math.PI * 2;
      pts2.push({ x: px + Math.cos(a) * rX2, y: py + Math.sin(a) * rY2 });
    }
    renderer.strokePoly(pts2, '#ffffff88', 1.5, true);
  }

  function drawPlayer(renderer, text, p) {
    let px = Math.round(p.x), py = Math.round(p.y);
    let bx = px - p.w / 2, by = py - p.h / 2;

    // Drop shadow
    renderer.fillRect(bx + 2, py + p.h / 2 - 2, p.w, 3, '#00000066');

    // Body (approximated rounded rect with fillPoly)
    let bw = p.w, bh = p.h, r = 3;
    let bodyPts = [
      { x: bx + r, y: by },
      { x: bx + bw - r, y: by },
      { x: bx + bw, y: by + r },
      { x: bx + bw, y: by + bh - r },
      { x: bx + bw - r, y: by + bh },
      { x: bx + r, y: by + bh },
      { x: bx, y: by + bh - r },
      { x: bx, y: by + r },
    ];
    renderer.setGlow(p.color, 0.5);
    renderer.fillPoly(bodyPts, p.color);
    renderer.setGlow(null);

    // Visor
    let visorX = p.facingRight ? px + 1 : px - 6;
    renderer.fillRect(visorX, by + 4, 6, 4, '#ffffff');
    renderer.fillRect(visorX + 1, by + 5, 4, 2, p === player ? '#08f' : '#f80');

    // Portal gun
    let armDir = p.facingRight ? 1 : -1;
    renderer.fillRect(px + armDir * 5, py + 1, armDir * 10, 3, '#777777');
    renderer.fillRect(px + armDir * 12, py - 1, armDir * 5, 5, '#aaaaaa');

    // Legs
    let legAnim = Math.sin(Date.now() / 100 + (p === ai ? 1 : 0)) * (Math.abs(p.vx) > 0.5 ? 3 : 0);
    renderer.fillRect(px - 4, py + p.h / 2 - 1, 3, 4 + legAnim, p.color);
    renderer.fillRect(px + 2, py + p.h / 2 - 1, 3, 4 - legAnim, p.color);

    // Name tag
    renderer.setGlow(p.color, 0.4);
    text.drawText(p.name, px, by - 14, 9, p.color, 'center');
    renderer.setGlow(null);
  }

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a1a');

    // Subtle grid lines
    for (let x = 0; x < W; x += TILE) {
      renderer.drawLine(x, 0, x, H, '#151525', 0.5);
    }
    for (let y = 0; y < H; y += TILE) {
      renderer.drawLine(0, y, W, y, '#151525', 0.5);
    }

    // Tiles
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let t = tiles[row][col];
        let tx = col * TILE, ty = row * TILE;
        if (t === 1) {
          renderer.fillRect(tx, ty, TILE, TILE, '#2a2a3a');
          renderer.fillRect(tx + 1, ty + 1, TILE - 2, TILE - 2, '#333345');
          renderer.fillRect(tx + 3, ty + 3, TILE - 6, 1, '#3a3a4a');
          renderer.fillRect(tx + 3, ty + TILE - 4, TILE - 6, 1, '#3a3a4a');
        } else if (t === 2) {
          renderer.fillRect(tx, ty, TILE, TILE, '#222235');
          renderer.strokePoly([
            { x: tx+2, y: ty+2 }, { x: tx+TILE-2, y: ty+2 },
            { x: tx+TILE-2, y: ty+TILE-2 }, { x: tx+2, y: ty+TILE-2 }
          ], '#3a3a55', 1, true);
          // Portalable indicator dots
          renderer.fillRect(tx + 5, ty + 5, 2, 2, '#3a3a55');
          renderer.fillRect(tx + TILE - 7, ty + 5, 2, 2, '#3a3a55');
          renderer.fillRect(tx + 5, ty + TILE - 7, 2, 2, '#3a3a55');
          renderer.fillRect(tx + TILE - 7, ty + TILE - 7, 2, 2, '#3a3a55');
        }
      }
    }

    // Doors
    for (let d of doors) {
      let dh = d.h * (1 - d.openAmount);
      // Frame
      renderer.strokePoly([
        { x: d.x-1, y: d.y-1 }, { x: d.x+d.w+1, y: d.y-1 },
        { x: d.x+d.w+1, y: d.y+d.h+1 }, { x: d.x-1, y: d.y+d.h+1 }
      ], '#887744', 2, true);
      // Door body
      if (dh > 2) {
        renderer.fillRect(d.x, d.y, d.w, dh, '#554422');
        // Hazard stripes
        for (let s = 0; s < dh; s += 8) {
          renderer.fillRect(d.x, d.y + s, d.w, 2, '#44331166');
        }
      }
      // Light indicator
      let lightColor = d.openAmount > 0.5 ? '#4f4' : '#f44';
      renderer.setGlow(lightColor, 0.8);
      renderer.fillCircle(d.x + d.w / 2, d.y - 5, 3, lightColor);
      renderer.setGlow(null);
    }

    // Buttons
    for (let btn of buttons) {
      renderer.fillRect(btn.x - 3, btn.y + btn.h - 3, btn.w + 6, 5, '#444444');
      let bh = btn.pressed ? 2 : btn.h;
      let bColor = btn.pressed ? '#4f4' : '#e44';
      renderer.setGlow(bColor, 0.6);
      renderer.fillRect(btn.x, btn.y + btn.h - bh, btn.w, bh, bColor);
      renderer.setGlow(null);
    }

    // Exits
    for (let ex of exits) {
      let pulse = Math.sin(Date.now() / 250) * 0.3 + 0.7;
      let alpha = Math.round(pulse * 0.15 * 255).toString(16).padStart(2, '0');
      let alphaFull = Math.round(pulse * 255).toString(16).padStart(2, '0');
      renderer.fillRect(ex.x - 20, ex.y - 20, ex.w + 40, ex.h + 40, '#44ff88' + alpha);
      renderer.fillRect(ex.x, ex.y, ex.w, ex.h, '#44ff88' + Math.round(pulse * 0.15 * 255).toString(16).padStart(2, '0'));
      renderer.setGlow('#4f8', 1.0);
      renderer.strokePoly([
        { x: ex.x, y: ex.y }, { x: ex.x+ex.w, y: ex.y },
        { x: ex.x+ex.w, y: ex.y+ex.h }, { x: ex.x, y: ex.y+ex.h }
      ], '#44ff88' + alphaFull, 2, true);
      renderer.setGlow(null);

      // Chevrons
      let cx = ex.x + ex.w / 2, cy = ex.y + ex.h / 2;
      let cAlpha = Math.round(pulse * 0.6 * 255).toString(16).padStart(2, '0');
      for (let i = -1; i <= 1; i++) {
        renderer.strokePoly([
          { x: cx - 6, y: cy + i * 10 + 3 },
          { x: cx,     y: cy + i * 10 - 3 },
          { x: cx + 6, y: cy + i * 10 + 3 },
        ], '#44ff88' + cAlpha, 2, false);
      }

      text.drawText('EXIT', cx, ex.y - 13, 9, '#44ff88', 'center');
    }

    // Cubes
    for (let cube of cubes) {
      let cx = cube.x - cube.w / 2, cy = cube.y - cube.h / 2;
      // Shadow
      renderer.fillRect(cx + 2, cy + cube.h, cube.w, 3, '#00000066');
      // Body gradient — approximate with two rects
      renderer.fillRect(cx, cy, cube.w, cube.h, '#666666');
      renderer.fillRect(cx, cy, cube.w / 2, cube.h, '#777777');
      renderer.strokePoly([
        { x: cx, y: cy }, { x: cx+cube.w, y: cy },
        { x: cx+cube.w, y: cy+cube.h }, { x: cx, y: cy+cube.h }
      ], '#999999', 1, true);
      // Heart (Companion Cube)
      let hx = cube.x, hy = cube.y - 1;
      renderer.setGlow('#f8a', 0.5);
      let heartPts = [];
      for (let i = 0; i <= 24; i++) {
        let t2 = (i / 24) * Math.PI * 2;
        let hpx = hx + 5 * (16 * Math.pow(Math.sin(t2), 3)) / 16;
        let hpy = hy + 5 * -(13*Math.cos(t2) - 5*Math.cos(2*t2) - 2*Math.cos(3*t2) - Math.cos(4*t2)) / 16;
        heartPts.push({ x: hpx, y: hpy });
      }
      renderer.fillPoly(heartPts, '#ff88aa');
      renderer.setGlow(null);
    }

    // Portals
    drawPortalOval(renderer, player.portalBlue);
    drawPortalOval(renderer, player.portalOrange);
    drawPortalOval(renderer, ai.portalBlue);
    drawPortalOval(renderer, ai.portalOrange);

    // Portal connection lines (dashed)
    for (let p of [player, ai]) {
      if (p.portalBlue && p.portalOrange) {
        let connColor = p === player ? '#44aaff1f' : '#ff88441f';
        renderer.dashedLine(
          p.portalBlue.x, p.portalBlue.y,
          p.portalOrange.x, p.portalOrange.y,
          connColor, 1, 3, 5
        );
      }
    }

    // Portal projectiles
    for (let p of portalProjectiles) {
      renderer.setGlow(p.color, 1.0);
      renderer.fillCircle(p.x, p.y, 4, p.color);
      renderer.fillCircle(p.x, p.y, 1.5, '#ffffff');
      renderer.setGlow(null);
    }

    // Particles
    for (let p of particles) {
      let alpha = Math.min(1, p.life / 15);
      let a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      let size = 1.5 + (p.life / 20) * 1.5;
      renderer.fillRect(p.x - size/2, p.y - size/2, size, size, p.color + a);
    }

    // Players
    drawPlayer(renderer, text, player);
    drawPlayer(renderer, text, ai);

    // HUD
    text.drawText('P1:', 8, H - 18, 10, '#4af', 'left');
    text.drawText('B', 32, H - 18, 10, player.portalBlue   ? '#4af' : '#333', 'left');
    text.drawText('O', 44, H - 18, 10, player.portalOrange ? '#f84' : '#333', 'left');
    text.drawText('AI:', 65, H - 18, 10, '#fa4', 'left');
    text.drawText('B', 90, H - 18, 10, ai.portalBlue   ? '#4af' : '#333', 'left');
    text.drawText('O', 102, H - 18, 10, ai.portalOrange ? '#f84' : '#333', 'left');

    // Room 1 hint
    if (currentRoom === 0 && elapsed < 8 && game.state === 'playing') {
      let alpha = Math.max(0, 1 - elapsed / 8);
      let a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      text.drawText('Place portals on lighter walls to cross the gap!', W / 2, 30, 11, '#44aaff' + a, 'center');
    }

    // Room transition flash
    if (currentRoom > 0 && game.state === 'playing') {
      let timeSince = (Date.now() - roomStartTime) / 1000;
      if (timeSince < 1.5) {
        let alpha = Math.max(0, 1 - timeSince / 1.5) * 0.6;
        let a = Math.round(alpha * 255).toString(16).padStart(2, '0');
        text.drawText('ROOM ' + (currentRoom + 1), W / 2, H / 2, 20, '#44ff88' + a, 'center');
      }
    }
  };

  game.start();
  return game;
}
