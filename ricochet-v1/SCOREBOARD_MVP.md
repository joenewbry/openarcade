# Scoreboard MVP (RIC-013)

## Delivered

### `src/scoreboard-system.ts`
- Added a dedicated `ScoreboardSystem` that:
  - Toggles overlay with **Tab** (press once to open, press again to close)
  - Renders two player rows with:
    - name
    - kills
    - deaths
    - ping (`N/A` fallback)
  - Shows match-state text (waiting / in progress / complete)
  - Shows winner banner + rematch prompt text when match ends
- Implementation is event-driven (no per-frame scoreboard work), so it does not add render-loop overhead.

### `src/main.ts` integration hooks
- Integrated scoreboard lifecycle into game flow:
  - resets/labels on match start
  - updates player roster from `lobby_state`
  - updates scores from existing network score maps via `matchSystem.applyExternalScores`
  - syncs base HUD score from `matchStateChanged`
  - updates local ping from server `pong`
  - handles connection/lobby states (`Waiting for opponent`, `In progress`, `Connection lost`, etc.)
- Added lightweight ping loop (`sendPing` every 2s).

### `src/match-system.ts` support updates
- Added emitted `matchStateChanged` snapshot event with score/state/winner metadata.
- Added:
  - `startMatch(options)` with player labels + target score
  - `setPlayerNames(...)`
  - `applyExternalScores(...)` for network-authoritative score updates
- Kept legacy score display updates for compatibility.

### Minimal HTML/CSS additions (`index.html`)
- Added scoreboard overlay markup with two rows.
- Added compact styling for:
  - overlay panel
  - table columns
  - winner/rematch text

## Test Notes

## 1) Offline quick-play scoreboard
1. Start game: `npm run dev`
2. Choose character -> **Quick Play**
3. Press **Tab**:
   - scoreboard opens/closes
   - shows You + Rival rows with kills/deaths + `N/A` pings
4. Trigger local death from console (or gameplay):
   - `window.dispatchEvent(new Event('playerDied'))`
5. Verify kills/deaths update from match-system events.

## 2) Network scoreboard sync
1. Start WS server: `npm run net:server`
2. Host in one browser, join via invite in second browser
3. Press **Tab** in either client:
   - both players listed
   - score changes reflect server `score_update` / `death` maps
   - local ping displays in ms, opponent ping is `N/A` (not currently provided by server)

## 3) Match-end winner + rematch prompt
1. In either offline or online mode, reach target score (first to 5)
2. Verify scoreboard:
   - auto-opens on match complete
   - winner banner is shown
   - rematch prompt text appears

## 4) Performance sanity
- Scoreboard updates are event-driven only (keydown + network/match events).
- No additional per-frame DOM updates in `animate()`.
