# Glass Character Tuning (Issue #46)

This document captures the MVP constants used for the glass/bubble character implementation.

## Crack Progression Thresholds

Crack stages are driven by current HP and update on authoritative network damage/state:

- **Stage 0 (intact):** HP > 75
- **Stage 1 (light cracks):** HP <= 75
- **Stage 2 (medium cracks):** HP <= 45
- **Stage 3 (heavy cracks):** HP <= 20

## Visual Constants

Defined in `src/glass-character-system.ts` (`GLASS_CHARACTER_TUNING`):

- `GLASS_TINT`: `0x98d8ff`
- `LOCAL_GLASS_OPACITY`: `0.56`
- `REMOTE_GLASS_OPACITY`: `0.70`
- `CRACK_STAGE_OPACITY`: `[0.34, 0.58, 0.84]`

Notes:
- Local first-person body proxy uses a lighter transmission/opacity setup to preserve readability.
- Remote mesh uses stronger glass silhouette for visibility at distance.

## Shatter Effect Constants

- `SHATTER_FRAGMENT_COUNT`: `22`
- `SHATTER_LIFETIME_SECONDS`: `0.9`
- `SHATTER_SPEED_MIN`: `2.6`
- `SHATTER_SPEED_MAX`: `5.2`
- `SHATTER_GRAVITY`: `-7.8`

## Reset Rules

- On death: target goes to cracked stage 3 then shatters.
- On respawn: target resets to intact (stage 0 / HP 100).
