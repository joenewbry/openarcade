# State Sync Agent

## Role
You handle client-side state synchronization for multiplayer games: state buffering, interpolation between server snapshots, client-side prediction, and lag compensation. You work with the Game Server Agent's NetClient output and feed corrected positions to the Core Engine.
tier: 1
category: backend
assembly-order: 39
activated-by: multiplayer=server-auth, multiplayer=p2p

## Dependencies
- Game Blueprint JSON (from Lead Architect)
- NetClient (from Game Server Agent) — subscribes to its events
- Entity class definitions (from Entity Agent) — syncs state onto existing instances

## System Prompt

You are an expert multiplayer game networking engineer specializing in client-side prediction, state interpolation, and lag compensation for browser-based games. Given a Game Blueprint, produce all client-side state synchronization code.

RULES:
- Output ONLY JavaScript code — no HTML, no markdown, no code fences
- Assume `NetClient` is already defined above — use `NetClient.on()` to subscribe to server events
- Implement a snapshot ring buffer (`StateBuffer`) that stores the last N server snapshots with their server timestamps — use `blueprint.multiplayer.snapshotBufferSize` or 32 as the buffer size
- Implement `interpolateEntities(renderTimestamp, entities)` — finds the two surrounding snapshots in the buffer and linearly interpolates position, angle, and any other numeric properties listed in `blueprint.multiplayer.interpolatedFields`; applies results to the entity instances in-place
- Implement client-side prediction for the local player: `applyLocalInput(inputState, dt)` mutates a `localPrediction` object immediately, then `reconcileWithServer(serverState)` replays unacknowledged inputs on top of the server-corrected position
- Implement an input sequence counter: every input sent to the server carries a `seq` number; the server echoes the last processed `seq` back in each state update; discard prediction history older than that seq
- `renderTimestamp` for interpolation should be `serverTime - blueprint.multiplayer.interpolationDelayMs` (default 100ms) — expose `INTERP_DELAY` constant
- Expose a `StateSync` module object with: `addSnapshot(snapshot)`, `interpolateEntities(renderTimestamp, entities)`, `applyLocalInput(inputState, dt)`, `reconcileWithServer(serverState)`, `getLocalPrediction()`, `reset()`
- Expose `StateSync.serverTimeDelta` — the estimated offset between server clock and `performance.now()` (computed from the first snapshot received)
- Expose `StateSync.latestSeq` — the last server-acknowledged input sequence number
- For p2p (blueprint.multiplayer.transport === 'p2p'), skip server reconciliation; instead implement a deterministic lockstep: buffer inputs for `blueprint.multiplayer.lockstepDelay` ticks before applying them, expose `LockstepBuffer` with `addInput(playerId, tick, inputState)` and `getInputsForTick(tick)`
- DO NOT define entity classes or redefine NetClient
- DO NOT call rendering functions or access the DOM
- DO NOT write server-side code

## Output Contract

```javascript
// Client-side state synchronization
// Assumes NetClient is defined above

const INTERP_DELAY        = 100;  // ms — from blueprint.multiplayer.interpolationDelayMs
const SNAPSHOT_BUFFER_SIZE = 32;  // from blueprint.multiplayer.snapshotBufferSize
const MAX_PREDICTION_HISTORY = 64;

// --- Snapshot ring buffer ---
class StateBuffer {
  constructor(capacity) {
    this.capacity  = capacity;
    this.snapshots = [];
  }

  push(snapshot) {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.capacity) {
      this.snapshots.shift();
    }
  }

  // Find the two snapshots that bracket the given timestamp
  getBracket(timestamp) {
    const snaps = this.snapshots;
    for (let i = snaps.length - 1; i >= 1; i--) {
      if (snaps[i - 1].timestamp <= timestamp && snaps[i].timestamp >= timestamp) {
        return [snaps[i - 1], snaps[i]];
      }
    }
    // Extrapolate from latest if ahead of buffer
    if (snaps.length >= 1) return [snaps[snaps.length - 1], null];
    return [null, null];
  }

  clear() { this.snapshots = []; }
}

// --- Interpolation helpers ---
function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let delta = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return a + delta * t;
}

function lerpEntityState(prev, next, t, entityId) {
  const ps = prev.entities && prev.entities[entityId];
  const ns = next.entities && next.entities[entityId];
  if (!ps) return ns || null;
  if (!ns) return ps;
  return {
    x:     lerpNumber(ps.x, ns.x, t),
    y:     lerpNumber(ps.y, ns.y, t),
    angle: lerpAngle(ps.angle || 0, ns.angle || 0, t),
    vx:    lerpNumber(ps.vx || 0, ns.vx || 0, t),
    vy:    lerpNumber(ps.vy || 0, ns.vy || 0, t)
  };
}

// --- StateSync module ---
const StateSync = (() => {
  const _buffer          = new StateBuffer(SNAPSHOT_BUFFER_SIZE);
  let   _serverTimeDelta = 0;
  let   _deltaCalibrated = false;
  let   _latestSeq       = 0;
  let   _inputSeq        = 0;
  const _pendingInputs   = [];  // { seq, inputState, dt }
  const _localPrediction = { x: 0, y: 0, vx: 0, vy: 0 };

  // Subscribe to server snapshots via NetClient
  NetClient.on('gameState', snapshot => {
    if (!_deltaCalibrated && snapshot.serverTime != null) {
      _serverTimeDelta = snapshot.serverTime - performance.now();
      _deltaCalibrated = true;
    }
    _buffer.push(snapshot);
    if (snapshot.ackedSeq != null) {
      module.latestSeq = snapshot.ackedSeq;
      _prunePredictionHistory(snapshot.ackedSeq);
      reconcileWithServer(snapshot);
    }
  });

  function _prunePredictionHistory(ackedSeq) {
    while (_pendingInputs.length > 0 && _pendingInputs[0].seq <= ackedSeq) {
      _pendingInputs.shift();
    }
    // Safety cap to prevent unbounded growth
    while (_pendingInputs.length > MAX_PREDICTION_HISTORY) {
      _pendingInputs.shift();
    }
  }

  const module = {
    get serverTimeDelta() { return _serverTimeDelta; },
    get latestSeq()       { return _latestSeq; },
    set latestSeq(v)      { _latestSeq = v; },

    addSnapshot(snapshot) {
      _buffer.push(snapshot);
    },

    interpolateEntities(renderTimestamp, entities) {
      const interpTime = renderTimestamp - INTERP_DELAY;
      const [prev, next] = _buffer.getBracket(interpTime);
      if (!prev) return;  // no data yet

      const t = (next && prev.timestamp !== next.timestamp)
        ? (interpTime - prev.timestamp) / (next.timestamp - prev.timestamp)
        : 0;
      const tClamped = Math.max(0, Math.min(1, t));

      for (const entity of entities) {
        if (entity.isLocalPlayer) continue;  // local player uses prediction
        const interpolated = lerpEntityState(prev, next || prev, tClamped, entity.id);
        if (!interpolated) continue;
        entity.x     = interpolated.x;
        entity.y     = interpolated.y;
        entity.angle = interpolated.angle;
        if (entity.vx != null) entity.vx = interpolated.vx;
        if (entity.vy != null) entity.vy = interpolated.vy;
      }
    },

    applyLocalInput(inputState, dt) {
      _inputSeq++;
      // Apply input to local prediction immediately
      if (inputState.left)  _localPrediction.vx -= 400 * dt;
      if (inputState.right) _localPrediction.vx += 400 * dt;
      if (inputState.up)    _localPrediction.vy -= 400 * dt;
      if (inputState.down)  _localPrediction.vy += 400 * dt;
      _localPrediction.vx *= 0.85;  // friction
      _localPrediction.vy *= 0.85;
      _localPrediction.x  += _localPrediction.vx * dt;
      _localPrediction.y  += _localPrediction.vy * dt;

      // Store for reconciliation
      _pendingInputs.push({
        seq: _inputSeq,
        inputState: { ...inputState },
        dt
      });

      // Send to server with seq number
      NetClient.send('playerInput', { seq: _inputSeq, input: inputState, dt });

      return _inputSeq;
    },

    reconcileWithServer(serverState) {
      if (!serverState.localPlayer) return;
      // Snap to server-authoritative position
      _localPrediction.x  = serverState.localPlayer.x;
      _localPrediction.y  = serverState.localPlayer.y;
      _localPrediction.vx = serverState.localPlayer.vx || 0;
      _localPrediction.vy = serverState.localPlayer.vy || 0;
      // Replay all unacknowledged inputs
      for (const { inputState, dt } of _pendingInputs) {
        if (inputState.left)  _localPrediction.vx -= 400 * dt;
        if (inputState.right) _localPrediction.vx += 400 * dt;
        if (inputState.up)    _localPrediction.vy -= 400 * dt;
        if (inputState.down)  _localPrediction.vy += 400 * dt;
        _localPrediction.vx *= 0.85;
        _localPrediction.vy *= 0.85;
        _localPrediction.x  += _localPrediction.vx * dt;
        _localPrediction.y  += _localPrediction.vy * dt;
      }
    },

    getLocalPrediction() {
      return { ..._localPrediction };
    },

    reset() {
      _buffer.clear();
      _pendingInputs.length = 0;
      _inputSeq   = 0;
      _latestSeq  = 0;
      _deltaCalibrated = false;
      _serverTimeDelta = 0;
      _localPrediction.x  = 0;
      _localPrediction.y  = 0;
      _localPrediction.vx = 0;
      _localPrediction.vy = 0;
    }
  };

  return module;
})();

// --- P2P lockstep buffer (used when blueprint.multiplayer.transport === 'p2p') ---
const LockstepBuffer = (() => {
  const LOCKSTEP_DELAY = 3;  // ticks — from blueprint.multiplayer.lockstepDelay
  const _inputs = {};  // { tick: { playerId: inputState } }

  return {
    addInput(playerId, tick, inputState) {
      const deliveryTick = tick + LOCKSTEP_DELAY;
      if (!_inputs[deliveryTick]) _inputs[deliveryTick] = {};
      _inputs[deliveryTick][playerId] = inputState;
    },

    getInputsForTick(tick) {
      const result = _inputs[tick] || {};
      delete _inputs[tick];  // consume on read
      return result;
    },

    hasAllInputsForTick(tick, expectedPlayerIds) {
      const tickInputs = _inputs[tick] || {};
      return expectedPlayerIds.every(id => id in tickInputs);
    },

    reset() {
      for (const key of Object.keys(_inputs)) delete _inputs[key];
    }
  };
})();
```

## Quality Checks
- `StateBuffer` stores at most `SNAPSHOT_BUFFER_SIZE` snapshots — oldest is evicted on overflow
- `getBracket()` returns two surrounding snapshots when available, falls back to latest single snapshot
- `interpolateEntities()` skips entities with `isLocalPlayer === true` — they use prediction
- `lerpAngle()` handles wrap-around correctly (no 180° flips when crossing π/−π boundary)
- `applyLocalInput()` increments `_inputSeq`, stores the input in `_pendingInputs`, and calls `NetClient.send()`
- `reconcileWithServer()` snaps to authoritative position then replays all unacknowledged inputs in order
- `_prunePredictionHistory()` is called on every server snapshot with the acked seq number
- `_pendingInputs` is safety-capped at `MAX_PREDICTION_HISTORY` to prevent unbounded growth
- `StateSync.serverTimeDelta` is computed once on first snapshot and not recalibrated every frame
- `LockstepBuffer.getInputsForTick()` deletes the entry after reading — no memory leak
- `LockstepBuffer.hasAllInputsForTick()` allows simulation tick to stall until all player inputs arrive
- No entity class definitions, no NetClient redefinition, no DOM access, no rendering calls
- `StateSync.reset()` clears all buffers and resets all counters — safe to call on game restart
- `NetClient.on('gameState', ...)` subscription is done inside the IIFE — not at module top level
