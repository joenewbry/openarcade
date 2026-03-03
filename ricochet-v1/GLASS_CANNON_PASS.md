# Glass Cannon Gameplay Pass (Issue #53)

This pass updates Ricochet gameplay for a tighter one-shot glass-cannon mode.

## Quick Controls

- **LMB**: Fire paintball projectile (single, travel-time tracer)
- **RMB**: Fire bouncing rubber paint ball
- **WASD / Arrow**: Move
- **Mouse**: Aim
- **Q**: Quit current match and return to menu
- **M**: Switch arena map

## Core behavior changes

- One-shot damage model: any valid hit immediately resolves to the terminal state.
- Round is centered on a visible **ONE SHOT** HUD state.
- Static shared character is used for both players (character picker now intentionally simplified).
- Right-click shots remain bounce-stable and leave a paint splat on every bounce.
- Static enemy dummy targets remain in arena and visibly react when struck.
- Basic soundtrack loop added for short demo feel.

## Tuned constants

### Client (`ricochet-v1/src/bullet-system.ts`)

- `SHOT_MAX_DISTANCE`: `80`
- `SHOT_TRAVEL_SPEED`: `30`
- `SHOT_TTL_MS`: `3200`
- `PAINTBALL_RADIUS`: `0.09`
- `MAX_PAINTBALLS`: `3`
- `PAINTBALL_IMPACT_SPARK_SIZE`: `0.06`
- `SPLAT_SIZE_MIN`: `0.55`
- `SPLAT_SIZE_MAX`: `1.2`
- `RIGHT_CLICK_COOLDOWN_MS`: `120`
- `RUBBER_BALL_SPEED`: `26`
- `RUBBER_BALL_RADIUS`: `0.12`
- `RUBBER_BALL_BOUNCE_DAMPING`: `0.82`
- `RUBBER_BALL_MAX_BOUNCES`: `8`

### Server (`ricochet-v1/server/network-server.js`)

- `HIT_DAMAGE`: `100`
- `PLAYER_RADIUS`: `0.76`
- `MAX_HIT_DISTANCE`: `80`
- One-shot flow uses terminal health resolution on each valid hit.

## Notes

- Hurtbox consistency is addressed by aligning projectile and server max distance/radius assumptions, with a strict one-shot terminal damage contract.
- HUD now presents `1/1 (ONE SHOT)` style values and explicit one-shot messaging.
