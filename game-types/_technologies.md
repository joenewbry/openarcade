# OpenArcade Technology Reference

Master list of all open-source technologies available for game generation. Each entry includes a TECHCARD annotation that the UI renders as a visual card.

---

## Rendering

### Canvas 2D (Built-in)
<!-- TECHCARD: {"id":"canvas2d","name":"Canvas 2D","version":"native","type":"rendering","cdn":"","docs":"https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API","reliability":"100%","best_for":"Arcade, platformer, puzzle, tower defense, card games, most 2D genres"} -->

The default rendering approach. No library needed — uses the browser's native Canvas 2D API. Supports sprite drawing, primitive shapes, transformations, and pixel manipulation. Sufficient for the vast majority of 2D web games.

**When to use**: Any 2D game. Always the default choice unless 3D is required.
**Performance**: Handles 1000+ sprites at 60fps with proper batching and dirty-rect optimization.
**Key APIs**: `getContext('2d')`, `drawImage()`, `fillRect()`, `requestAnimationFrame()`

### Three.js
<!-- TECHCARD: {"id":"three","name":"Three.js","version":"r134","type":"rendering","cdn":"https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js","docs":"https://threejs.org/docs/","reliability":"98%","best_for":"FPS, 3D games, voxel worlds, racing with 3D perspective"} -->

WebGL-based 3D rendering library. Provides scene graph, cameras, lights, materials, geometries, and a full 3D pipeline. Massive ecosystem with loaders, post-processing, and helpers.

**When to use**: Any game requiring 3D graphics — FPS, 3D racing, voxel sandbox, 3D platformer.
**Performance**: GPU-accelerated. Handles complex scenes with LOD, instancing, and frustum culling.
**Key concepts**: Scene, Camera, Renderer, Mesh = Geometry + Material, requestAnimationFrame loop

---

## Physics

### Matter.js
<!-- TECHCARD: {"id":"matter","name":"Matter.js","version":"0.19.0","type":"physics","cdn":"https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js","docs":"https://brm.io/matter-js/docs/","reliability":"95%","best_for":"Platformers, pinball, physics puzzles, Angry Birds-style games"} -->

2D rigid body physics engine. Handles gravity, collisions, constraints, friction, restitution, and composite bodies. Clean API, good documentation, widely used.

**When to use**: Platformers with physics-based movement, pinball, billiards, physics puzzles, ragdoll.
**Performance**: Stable up to ~200 bodies at 60fps. Use sleeping bodies and spatial partitioning for more.
**Key concepts**: Engine, World, Bodies (rectangle, circle, polygon), Constraints, Composites, Events

### Planck.js
<!-- TECHCARD: {"id":"planck","name":"Planck.js","version":"0.3.6","type":"physics","cdn":"https://cdn.jsdelivr.net/npm/planck-js@0.3.6/dist/planck-with-testbed.min.js","docs":"https://piqnt.com/planck.js/","reliability":"90%","best_for":"Complex physics, soft body simulation, fluid-like interactions"} -->

JavaScript port of Box2D. More complex than Matter.js but supports advanced features like continuous collision detection, soft bodies, and more joint types.

**When to use**: When Matter.js isn't enough — soft body physics, complex joint systems, precision physics simulations.
**Performance**: Slightly heavier than Matter.js but more feature-complete.
**Key concepts**: World, Body (dynamic/static/kinematic), Fixture, Shape, Joint types

### Cannon.js
<!-- TECHCARD: {"id":"cannon","name":"Cannon.js","version":"0.6.2","type":"physics","cdn":"https://cdn.jsdelivr.net/npm/cannon@0.6.2/build/cannon.min.js","docs":"https://schteppe.github.io/cannon.js/docs/","reliability":"85%","best_for":"3D physics, FPS collision, vehicle simulation, 3D ragdoll"} -->

3D rigid body physics engine. Pairs naturally with Three.js for 3D games that need physics simulation.

**When to use**: 3D games with physics — FPS with physical projectiles, 3D racing with collisions, voxel sandbox with falling blocks.
**Performance**: Good for moderate body counts. No longer actively maintained but stable for game use.
**Key concepts**: World, Body, Shape (Box, Sphere, Plane, Trimesh), Material, ContactMaterial

---

## Multiplayer

### Socket.io (Client)
<!-- TECHCARD: {"id":"socket.io","name":"Socket.io Client","version":"4.6.2","type":"multiplayer","cdn":"https://cdn.socket.io/4.6.2/socket.io.min.js","docs":"https://socket.io/docs/v4/","reliability":"98%","best_for":"Turn-based multiplayer, lobbies, chat, leaderboards, server-synced state"} -->

WebSocket abstraction with automatic reconnection, room management, and fallback transports. Client library connects to a Socket.io server for real-time bidirectional communication.

**When to use**: Online multiplayer requiring a server — turn-based games, lobbies, chat, real-time state sync.
**Performance**: Low latency (<50ms typically). Handles hundreds of concurrent connections per server process.
**Key concepts**: `io()` connect, `socket.emit()`, `socket.on()`, rooms, namespaces, acknowledgements

### Colyseus.js
<!-- TECHCARD: {"id":"colyseus","name":"Colyseus.js","version":"0.15.12","type":"multiplayer","cdn":"https://cdn.jsdelivr.net/npm/colyseus.js@0.15.12/dist/colyseus.js","docs":"https://docs.colyseus.io/","reliability":"90%","best_for":"Real-time authoritative multiplayer, action games, MMO-lite"} -->

Full multiplayer game framework with server-authoritative state management. Handles room lifecycle, state synchronization, matchmaking, and client prediction out of the box.

**When to use**: Real-time multiplayer action games where the server must be authoritative (anti-cheat, consistent state).
**Performance**: Built for real-time — delta state sync, binary protocol, efficient serialization.
**Key concepts**: Room, State, Schema (serializable state), Client, matchmaking

### PeerJS
<!-- TECHCARD: {"id":"peerjs","name":"PeerJS","version":"1.4.7","type":"multiplayer","cdn":"https://cdn.jsdelivr.net/npm/peerjs@1.4.7/dist/peerjs.min.js","docs":"https://peerjs.com/docs/","reliability":"85%","best_for":"2-player games, local co-op over LAN, peer-to-peer without server"} -->

Simplifies WebRTC peer-to-peer connections. Players connect directly to each other without a game server (only a signaling server for initial connection).

**When to use**: 2-player or small group games where P2P is sufficient. No server authority needed.
**Performance**: Direct connection = lowest possible latency. Limited to small player counts.
**Key concepts**: Peer, Connection, DataConnection (reliable/unreliable), peer ID sharing

---

## Audio

### Web Audio API (Built-in)
<!-- TECHCARD: {"id":"webaudio","name":"Web Audio API","version":"native","type":"audio","cdn":"","docs":"https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API","reliability":"100%","best_for":"Procedural SFX, simple sound effects, games that don't need external audio files"} -->

Native browser API for audio processing and synthesis. Can generate sounds procedurally (oscillators, noise, filters) without loading any audio files. Perfect for retro-style games.

**When to use**: Default audio choice. Procedural SFX (beeps, boops, explosions, coin sounds). No library overhead.
**Performance**: Hardware-accelerated audio processing. Sample-accurate timing.
**Key APIs**: `AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `AudioBufferSourceNode`

### Howler.js
<!-- TECHCARD: {"id":"howler","name":"Howler.js","version":"2.2.4","type":"audio","cdn":"https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js","docs":"https://howlerjs.com/","reliability":"95%","best_for":"Games with audio file assets, background music, spatial audio, audio sprites"} -->

Audio library that abstracts Web Audio API and HTML5 Audio. Handles audio file loading, playback, sprites, fading, spatial audio, and codec fallbacks.

**When to use**: When loading external audio files (music, SFX packs). When you need audio sprites, 3D spatial audio, or cross-browser audio reliability.
**Performance**: Efficient audio pooling and sprite playback. Handles dozens of simultaneous sounds.
**Key concepts**: `Howl` (single sound/sprite), `Howler` (global controller), sprite definitions, spatial audio

### Tone.js
<!-- TECHCARD: {"id":"tone","name":"Tone.js","version":"14.7.77","type":"audio","cdn":"https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.js","docs":"https://tonejs.github.io/","reliability":"92%","best_for":"Rhythm games, music creation tools, synthesizer games, precise audio scheduling"} -->

Music framework built on Web Audio API. Provides synthesizers, effects, sequencing, transport controls, and precise audio scheduling — everything needed for music-centric games.

**When to use**: Rhythm/music games, synthesizer tools, games with procedurally generated music, any game where audio timing precision is critical.
**Performance**: Sample-accurate scheduling with lookahead. Built for musical applications.
**Key concepts**: `Transport`, `Synth`, `Sequence`, `Pattern`, `Effect`, `Tone.now()`, scheduling callbacks

---

## Utility (No CDN — Built-in Browser APIs)

### requestAnimationFrame
The game loop foundation. Calls your update/render function at ~60fps (or display refresh rate). Always use this instead of `setInterval` for game loops.

### localStorage / IndexedDB
Client-side persistence for save games, high scores, settings. localStorage for simple key-value (up to 5MB). IndexedDB for larger/structured data.

### Pointer Lock API
Essential for FPS/mouse-look games. Locks the mouse cursor and provides raw mouse movement deltas. Used with Three.js for first-person camera control.

### Gamepad API
Support for game controllers. Detects connected gamepads, reads button states and axis values. Important for action-heavy games.

### Web Workers
Run expensive computation (pathfinding, procedural generation, physics) off the main thread to prevent frame drops. Essential for CPU-heavy games.

---

## Technology Selection Quick Reference

| Game Type | Rendering | Physics | Audio | Multiplayer |
|-----------|-----------|---------|-------|-------------|
| Platformer | Canvas 2D | Matter.js | Web Audio API | PeerJS (co-op) |
| Arcade Shooter | Canvas 2D | — | Web Audio API / Howler | Socket.io (leaderboards) |
| Puzzle | Canvas 2D / DOM | — | Web Audio API | Socket.io (vs mode) |
| Roguelike | Canvas 2D | — | Howler.js | — |
| Tower Defense | Canvas 2D | — | Howler.js | Socket.io (co-op) |
| Rhythm/Music | Canvas 2D | — | Tone.js | Socket.io (battle) |
| FPS / 3D | Three.js | Cannon.js | Howler.js | Colyseus |
| Racing | Canvas 2D / Three.js | Matter.js / Cannon.js | Howler.js | Socket.io |
| Card/Board | DOM / Canvas 2D | — | Web Audio API | Socket.io |
| Fighting | Canvas 2D | — | Howler.js | Socket.io / PeerJS |
| Sandbox | Canvas 2D / Three.js | Matter.js / Cannon.js | Web Audio API | Colyseus |
| Idle/Clicker | DOM | — | Web Audio API | — |
| Visual Novel | DOM | — | Howler.js | — |
| Strategy/RTS | Canvas 2D | — | Howler.js | Socket.io / Colyseus |
