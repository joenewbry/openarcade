'use strict';

const { Server } = require('socket.io');

// ── Room and player registries ──────────────────────────────
// roomId -> { roomId, gameId, players[], maxPlayers, status, settings, created, hostId }
const rooms = new Map();
// socketId -> { socketId, name, roomId, joinedAt }
const players = new Map();

// ── Config ──────────────────────────────────────────────────
const MAX_PLAYERS_DEFAULT = 4;
const ROOM_ID_LENGTH = 6;
const NAME_MAX_LENGTH = 20;
const MESSAGE_MAX_BYTES = 4096;
const WAITING_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
const CLEANUP_DELAY_MS = 10 * 1000;          // 10 seconds

// ── Helpers ─────────────────────────────────────────────────

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id;
  do {
    id = '';
    for (let i = 0; i < ROOM_ID_LENGTH; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(id));
  return id;
}

function sanitizeName(name) {
  if (typeof name !== 'string') return 'Anonymous';
  const clean = name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim().slice(0, NAME_MAX_LENGTH);
  return clean || 'Anonymous';
}

function roomToJSON(room) {
  return {
    roomId: room.roomId,
    gameId: room.gameId,
    players: room.players.map(p => ({ socketId: p.socketId, name: p.name })),
    maxPlayers: room.maxPlayers,
    status: room.status,
    settings: room.settings,
    created: room.created,
    hostId: room.hostId,
    playerCount: room.players.length,
  };
}

function findWaitingRoom(gameId) {
  for (const room of rooms.values()) {
    if (room.status !== 'waiting') continue;
    if (room.players.length >= room.maxPlayers) continue;
    if (gameId && room.gameId !== gameId) continue;
    return room;
  }
  return null;
}

function broadcastRoomUpdate(io, room) {
  const data = roomToJSON(room);
  for (const p of room.players) {
    io.to(p.socketId).emit('room-updated', data);
  }
}

function removePlayerFromRoom(io, socket, reason) {
  const player = players.get(socket.id);
  if (!player || !player.roomId) return;

  const room = rooms.get(player.roomId);
  if (!room) {
    player.roomId = null;
    return;
  }

  // Remove player from room's player list
  room.players = room.players.filter(p => p.socketId !== socket.id);
  socket.leave(room.roomId);
  player.roomId = null;

  // Notify remaining players
  for (const p of room.players) {
    io.to(p.socketId).emit('player-left', { socketId: socket.id, name: player.name });
  }

  // If room is now empty, schedule cleanup
  if (room.players.length === 0) {
    scheduleRoomCleanup(io, room.roomId);
  } else {
    // Reassign host if the host left
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].socketId;
    }
    broadcastRoomUpdate(io, room);
  }
}

function scheduleRoomCleanup(io, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = 'cleanup';

  setTimeout(() => {
    const current = rooms.get(roomId);
    if (!current) return;
    // Only destroy if still empty or in cleanup
    if (current.players.length === 0 || current.status === 'cleanup') {
      // Notify any lingering players (edge case: someone joined during cleanup)
      for (const p of current.players) {
        io.to(p.socketId).emit('room-closed', { roomId, reason: 'empty' });
        const pl = players.get(p.socketId);
        if (pl) pl.roomId = null;
      }
      rooms.delete(roomId);
    }
  }, CLEANUP_DELAY_MS);
}

function scheduleWaitingTimeout(io, roomId) {
  setTimeout(() => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.status !== 'waiting') return;
    if (room.players.length === 0) {
      rooms.delete(roomId);
      return;
    }
    // Room still waiting after timeout -- close it
    for (const p of room.players) {
      io.to(p.socketId).emit('room-closed', { roomId, reason: 'timeout' });
      const pl = players.get(p.socketId);
      if (pl) pl.roomId = null;
    }
    rooms.delete(roomId);
  }, WAITING_TIMEOUT_MS);
}

// ── Main initializer ────────────────────────────────────────

function initMatchmaker(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/matchmaker',
    pingInterval: 10000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    // Register player
    players.set(socket.id, {
      socketId: socket.id,
      name: 'Anonymous',
      roomId: null,
      joinedAt: Date.now(),
    });

    console.log(`[matchmaker] connected: ${socket.id}`);

    // ── set-name ──────────────────────────────────────────
    socket.on('set-name', ({ name } = {}) => {
      const player = players.get(socket.id);
      if (player) {
        player.name = sanitizeName(name);
      }
    });

    // ── create-room ───────────────────────────────────────
    socket.on('create-room', ({ gameId, maxPlayers, settings } = {}, ack) => {
      const player = players.get(socket.id);
      if (!player) return;

      if (player.roomId) {
        socket.emit('error', { message: 'Already in a room. Leave first.' });
        return;
      }

      if (!gameId || typeof gameId !== 'string') {
        socket.emit('error', { message: 'gameId is required.' });
        return;
      }

      const roomId = generateRoomId();
      const room = {
        roomId,
        gameId,
        players: [{ socketId: socket.id, name: player.name }],
        maxPlayers: Math.min(Math.max(parseInt(maxPlayers, 10) || MAX_PLAYERS_DEFAULT, 2), 16),
        status: 'waiting',
        settings: settings || {},
        created: Date.now(),
        hostId: socket.id,
      };

      rooms.set(roomId, room);
      player.roomId = roomId;
      socket.join(roomId);

      socket.emit('room-joined', roomToJSON(room));
      scheduleWaitingTimeout(io, roomId);

      console.log(`[matchmaker] room created: ${roomId} for game ${gameId} by ${player.name}`);

      if (typeof ack === 'function') ack(roomToJSON(room));
    });

    // ── join-room ─────────────────────────────────────────
    socket.on('join-room', ({ roomId } = {}) => {
      const player = players.get(socket.id);
      if (!player) return;

      if (player.roomId) {
        socket.emit('error', { message: 'Already in a room. Leave first.' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }
      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Room is not accepting players.' });
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full.' });
        return;
      }

      room.players.push({ socketId: socket.id, name: player.name });
      player.roomId = roomId;
      socket.join(roomId);

      // Notify existing players
      for (const p of room.players) {
        if (p.socketId !== socket.id) {
          io.to(p.socketId).emit('player-joined', { socketId: socket.id, name: player.name });
        }
      }

      socket.emit('room-joined', roomToJSON(room));
      broadcastRoomUpdate(io, room);

      console.log(`[matchmaker] ${player.name} joined room ${roomId}`);
    });

    // ── quick-play ────────────────────────────────────────
    socket.on('quick-play', ({ gameId } = {}) => {
      const player = players.get(socket.id);
      if (!player) return;

      if (player.roomId) {
        socket.emit('error', { message: 'Already in a room. Leave first.' });
        return;
      }

      const room = findWaitingRoom(gameId);

      if (room) {
        // Join existing room
        room.players.push({ socketId: socket.id, name: player.name });
        player.roomId = room.roomId;
        socket.join(room.roomId);

        for (const p of room.players) {
          if (p.socketId !== socket.id) {
            io.to(p.socketId).emit('player-joined', { socketId: socket.id, name: player.name });
          }
        }

        socket.emit('room-joined', roomToJSON(room));
        broadcastRoomUpdate(io, room);

        console.log(`[matchmaker] ${player.name} quick-matched into room ${room.roomId}`);
      } else {
        // Create a new room and wait
        const newGameId = gameId || 'any';
        const roomId = generateRoomId();
        const newRoom = {
          roomId,
          gameId: newGameId,
          players: [{ socketId: socket.id, name: player.name }],
          maxPlayers: MAX_PLAYERS_DEFAULT,
          status: 'waiting',
          settings: {},
          created: Date.now(),
          hostId: socket.id,
        };

        rooms.set(roomId, newRoom);
        player.roomId = roomId;
        socket.join(roomId);

        socket.emit('room-joined', roomToJSON(newRoom));
        scheduleWaitingTimeout(io, roomId);

        console.log(`[matchmaker] ${player.name} created quick-play room ${roomId} (game: ${newGameId})`);
      }
    });

    // ── leave-room ────────────────────────────────────────
    socket.on('leave-room', () => {
      removePlayerFromRoom(io, socket, 'left');
      socket.emit('room-closed', { roomId: null, reason: 'you left' });
    });

    // ── list-rooms ────────────────────────────────────────
    socket.on('list-rooms', ({ gameId } = {}, ack) => {
      const available = [];
      for (const room of rooms.values()) {
        if (room.status !== 'waiting') continue;
        if (room.players.length >= room.maxPlayers) continue;
        if (gameId && room.gameId !== gameId) continue;
        available.push(roomToJSON(room));
      }

      const response = { rooms: available };

      if (typeof ack === 'function') {
        ack(response);
      } else {
        socket.emit('room-list', response);
      }
    });

    // ── room-message ──────────────────────────────────────
    socket.on('room-message', ({ type, data } = {}) => {
      const player = players.get(socket.id);
      if (!player || !player.roomId) {
        socket.emit('error', { message: 'Not in a room.' });
        return;
      }

      // Basic payload size check
      const payload = JSON.stringify({ type, data });
      if (payload.length > MESSAGE_MAX_BYTES) {
        socket.emit('error', { message: 'Message too large.' });
        return;
      }

      const room = rooms.get(player.roomId);
      if (!room) return;

      // Relay to all other players in the room
      for (const p of room.players) {
        if (p.socketId !== socket.id) {
          io.to(p.socketId).emit('room-message', {
            from: { socketId: socket.id, name: player.name },
            type,
            data,
          });
        }
      }
    });

    // ── disconnect ────────────────────────────────────────
    socket.on('disconnect', () => {
      removePlayerFromRoom(io, socket, 'disconnect');
      players.delete(socket.id);
      console.log(`[matchmaker] disconnected: ${socket.id}`);
    });
  });

  // ── Stats helper (for health endpoint) ──────────────────
  io.matchmakerStats = () => ({
    rooms: rooms.size,
    players: players.size,
    roomList: Array.from(rooms.values()).map(roomToJSON),
  });

  console.log('[matchmaker] initialized on path /matchmaker');

  return io;
}

module.exports = { initMatchmaker };
