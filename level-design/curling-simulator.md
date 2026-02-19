# Curling Simulator

## Game Type
Sports simulation — turn-based precision

## Core Mechanics
- **Goal**: Score more points than the CPU opponent over 8 ends by placing stones closer to the button (center) than the opponent
- **Movement**: Click to set aim angle, click again to set power on an oscillating bar, then hold mouse to sweep while the stone slides
- **Key interactions**: Aim direction, power selection, sweeping (reduces friction), curl direction; stone-on-stone collisions; scoring counts consecutive same-team stones closer than the opponent's nearest stone

## Controls
- Mouse move — aim direction during aim phase
- Left click — confirm aim, then confirm power
- Right click — flip curl direction (in aim phase)
- Hold left mouse button — sweep while stone is sliding

## Difficulty Progression

### Structure
This is a fixed-length match: always 8 ends (`MAX_ENDS = 8`), 8 stones per team per end (`MAX_STONES = 8`). There is no escalating difficulty within a match — AI quality is constant. The game has no "levels" or score thresholds that change anything. The AI executes a simple rule-based decision tree each turn.

### Key Difficulty Variables
- `MAX_ENDS`: 8 (fixed, no progression)
- `MAX_STONES`: 8 per team per end (fixed)
- **AI aim error**: `±0.04 radians` (random, fixed throughout)
- **AI power error**: `±0.04` power units (random, fixed throughout)
- **AI targeting**: prefers button (power 0.42–0.56 range) or takeout shots (power 0.65–0.83) based on position — static weights, no escalation
- **AI sweep**: triggers if power < 0.6 and random > 0.35; sweeps for 20–50 frames; fixed probability
- `hammer` (last stone advantage): alternates each end based on who scored; player starts without hammer (CPU has first hammer)
- **Power oscillation rate**: `powerDir * 0.015` per frame — this is the same for all ends

### Difficulty Curve Assessment
There is no difficulty curve — the match is flat from end 1 to end 8. The AI is a competent but not punishing opponent; its fixed 0.04 radian and power jitter gives it human-like inaccuracy. The main challenge is learning the power bar timing and sweeping mechanic, which the UI explains minimally. New players will lose repeatedly to the AI until they understand the power bar.

## Suggested Improvements
- [ ] Add an explicit difficulty selector (Easy / Medium / Hard) that scales AI aim error from ±0.12 radians (easy) down to ±0.02 radians (hard) instead of the fixed ±0.04
- [ ] Reduce `MAX_ENDS` to 4 for a shorter introductory match, with an option to play a full 8-end game
- [ ] Show a brief tutorial overlay on first launch explaining the three-click flow (aim → power → sweep), since new players consistently miss that right-click flips curl
- [ ] Display the power bar percentage prominently with a "sweet spot" visual band at 40–56% (draw weight) highlighted in green to teach ideal power before takeout shots
- [ ] Give the player hammer (last-stone advantage) in the first end rather than the CPU, so new players experience the scoring system correctly from the start
- [ ] Add an animated aim-line preview that shows approximate target trajectory, making the curl mechanic discoverable without reading documentation
