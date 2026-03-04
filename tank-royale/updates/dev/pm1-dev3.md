# PM1-DEV3 Update — Level Select UI (Challenge 1-3)

## Completed

- Implemented a **minimal Level Select UI** for Tank Royale challenge tiers 1-3.
- Replaced dropdown mode picker with **selectable challenge cards**:
  - Challenge 1 = unlocked by default
  - Challenge 2 = locked until Challenge 1 clear
  - Challenge 3 = locked until Challenge 2 clear
- Added clear state badges per card (`READY`, `LOCKED`, `CLEARED`).
- Added details panel with:
  - selected challenge title
  - challenge rule summary
  - target/enemy/spawn metadata
  - unlock requirement text for locked entries
- Added guarded **Launch action**:
  - launch button disabled for locked challenges
  - keyboard/overlay start paths also reject locked challenges with clear feedback overlay
- Added progression persistence via `localStorage`:
  - key: `tankRoyaleChallengeProgressV1`
  - stores `unlockedTier` and `clearedModeIds`
- On challenge clear, next tier unlocks immediately and Level Select UI refreshes.

## Styling / Theme Notes

- Updated menu styling to follow the **Cartoon Tank Pack-inspired UI tokens** from `GameDesignDoc` (ink/steel panels, blue/sky CTA accents, amber selection highlights, red lock states).
- Applied a beveled/armored card and panel treatment for the toy-battlefield aesthetic while keeping existing canvas gameplay intact.

## Files changed

- `tank-royale/index.html`
- `tank-royale/game.js`
- `tank-royale/README.md`
- `tank-royale/updates/dev/pm1-dev3.md`

## Validation run

- `node --check tank-royale/game.js` (pass)
