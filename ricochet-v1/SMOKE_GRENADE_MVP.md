# Smoke Grenade MVP

## Scope
Issue #57 Part B – smoke grenade MVP for the Ricochet mode.

## What was implemented
- Added `throwSmoke` action in input bindings (default: `G`) and exposed in keybinds UI.
- Added smoke deployment path in `src/bullet-system.ts`:
  - `deploySmoke(origin, direction)`
  - Smoke world properties: range, radius, lifetime, cooldown, and active-volume cap.
  - Expiration + fade lifecycle with shared smoke texture and automatic cap enforcement.
- Added HUD and vision feedback in `src/main.ts`:
  - Smoke overlay management via `#smoke-vision-overlay` with density-based opacity.
  - Status label `#smoke-status` (ready/cooldown + active/max).
- Added keybind-aware arena text for smoke throw.

## Config and behavior
- Lifetime / radius / cooldown are centralized in `PAINTBALL_TUNING`.
- Capacity is bounded (`MAX_SMOKE_VOLUMES`) and oldest active mists are culled when exceeded.
- Releasing smoke updates HUD immediately and clears when expired.

## Validation
- `npm run demo:build` (from `ricochet-v1`) passes.
- In-match: press **G** to deploy smoke grenades.
- Smoke has visible obscuration effect and updates HUD state.
- Additional throws respect cooldown and active volume cap.
