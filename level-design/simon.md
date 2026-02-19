# Simon

## Game Type
Memory / reaction sequence game

## Core Mechanics
- **Goal**: Repeat an ever-lengthening sequence of colored panel flashes without making a mistake; survive as many rounds as possible
- **Movement**: No movement; purely input-based
- **Key interactions**: Watch the sequence play, then reproduce it exactly in order; each correct round appends one new element to the sequence; one mistake ends the game

## Controls
- 1 / Arrow Left — activate panel 1 (top-left, green)
- 2 / Arrow Up — activate panel 2 (top-right, red)
- 3 / Arrow Down — activate panel 3 (bottom-left, yellow)
- 4 / Arrow Right — activate panel 4 (bottom-right, blue)
- Mouse click on panel — activate that panel

## Difficulty Progression

### Structure
Infinite round-based escalation. Each round adds one new color to the growing sequence. The playback speed of the sequence increases over time, driven by `getShowInterval()` and `getShowPause()`. There is no ceiling — the sequence grows indefinitely until the player makes a mistake.

### Key Difficulty Variables
- `getShowInterval(round)`: starts at `600` ms per flash, ramps down to a minimum of `250` ms over ~20 rounds — controls how long each panel is highlighted during playback
- `getShowPause(round)`: starts at `150` ms between flashes, ramps down to a minimum of `80` ms over ~20 rounds — controls the gap between flashes in the playback sequence
- `INPUT_FLASH_MS`: `200` ms — how long a panel lights up when the player presses it (constant)
- Sequence growth: +1 element per round, starting from 1
- Mistake tolerance: zero — one wrong input ends the game immediately
- Score: equals the current round number reached

### Difficulty Curve Assessment
The first 5 rounds are very forgiving because sequences are short and playback is slow (600 ms per flash), but the speed ramp is aggressive enough that by round 10 the interval has dropped to ~350 ms and short-term memory load is already high. The zero-mistake policy means a misclick on round 15+ erases significant progress, which feels punishing given that there is no checkpoint or life system.

## Suggested Improvements
- [ ] Slow the initial `getShowInterval` ramp so that the minimum of 250 ms is not reached until round 30 instead of round 20 — this gives players more time at a comfortable speed before memory compression becomes the bottleneck
- [ ] Add a single "oops" grace life per game (player can make one mistake and continue from the start of the current round's input phase) to reduce the "one slip destroys everything" frustration at high round counts
- [ ] Increase `INPUT_FLASH_MS` from 200 ms to 300 ms so player button presses feel more responsive and it is easier to visually confirm which panel was activated
- [ ] Play a distinct error sound and flash the failed panel red briefly when the player makes a mistake, rather than immediately transitioning to game over — the current abrupt stop makes it hard to learn which panel was pressed incorrectly
- [ ] Show the sequence round number prominently during playback (e.g. "Round 12 — watch carefully") so players track their progress and the growing sequence length feels like achievement rather than mounting dread
- [ ] Add a "strict mode" toggle that removes the grace life and uses the current speed ramp for players who want the classic experience, keeping the gentler default accessible to new players
