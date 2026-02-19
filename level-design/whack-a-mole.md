# Whack-a-Mole

## Game Type
Arcade action — timed click/reflex game

## Core Mechanics
- **Goal**: Click moles as they pop up from holes to score points before the 60-second timer runs out
- **Movement**: Static grid; no player movement — cursor-based targeting only
- **Key interactions**: Click on a mole while it is sufficiently emerged (popProgress >= 0.3) to whack it; miss clicks show a red X effect; hitting bomb moles loses a life and deducts 20 points

## Controls
- Mouse click: Whack a mole (or start/restart the game)
- Space: Start or restart the game

## Difficulty Progression

### Structure
The game is a fixed 60-second session divided into four time bands. Difficulty is re-evaluated every second inside a `setInterval`. There are no levels or score thresholds — time elapsed is the only driver.

### Key Difficulty Variables
- `popInterval`: time between pop scheduling calls
  - 0–14s: 1200ms
  - 15–29s: 900ms
  - 30–44s: 650ms
  - 45–60s: 450ms
- `popDuration`: how long a mole stays visible before auto-retreating
  - 0–14s: 1800ms
  - 15–29s: 1400ms
  - 30–44s: 1100ms
  - 45–60s: 800ms
- `maxMolesUp`: simultaneous moles allowed
  - 0–14s: 2
  - 15–29s: 3
  - 30–44s: 4
  - 45–60s: 5
- Jitter: each scheduled pop has ±40% random variance around `popInterval`
- Bomb mole probability: fixed at 13% throughout (`rand < 0.18` minus 5% golden)
- Golden mole probability: fixed at 5% throughout

### Difficulty Curve Assessment
The four-tier step structure creates noticeable jumps rather than a smooth ramp; the hardest tier arrives at 45 seconds and is only 15 seconds long, so players who survive the mid-game barely get to experience it. Bomb frequency (13%) is constant from the first second, penalising new players heavily before they have learned the visual distinction between mole types.

## Suggested Improvements
- [ ] Delay bomb moles until after 20s elapsed (set `rand < 0.18` bomb threshold to 0 for `elapsed < 20`)
- [ ] Reduce starting `maxMolesUp` from 2 to 1 for the first 10 seconds so new players have time to understand the click hitbox
- [ ] Add a fifth difficulty tier at score >= 150 that reduces `popInterval` to 300ms and `popDuration` to 600ms for score-based challenge on top of time-based
- [ ] Smooth the ramp: interpolate `popInterval` continuously as `Math.max(450, 1200 - elapsed * 12.5)` instead of four hard steps
- [ ] Lower the bomb penalty from -20 to -10 in the first 20 seconds, scaling to -20 after that
