# Dr. Mario

## Game Type
Falling-piece puzzle — match-4 color eliminator

## Core Mechanics
- **Goal**: Clear all viruses from the bottle by forming runs of 4+ same-colored cells (horizontal or vertical) using falling two-cell pills
- **Movement**: Pills fall automatically; the player moves them left/right and rotates them before they lock
- **Key interactions**: Rotating pills, soft drop, hard drop (Space), chain reactions from gravity after clearing (floating pill halves fall and can trigger additional matches)

## Controls
- ArrowLeft / ArrowRight — move pill horizontally
- ArrowUp or Z — rotate pill (clockwise, with wall-kick)
- ArrowDown — soft drop (faster fall, +1 score per row)
- Space — hard drop (instant lock, +1 score per row dropped)

## Difficulty Progression

### Structure
Level-based, starting at level 0 and incrementing on each virus clear. Difficulty is controlled by two variables: virus count and drop speed. Levels continue indefinitely.

### Key Difficulty Variables
- `level` (starting): 0 at game init
- `totalViruses`: `min(84, (level + 1) * 4)` — Level 0: 4 viruses, Level 1: 8, Level 5: 24, Level 20: 84 (cap)
- **Virus placement area**: rows 4–15 only (12 of 16 rows); top 4 rows are always clear for pill entry
- **Drop speed** (`dropInterval`): `max(150, 700 - level * 40)` ms
  - Level 0: 700ms per drop (~86 frames)
  - Level 5: 500ms per drop (~30 frames)
  - Level 10: 300ms per drop
  - Level 13+: 150ms per drop (floor, minimum ~9 frames)
- **Soft drop interval**: 50ms (fixed, ~3 frames) regardless of level
- `chainCount`: starts at 0 per pill placement; each chain step doubles score multiplier (`2^chainCount`)
- **Virus score**: 100 × chainMultiplier per virus cleared
- **Match length**: 4 or more (fixed)
- **Gravity after clear**: pill halves fall one cell at a time, checked every `msToFrames(60)` frames (~4 frames per step)

### Difficulty Curve Assessment
Level 0 is extremely easy — only 4 viruses and a 700ms drop time leaves abundant time to think. Level 5 with 24 viruses and a 500ms drop is moderate. The real wall is around level 10–13 where the drop interval hits its 150ms floor with 44–84 viruses on the board; at this point the game becomes near-reaction-only and the cluttered bottle makes rotations very difficult. The jump from level 0 to level 1 (4→8 viruses) is a 100% virus count increase which is jarring if the player restarts.

## Suggested Improvements
- [ ] Start the game at `level = 1` with 8 viruses (not `level = 0` with 4) so the opening board has enough content to be interesting; level 0's 4-virus board is trivially easy and teaches bad habits about board density
- [ ] Slow the drop speed progression: change formula to `max(150, 700 - level * 30)` so the floor isn't reached until level 18 instead of level 13, keeping mid-game speeds more manageable
- [ ] Add a level select on the start screen (0, 3, 6, 9, 12) so experienced players can jump to a challenge without grinding through trivial early levels
- [ ] Add visual distinction between the three virus colors that goes beyond hue — different face expressions or shapes — since color-blindness or small screen sizes make red/yellow/blue difficult to distinguish quickly
- [ ] Show a ghost piece (drop preview) for the active pill — the code computes `ghostDrop()` and uses it in the draw routine, but the ghost is only 12% opacity white which is nearly invisible; increase to 25% and add a thin colored outline
- [ ] Add a "next 2 pills" preview instead of just 1 to give players more planning time at higher speeds
