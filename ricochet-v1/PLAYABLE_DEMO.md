# RICOCHET Playable Demo (Smoke-Validated)

This document is the current **playable demo runbook** for local validation.

## Quick Start

```bash
npm install
npm run demo:run
```

- Game client: `http://127.0.0.1:5173`
- Network server: `ws://127.0.0.1:3001`

> If you prefer separate terminals:
>
> - Terminal A: `npm run net:server`
> - Terminal B: `npm run dev -- --host 127.0.0.1 --port 5173`

---

## Practical Smoke Checklist (Manual)

Use two browser windows/tabs (Host + Joiner).

### 1) Launch net server + Vite
- Confirm server log shows: `ws server listening on :3001`
- Confirm Vite shows: `Local: http://127.0.0.1:5173/`

### 2) Host flow creates session + lobby ready state
1. Open `http://127.0.0.1:5173`
2. Select any character
3. Click **Invite Friend**
4. Verify lobby panel shows:
   - Session ID
   - Invite URL + Copy Link
   - Status waiting for opponent

### 3) Join flow from invite
1. Open invite link in second tab: `http://127.0.0.1:5173/?invite=<SESSION_ID>`
2. Select a character
3. Click **Join Invite Match**
4. Verify join lobby status and opponent connection status

### 4) Start match
- Verify both tabs auto-transition from menu/lobby into gameplay HUD once both players are present.

### 5) Fire / hit / death / respawn cycle
- Align players and fire (LMB).
- Expected behavior:
  - Hit applies damage
  - On lethal damage, victim dies
  - Respawn timer appears
  - Victim respawns after delay

### 6) Score increments + match ends at 5
- Continue eliminations until one side reaches 5.
- Verify HUD score updates each kill.
- Verify match enters complete state at first-to-5.

### 7) Scoreboard (Tab) + winner/rematch text
- Press **Tab** during match: scoreboard opens/closes.
- Verify rows show both players, kills/deaths, and ping column.
- At match end, verify:
  - winner banner appears (`<PLAYER> WINS`)
  - rematch prompt text appears.

---

## What was validated in this pass

- ✅ Host lobby creation (session + invite URL)
- ✅ Join via invite parameter (`?invite=<id>`)
- ✅ Auto-start after both players are connected
- ✅ Network kill/death/respawn loop on live WS server
- ✅ Score progression to 5 kills on server-validated session
- ✅ Scoreboard Tab overlay behavior
- ✅ Winner/rematch messaging on match complete

---

## Known Limitations (current demo scope)

- **TypeScript production build is not clean yet** (`npm run build` reports pre-existing TS errors), but playable demo works through Vite dev runtime.
- **Opponent ping detail is limited** (local ping shown; opponent often `N/A` if not explicitly reported).
- **Rematch is UI prompt only** right now (no full rematch queue flow wired yet).
- Networking is MVP/local-first; no matchmaking persistence or reconnect UX beyond current lobby retry handling.

---

## Troubleshooting

- **Port 3001 already in use**:
  - Another network server is already running. Stop the old process or reuse it.
- **Can’t join invite**:
  - Confirm both tabs are using the same host/port and server is running.
- **No opponent movement updates**:
  - Check WS connectivity (network status text in HUD/lobby) and ensure both clients are in same session.
