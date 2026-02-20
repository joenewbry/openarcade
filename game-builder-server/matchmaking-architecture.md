# OpenArcade Matchmaking Server Architecture

## Overview

This document describes the architecture for the OpenArcade matchmaking server,
which provides real-time lobby management, room creation, and player matching
for multiplayer HTML5 games built through the Game Builder.

---

## 1. Current State

The OpenArcade game builder currently has **no server-side multiplayer
infrastructure**. Multiplayer support is limited to client-side libraries
bundled into generated games:

- **PeerJS** -- WebRTC peer-to-peer connections, no central authority
- **Socket.io client** -- real-time transport, but no server to connect to
- **Colyseus client** -- authoritative state sync client, no game server

Generated games that select "multiplayer" get these libraries injected, but
players have no way to discover each other, form lobbies, or join matches.
Every multiplayer game is effectively broken without manual peer exchange.

---

## 2. Target Architecture

### Deployment Target

- **Host**: Jetson Orin Nano (prometheus, 192.168.0.18)
- **Process**: Node.js service alongside the existing game-builder-server (port 8092)
- **Transport**: Socket.io over WebSocket with HTTP long-polling fallback
- **Path**: `/matchmaker` (mountable on the same Express HTTP server)

### High-Level Diagram

```
  Browser (Game)         Browser (Game)         Browser (Game)
       |                      |                      |
       +----------+-----------+----------+-----------+
                  |                      |
            Socket.io /matchmaker   Socket.io /matchmaker
                  |                      |
        +---------+----------+-----------+---------+
        |                                          |
        |        Matchmaking Server (Node.js)      |
        |   +-----------+    +----------------+    |
        |   | Room Mgr  |    | Player Tracker |    |
        |   +-----------+    +----------------+    |
        |          |                  |             |
        |   +------+------------------+------+     |
        |   |         Room Registry          |     |
        |   |    (in-memory Map / Redis)     |     |
        |   +--------------------------------+     |
        +------------------------------------------+
                           |
                    (future) Colyseus
                    Game State Server
```

### Two Matchmaking Modes

**Quick-Play** (`quick-play` event)
1. Client sends `{ gameId? }` -- optionally scoped to a specific game.
2. Server searches for any room with `status: 'waiting'` and available slots.
3. If a room is found, the player is added and a `room-joined` event fires.
4. If no room exists, the server creates one and the player waits.

**Specific-Game / Join by Room** (`join-room` event)
1. Client sends `{ roomId }` -- the exact room to join.
2. Server validates the room exists, is not full, and is still in `waiting` status.
3. Player is added; `room-joined` fires with full room state.

---

## 3. Room Lifecycle

```
  create
    |
    v
 WAITING  ──(all players ready / max reached)──> PLAYING
    |                                               |
    |  (all players leave)                          |  (game ends)
    v                                               v
 CLEANUP  <────────────────────────────────────  COMPLETE
    |
    v
  (removed from registry)
```

### States

| State      | Description                                              |
|------------|----------------------------------------------------------|
| `waiting`  | Room exists, accepting players, game has not started     |
| `playing`  | Game in progress, no new joins (unless rejoin supported) |
| `complete` | Game finished, scores recorded, players may linger       |
| `cleanup`  | Grace period before room is destroyed                    |

### Timeouts

- **Waiting timeout**: 5 minutes with no activity -- room auto-closes.
- **Playing timeout**: 30 minutes max game duration (configurable per game).
- **Cleanup delay**: 10 seconds after entering `complete` or when last player leaves.

---

## 4. Player Flow

```
  Connect (WebSocket)
     |
     v
  Authenticate (name, optional token)
     |
     v
  Lobby (browse rooms, quick-play, or create)
     |
     v
  Matched (joined a room)
     |
     v
  Playing (relay messages, game state)
     |
     v
  Disconnect (cleanup, notify room)
```

### Connection Lifecycle

1. **Connect**: Client opens Socket.io to `/matchmaker`. Server assigns a socket ID.
2. **Set Name**: Client sends `set-name { name }`. Server tracks the player.
3. **Lobby Actions**: Client can `list-rooms`, `quick-play`, `create-room`, or `join-room`.
4. **In-Room**: Client can send `room-message { type, data }` relayed to all room members.
5. **Leave/Disconnect**: Player removed from room. If room is empty, it enters cleanup.

---

## 5. Protocol Design

### Socket.io Events (Client to Server)

| Event           | Payload                                   | Description                     |
|-----------------|-------------------------------------------|---------------------------------|
| `set-name`      | `{ name }`                                | Register display name           |
| `quick-play`    | `{ gameId? }`                             | Auto-match into a waiting room  |
| `create-room`   | `{ gameId, maxPlayers?, settings? }`      | Create a new room               |
| `join-room`     | `{ roomId }`                              | Join a specific room            |
| `leave-room`    | --                                        | Leave current room              |
| `list-rooms`    | `{ gameId? }`                             | Get available rooms             |
| `room-message`  | `{ type, data }`                          | Relay message to room members   |

### Socket.io Events (Server to Client)

| Event              | Payload                                | Description                         |
|--------------------|----------------------------------------|-------------------------------------|
| `room-joined`      | `{ room }`                             | Successfully joined a room          |
| `room-updated`     | `{ room }`                             | Room state changed (player join/leave) |
| `room-closed`      | `{ roomId, reason }`                   | Room was destroyed                  |
| `room-message`     | `{ from, type, data }`                 | Message from another player         |
| `player-joined`    | `{ player }`                           | A new player entered your room      |
| `player-left`      | `{ socketId, name }`                   | A player left your room             |
| `error`            | `{ message }`                          | Something went wrong                |

### Future: Colyseus Integration

Once basic matchmaking is stable, game state authority moves to Colyseus:

1. Matchmaker forms the room and collects players.
2. When the game starts, matchmaker provisions a Colyseus room on the game server.
3. Clients receive a Colyseus `roomId` and `sessionId` to connect directly.
4. Colyseus handles authoritative state sync; matchmaker tracks room metadata only.

---

## 6. Data Model

### Room

```javascript
{
  roomId:     'abc123',           // unique 6-char alphanumeric
  gameId:     'space-battle-42',  // which game this room is for
  players:    [                   // array of player references
    { socketId: 'sid1', name: 'Alice' },
    { socketId: 'sid2', name: 'Bob' },
  ],
  maxPlayers: 4,                  // default 4, configurable per game
  status:     'waiting',          // waiting | playing | complete | cleanup
  settings:   {},                 // game-specific settings (map, difficulty, etc.)
  created:    1708400000000,      // Date.now() at creation
  hostId:     'sid1',             // socket ID of room creator (first player)
}
```

### Player (tracked per socket)

```javascript
{
  socketId:   'sid1',
  name:       'Alice',
  roomId:     'abc123',           // null if in lobby
  joinedAt:   1708400000000,
}
```

### Storage

- **Phase 1**: In-memory `Map` objects. Sufficient for single-process, low-scale.
- **Phase 2**: Redis-backed storage for persistence across restarts and multi-process.
- **Phase 3**: PostgreSQL for historical match data, analytics, leaderboards.

---

## 7. Scaling Roadmap

### Phase 1: Single Process (Current Target)

- One Node.js process on the Jetson handles all connections.
- In-memory room and player maps.
- Supports ~100 concurrent players comfortably.
- Acceptable for local network and early public testing.

### Phase 2: Worker Processes

- Node.js `cluster` module or PM2 with sticky sessions.
- Redis adapter for Socket.io to share state across workers.
- Supports ~500-1000 concurrent players.

### Phase 3: Container Orchestration

- Docker containers behind a load balancer (nginx or Traefik).
- Colyseus game servers as separate containers, one per active game type.
- Kubernetes or Docker Compose for orchestration.
- Horizontal scaling based on connection count.

---

## 8. Integration with Game Builder

When a game is created through the Game Builder with multiplayer enabled:

1. **game.md** includes `multiplayer: true` and optional settings (max players, mode).
2. **Code generation** injects the Socket.io client library and matchmaker connection code.
3. **Auto-generated config** is embedded in the game's HTML:
   ```javascript
   window.MATCHMAKER_CONFIG = {
     url: 'ws://192.168.0.18:8092',
     path: '/matchmaker',
     gameId: 'space-battle-42',
     maxPlayers: 4,
   };
   ```
4. **Lobby UI** is generated as part of the game: a pre-game screen showing
   available rooms, a "Quick Play" button, and a "Create Room" option.
5. **In-game relay** uses `room-message` events for game actions until
   Colyseus authoritative state is implemented.

---

## 9. Security Considerations

### Rate Limiting

- Max 10 room creations per minute per IP.
- Max 60 messages per minute per socket.
- Max 5 connection attempts per second per IP.

### Validation

- Room IDs validated as 6-char alphanumeric.
- Player names sanitized: 1-20 chars, alphanumeric plus spaces/hyphens.
- Message payloads capped at 4 KB.
- `gameId` validated against known games in the manifest.

### Abuse Prevention

- Players can only be in one room at a time.
- Empty rooms cleaned up aggressively (10-second timeout).
- Stale connections (no ping/pong for 30 seconds) are terminated.
- Broadcast storms prevented by per-socket message throttling.

### Future: Authentication

- Phase 1: Anonymous with display names (current target).
- Phase 2: Optional account linking (GitHub OAuth, guest tokens).
- Phase 3: JWT-based auth with session validation.

---

## 10. Monitoring and Observability

### Health Endpoint

Extend the existing `/health` endpoint:

```json
{
  "status": "ok",
  "matchmaker": {
    "rooms": 12,
    "players": 34,
    "uptime": 86400
  }
}
```

### Logging

- Room created/destroyed events logged with timestamps.
- Player join/leave events logged with room context.
- Error events (failed joins, invalid messages) logged with socket ID.
- All logs written to stdout for capture by PM2 or systemd.

### Metrics (Future)

- Rooms created per hour.
- Average wait time to match.
- Average room lifetime.
- Peak concurrent players.
- Messages relayed per second.
- Export to Prometheus/Grafana when scaling warrants it.

---

## 11. File Structure

```
game-builder-server/
  server.js                     # existing Express server
  matchmaker.js                 # Socket.io matchmaking module (new)
  matchmaking-architecture.md   # this document (new)
  package.json                  # add socket.io dependency
```

### Integration Point

In `server.js`, the matchmaker is mounted on the existing HTTP server:

```javascript
const http = require('http');
const { initMatchmaker } = require('./matchmaker');

const server = http.createServer(app);
initMatchmaker(server);

server.listen(PORT, '0.0.0.0', () => { ... });
```

This replaces the current `app.listen()` call, allowing both Express routes
and the Socket.io matchmaker to share the same port.
