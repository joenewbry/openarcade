# Drag Race Showdown

## Game Type
Arcade racing — quarter-mile drag race

## Core Mechanics
- **Goal**: Complete the quarter mile (402.336 m) in less time than the AI opponent
- **Movement**: Linear acceleration along a single straight track; player manages RPM, gear shifts, and nitro
- **Key interactions**: Launching at the green light (false start = DQ), shifting gears at the optimal RPM window (5500–7000 RPM), activating nitro for a 1.5× speed boost, reading the tachometer to avoid redline

## Controls
- Space — launch car (after green light); must wait for traffic state 5
- ArrowUp — shift up one gear (1–5)
- N — activate nitro boost (3 uses per race)
- Click/Enter — start race / advance to next round

## Difficulty Progression

### Structure
Round-based with no upper limit. `round` starts at 1 and increments after each race regardless of win/loss. The only difficulty variable between rounds is AI reaction time and shift accuracy. There is no escalation in track length, player physics, or other parameters.

### Key Difficulty Variables
- `round`: starts at 1, increments each race
- **AI reaction time base**: `max(0.15, 0.4 - round * 0.03)` seconds
  - Round 1: 0.37s, Round 4: 0.28s, Round 8+: 0.15s (floor)
  - Plus random jitter of `0–0.08s`
- **AI shift accuracy**: `min(0.98, 0.75 + round * 0.03)` (fraction of optimal RPM window used as shift point)
  - Round 1: 0.78 (shifts at ~78% of optimal window), Round 8: 0.99 (near-perfect)
- **Nitro boost multiplier**: `NITRO_BOOST = 1.5` (fixed, same for player and AI)
- **Nitro duration**: `NITRO_DURATION = 1.5` seconds (fixed)
- `QUARTER_MILE`: 402.336 m (fixed)
- `MAX_GEARS`: 5 (fixed)
- `GEAR_MAX_SPEEDS`: [18, 35, 55, 75, 95] m/s (fixed)
- `OPTIMAL_RPM_MIN`: 5500, `OPTIMAL_RPM_MAX`: 7000, `REDLINE_RPM`: 8500 (all fixed)
- **Bog-down penalty**: if shifting below 5500 RPM, speed reduces 2% per frame and RPM drops 1500; lasts 0.5 seconds
- Player starts with 3 nitros per race (fixed); AI also starts with 3

### Difficulty Curve Assessment
The game is immediately demanding for new players because the optimal shift mechanic requires reading a tachometer, recognizing the green zone, and pressing a key at the right moment — all within a 2–4 second race. The tachometer UI is small and the "SHIFT UP!" prompt appears only when already in the optimal zone (not as a warning before it). Round 1 AI reaction time of 0.37s plus jitter is competitive but beatable. By round 8+ the AI has near-perfect shifts and a 0.15s reaction time, which is very hard to beat without perfect play.

## Suggested Improvements
- [ ] Add a pre-race tutorial prompt the first time the player plays explaining the three-step flow: wait for green → hold Space → shift when bar is green; currently new players often false-start or sit idle
- [ ] Show a "PREPARE TO SHIFT" indicator when RPM hits 5000 (500 RPM below the optimal window) rather than only when inside the window, giving more reaction time on early gears
- [ ] Slow AI reaction time progression: change formula to `max(0.2, 0.45 - round * 0.025)` so the AI doesn't reach its floor until round 10 instead of round 8, keeping rounds 5–8 more competitive
- [ ] Add a brief "countdown practice" mode before the first race that lets the player practice their launch reaction without it being a real race, since false starts permanently DQ the run
- [ ] Make the optimal RPM zone (green section of tachometer) larger and more visually prominent — currently it occupies a narrow band in a small `130×55` panel that is hard to read during the countdown adrenaline
- [ ] Consider increasing player nitros from 3 to 4 in rounds 1–3, since the AI uses nitros strategically (targeting ≥ gear 3 or when behind) while new players tend to waste their first nitro at the wrong moment
