# Pinball

## Game Type
Pinball simulation

## Core Mechanics
- **Goal**: Score as many points as possible before losing all 3 balls. Hitting bumpers, drop targets, rollovers, and slingshots scores points. Completing drop target sets increases the multiplier.
- **Movement**: Left Arrow / Right Arrow activate left and right flippers. Hold Space to charge the launcher and release to fire.
- **Key interactions**: Ball physics with gravity (0.15 px/frame²), bumper rebounds (boost factor 4, always accelerates), multiplier up to 5x from drop target sets, multiball from rollover completion, nudge with Up Arrow (4 nudges = tilt).

## Controls
- Arrow Left: left flipper
- Arrow Right: right flipper
- Space (hold then release): charge and launch ball
- Arrow Up: nudge (up to 3 times safely; 4th tilts the table)

## Difficulty Progression

### Structure
There is no level progression or difficulty scaling. The game runs a single fixed table layout indefinitely until all 3 balls are lost. The only "progression" is the multiplier (1x-5x), which resets on each ball loss.

### Key Difficulty Variables
- `GRAVITY`: fixed at `0.15` px/frame²
- `FRICTION`: fixed at `0.999` (very low friction — ball retains almost all speed)
- `BALL_RADIUS`: `6` px
- `FLIPPER_LENGTH`: `50` px
- `FLIPPER_REST_ANGLE`: `0.4` rad (dropped position)
- `FLIPPER_UP_ANGLE`: `-0.6` rad (raised position)
- `FLIPPER_SPEED`: `0.25` rad/frame (flipper animation speed)
- `launchPower`: charges at `0.8`/frame to a max of `100`; launch speed = `-(3 + power/100 * 10)` px/frame = range of -3 to -13 py/frame
- `nudgeCount` tilt threshold: 4 nudges triggers tilt (60 frames penalty + flippers disabled)
- `multiplier`: starts at 1, max 5; resets to 1 when a ball is lost
- `balls`: starts at 3

### Difficulty Curve Assessment
The table is well-constructed with good bumper placement, but the friction value of 0.999 means the ball retains nearly full speed indefinitely — this creates situations where the ball ricochets between bumpers for very long periods without player interaction. The tilt penalty of only 4 nudges is very strict, penalizing new players who try to use nudge as a recovery mechanic. The multiplier reset on each ball loss is punishing.

## Suggested Improvements
- [ ] Reduce `FRICTION` from `0.999` to `0.995` to gradually slow the ball and reduce unpredictable high-speed ricochets that can drain instantly
- [ ] Increase the tilt threshold from `4` nudges to `6` so new players can use nudge as a legitimate recovery tool before getting penalized
- [ ] Start with `balls = 4` instead of `3` to give a slightly more forgiving opening session
- [ ] Reduce `FLIPPER_REST_ANGLE` from `0.4` to `0.3` rad so the resting flipper position catches more of the drain area and reduces instant center-drain losses
- [ ] Preserve the multiplier across ball losses (up to a max of 2x) or give 25% of the multiplier back on the next ball launch to reward skilled play that built the multiplier
