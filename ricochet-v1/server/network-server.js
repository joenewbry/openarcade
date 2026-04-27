import { WebSocketServer } from 'ws';

const PORT = Number(process.env.NET_PORT ?? 3001);
const TICK_RATE_MS = 50;
const PLAYER_RADIUS = 0.76;
const HIT_DAMAGE = 100;
const MAX_HIT_DISTANCE = 80;
const RESPAWN_MS = 3000;

const wss = new WebSocketServer({ port: PORT });

let nextPlayerId = 1;
const clientMeta = new Map(); // ws -> { playerId, sessionId }
const sessions = new Map();

console.log(`[network] ws server listening on :${PORT}`);

wss.on('connection', (ws) => {
  const playerId = `p${nextPlayerId++}`;
  clientMeta.set(ws, { playerId, sessionId: null });

  send(ws, { type: 'welcome', playerId, serverTime: Date.now() });

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', code: 'BAD_JSON', message: 'Invalid JSON' });
      return;
    }

    handleMessage(ws, message);
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleMessage(ws, message) {
  const meta = clientMeta.get(ws);
  if (!meta) return;

  switch (message.type) {
    case 'create_session': {
      const sessionId = createSessionId();
      const session = {
        id: sessionId,
        hostId: meta.playerId,
        clientId: null,
        sockets: new Map(),
        players: new Map(),
        scores: {}
      };

      session.sockets.set(meta.playerId, ws);
      session.players.set(meta.playerId, makePlayerState(meta.playerId, message.characterId));
      session.scores[meta.playerId] = 0;

      sessions.set(sessionId, session);
      meta.sessionId = sessionId;

      send(ws, { type: 'session_created', sessionId, role: 'host', playerId: meta.playerId });
      broadcastLobbyState(session);
      break;
    }

    case 'join_session': {
      const session = sessions.get(message.sessionId);
      if (!session) {
        send(ws, { type: 'error', code: 'NO_SESSION', message: 'Session not found' });
        return;
      }

      // Idempotent join for reconnect/retries.
      if (session.players.has(meta.playerId)) {
        session.sockets.set(meta.playerId, ws);
        meta.sessionId = message.sessionId;
        send(ws, {
          type: 'joined_session',
          sessionId: message.sessionId,
          role: 'client',
          playerId: meta.playerId
        });
        broadcastLobbyState(session);
        return;
      }

      if (session.clientId && session.clientId !== meta.playerId) {
        send(ws, { type: 'error', code: 'SESSION_FULL', message: 'Session already has 2 players' });
        return;
      }

      session.clientId = meta.playerId;
      session.sockets.set(meta.playerId, ws);
      session.players.set(meta.playerId, makePlayerState(meta.playerId, message.characterId));
      session.scores[meta.playerId] = session.scores[meta.playerId] ?? 0;
      meta.sessionId = message.sessionId;

      send(ws, {
        type: 'joined_session',
        sessionId: message.sessionId,
        role: 'client',
        playerId: meta.playerId
      });

      broadcast(session, {
        type: 'player_joined',
        playerId: meta.playerId,
        characterId: message.characterId
      }, meta.playerId);

      broadcastLobbyState(session);
      break;
    }

    case 'player_state': {
      const session = getSessionForSocket(ws);
      if (!session) return;

      const player = session.players.get(meta.playerId);
      if (!player) return;

      player.position = clampVec3(message.position, { x: 0, y: 1.6, z: 0 });
      player.yaw = Number(message.yaw ?? 0);
      player.pitch = Number(message.pitch ?? 0);
      player.t = Number(message.t ?? Date.now());

      broadcast(session, {
        type: 'player_state',
        playerId: meta.playerId,
        t: player.t,
        position: player.position,
        yaw: player.yaw,
        pitch: player.pitch
      }, meta.playerId);

      break;
    }

    case 'fire': {
      const session = getSessionForSocket(ws);
      if (!session) return;

      const shooter = session.players.get(meta.playerId);
      if (!shooter || !shooter.alive) return;

      const origin = clampVec3(message.origin, shooter.position);
      const direction = normalize(clampVec3(message.direction, { x: 0, y: 0, z: -1 }));
      const shotId = String(message.shotId ?? `${meta.playerId}-${Date.now()}`);
      const t = Number(message.t ?? Date.now());
      const ricochetBounces = Number.isFinite(message.ricochetBounces)
        ? Math.max(0, Math.min(6, Math.floor(message.ricochetBounces)))
        : 0;

      broadcast(session, {
        type: 'player_fire',
        playerId: meta.playerId,
        shotId,
        t,
        origin,
        direction,
        ricochetBounces
      }, meta.playerId);

      validateHitAndApply(session, meta.playerId, { origin, direction, shotId });
      break;
    }

    case 'respawn_request': {
      const session = getSessionForSocket(ws);
      if (!session) return;
      forceRespawn(session, meta.playerId);
      break;
    }

    case 'ping': {
      send(ws, { type: 'pong', t: Number(message.t ?? Date.now()) });
      break;
    }

    default:
      send(ws, { type: 'error', code: 'BAD_TYPE', message: 'Unknown message type' });
  }
}

function validateHitAndApply(session, shooterId, shot) {
  const target = getOpponent(session, shooterId);
  if (!target || !target.alive) return;

  const hitDistance = raySphereDistance(shot.origin, shot.direction, target.position, PLAYER_RADIUS);
  if (hitDistance === null || hitDistance > MAX_HIT_DISTANCE) return;

  target.hp = Math.max(0, target.hp - HIT_DAMAGE);

  broadcast(session, {
    type: 'damage',
    targetId: target.playerId,
    byPlayerId: shooterId,
    amount: HIT_DAMAGE,
    hp: target.hp,
    shotId: shot.shotId
  });

  if (target.hp > 0) return;

  target.alive = false;
  session.scores[shooterId] = (session.scores[shooterId] ?? 0) + 1;

  broadcast(session, {
    type: 'death',
    victimId: target.playerId,
    killerId: shooterId,
    scores: session.scores,
    respawnMs: RESPAWN_MS
  });

  broadcast(session, { type: 'score_update', scores: session.scores });

  setTimeout(() => {
    // session/target could be gone by now
    const freshSession = sessions.get(session.id);
    if (!freshSession) return;

    const freshTarget = freshSession.players.get(target.playerId);
    if (!freshTarget) return;

    freshTarget.hp = 100;
    freshTarget.alive = true;
    freshTarget.position = randomSpawn();

    broadcast(freshSession, {
      type: 'respawn',
      playerId: freshTarget.playerId,
      hp: freshTarget.hp,
      position: freshTarget.position
    });
  }, RESPAWN_MS);
}

function forceRespawn(session, playerId) {
  const player = session.players.get(playerId);
  if (!player) return;
  player.hp = 100;
  player.alive = true;
  player.position = randomSpawn();

  broadcast(session, {
    type: 'respawn',
    playerId,
    hp: 100,
    position: player.position
  });
}

function getOpponent(session, playerId) {
  for (const [id, state] of session.players.entries()) {
    if (id !== playerId) return state;
  }
  return null;
}

function getSessionForSocket(ws) {
  const meta = clientMeta.get(ws);
  if (!meta?.sessionId) return null;
  return sessions.get(meta.sessionId) ?? null;
}

function handleDisconnect(ws) {
  const meta = clientMeta.get(ws);
  if (!meta) return;

  const { playerId, sessionId } = meta;
  clientMeta.delete(ws);

  if (!sessionId) return;

  const session = sessions.get(sessionId);
  if (!session) return;

  session.sockets.delete(playerId);
  session.players.delete(playerId);
  delete session.scores[playerId];

  if (session.hostId === playerId) session.hostId = null;
  if (session.clientId === playerId) session.clientId = null;

  broadcast(session, { type: 'player_left', playerId });

  // Remove dead session
  if (!session.hostId && !session.clientId) {
    sessions.delete(sessionId);
    return;
  }

  // Promote client to host if needed
  if (!session.hostId && session.clientId) {
    session.hostId = session.clientId;
    session.clientId = null;
  }

  broadcastLobbyState(session);
}

function makePlayerState(playerId, characterId) {
  return {
    playerId,
    characterId: characterId ?? 'unknown',
    hp: 100,
    alive: true,
    t: Date.now(),
    position: randomSpawn(),
    yaw: 0,
    pitch: 0
  };
}

function broadcastLobbyState(session) {
  broadcast(session, {
    type: 'lobby_state',
    sessionId: session.id,
    hostId: session.hostId,
    clientId: session.clientId,
    players: Array.from(session.players.values()).map((p) => ({
      playerId: p.playerId,
      characterId: p.characterId,
      hp: p.hp,
      alive: p.alive
    })),
    scores: session.scores
  });
}

function broadcast(session, message, excludePlayerId = null) {
  for (const [playerId, socket] of session.sockets.entries()) {
    if (excludePlayerId && playerId === excludePlayerId) continue;
    send(socket, message);
  }
}

function send(ws, payload) {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify(payload));
}

function createSessionId() {
  return Math.random().toString(36).slice(2, 8);
}

function randomSpawn() {
  return {
    x: (Math.random() - 0.5) * 12,
    y: 1.6,
    z: (Math.random() - 0.5) * 12
  };
}

function clampVec3(value, fallback) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  const z = Number(value?.z);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return fallback;
  }

  return { x, y, z };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-6) return { x: 0, y: 0, z: -1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function raySphereDistance(origin, dir, center, radius) {
  const ocx = origin.x - center.x;
  const ocy = origin.y - center.y;
  const ocz = origin.z - center.z;

  const b = 2 * (ocx * dir.x + ocy * dir.y + ocz * dir.z);
  const c = ocx * ocx + ocy * ocy + ocz * ocz - radius * radius;
  const discriminant = b * b - 4 * c;

  if (discriminant < 0) return null;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / 2;
  const t2 = (-b + sqrtD) / 2;

  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}

setInterval(() => {
  // Keep process alive and easy to observe in logs.
  const openSessions = sessions.size;
  const openPlayers = Array.from(sessions.values()).reduce((acc, s) => acc + s.players.size, 0);
  if (openSessions > 0) {
    console.log(`[network] sessions=${openSessions} players=${openPlayers}`);
  }
}, 5000 + TICK_RATE_MS);
