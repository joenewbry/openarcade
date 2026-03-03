# RICOCHET Networking MVP (RIC-011)

Minimal 1v1 WebSocket networking for demo playtests.

## What was added

- `src/network/network-types.ts`
- `src/network/network-client.ts`
- `src/network/network-state.ts`
- `server/network-server.js`
- `src/main.ts` integration hooks (host/join, sync, interpolation, score/hit/death wiring)

## Run locally

1. Install deps (includes `ws`):
   ```bash
   npm install
   ```

2. Start networking server (default port `3001`):
   ```bash
   npm run net:server
   ```
   Optional custom port:
   ```bash
   NET_PORT=3010 npm run net:server
   ```

3. In another terminal, start game client:
   ```bash
   npm run dev
   ```

4. Open two browser windows/tabs:
   - **Host**: choose character -> click **Invite Friend**
   - Share/open copied invite URL in second tab
   - **Client**: choose character -> click **Join Invite Match**

## URL options

- `?invite=<sessionId>`: join flow trigger (auto changes button to Join)
- `?ws=ws://host:port`: override WebSocket server URL
- `?wsPort=3001`: override default port only

## MVP behavior notes

- Server-authoritative hit check is ray-vs-sphere against latest remote player state.
- Damage/death/score are server-driven and broadcast to both clients.
- Respawn is server-timed (`~3s`) and broadcast.
- Remote movement uses client interpolation buffer (`~100ms delay`).
- Scope is intentionally small and modular for later transport swap (WebRTC/WebTransport).
