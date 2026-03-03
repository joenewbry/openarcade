# RICOCHET Lobby MVP (RIC-012)

Pre-match lobby flow added for invite matches.

## What changed

- Added `src/lobby-system.ts` to manage lobby UI state (host/join/waiting/ready/error).
- Integrated lobby flow in `src/main.ts`:
  - Host now creates session first, sees lobby panel + session ID + copy link.
  - Join now shows explicit joining state and lobby connection status.
  - Match only starts once lobby reports both players connected.
  - Retryable error handling for common failures (not found/full/disconnect).
- Updated `index.html` with a small lobby panel in the existing menu overlay and minimal CSS.

## Manual test steps

1. **Start server + client**
   - Terminal A: `npm run net:server`
   - Terminal B: `npm run dev`

2. **Host flow**
   - Open tab A, choose a character, click **Invite Friend**.
   - Confirm lobby panel appears with:
     - Session ID
     - Invite URL field + Copy Link button
     - Status: waiting for opponent

3. **Join flow**
   - Open tab B using host invite URL (`?invite=<sessionId>`), choose character, click **Join Invite Match**.
   - Confirm joining/connected status appears in lobby.

4. **Ready gate**
   - Verify both tabs only enter gameplay after both players are connected.
   - Verify lobby status shows a clear “starting match” message.

5. **Failure UX (retryable)**
   - Try joining an invalid session (`?invite=bad123`) -> should show “session not found” style message + Retry.
   - Fill a session with two players, then join from third tab -> should show “session full” + Retry.
   - Stop network server while in lobby -> should show disconnect/retry message.

6. **Back action**
   - In lobby, click **Back** and confirm return to character selection without entering match.
