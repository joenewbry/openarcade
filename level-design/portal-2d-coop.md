# Portal 2D Co-op

## Game Type
2D co-op puzzle platformer

## Core Mechanics
- **Goal**: Both the player character and the AI partner (ATLAS) must reach the exit simultaneously; 5 rooms total
- **Movement**: Run left/right, jump; gravity at `0.45` px/frame², jump force `-8.5` py/frame, move speed `3` px/frame
- **Key interactions**: Fire blue portal (`Z`) and orange portal (`X`) onto light-colored walls (tile type 2); entities teleport between the portal pair; push weighted cubes onto buttons to open doors; both players must be at the exit to complete the room

## Controls
- `ArrowLeft` / `ArrowRight` — move
- `ArrowUp` — jump (only when on ground)
- `Z` — fire blue portal
- `X` — fire orange portal

## Difficulty Progression

### Structure
The game has exactly 5 fixed hand-built rooms (indices 0–4), progressing in a fixed order. Score is `100 + timeBonus` per room, where `timeBonus = Math.max(0, 60 - elapsed)` (elapsed in seconds). No randomisation; rooms are always identical.

### Key Difficulty Variables
- `GRAVITY`: `0.45` — constant across all rooms
- `JUMP_FORCE`: `-8.5` — constant
- `MOVE_SPEED`: `3` px/frame — constant for player; AI uses acceleration-based approach capped at `3`
- Room 0: No doors, no cubes. Basic gap requiring portals on left wall (`tile type 2`)
- Room 1: One door, one button; AI handles button while player goes to exit (or vice versa)
- Room 2: One door, one button, one weighted cube; AI must push cube onto button
- Room 3: Two doors, two buttons; players must split up to different sides of the map
- Room 4: Two doors, two buttons, one cube; most complex coordination required
- `CHARGE_MAX` (portal cooldown): `0` — portals fire instantly with no cooldown limitation
- AI portal placement timer: `aiPortalTimer = 120` frames between AI portal placements

### Difficulty Curve Assessment
Room 0 is a reasonable introduction. Rooms jump significantly in complexity by Room 3, which requires the player to understand that they need to go to the far right side of the map (starting at `x=530`) while the AI handles the left button. A player who follows the AI or tries to help with the same button will get stuck indefinitely since the AI will eventually give up and follow the player (`decideAIAction` falls back to `'follow'`). The time bonus mechanic is invisible and provides no guidance.

## Suggested Improvements
- [ ] Add on-screen hint text for rooms 3 and 4 (similar to the existing Room 0 hint "Place portals on lighter walls...") that fades out after 10 seconds
- [ ] Reduce the AI portal refire interval from `120` frames to `60` frames so ATLAS places portals more responsively
- [ ] Add a visible per-room time display alongside the score during gameplay so the time-bonus incentive is clear
- [ ] Consider adding a Room 0.5 (between current rooms 0 and 1) introducing buttons without doors to ease players into the button mechanic
- [ ] The `decideAIAction` fallback to `'follow'` can cause softlocks in rooms 3 and 4 where the AI needs to be on the opposite side; add a forced split-up behaviour when the exit is blocked by a closed door with an unpressed remote button
- [ ] Allow firing portals with `ArrowUp` as an alternative to `Z`/`X` (many players don't see the key hints on the start overlay)
