# Tapper

## Game Type
Arcade action / bar management (Tapper arcade clone)

## Core Mechanics
- **Goal**: Serve all customers in each level without letting any reach the bartender end of the bar or letting drinks fall off the right side
- **Movement**: The bartender moves up and down between 4 bars (lanes)
- **Key interactions**: Press Space to slide a drink mug down the current bar; catch returning empty mugs by being at the correct bar; customers walk left from the right side and must be served before reaching the bartender

## Controls
- ArrowUp / ArrowDown: move bartender between bars
- Space: serve a drink on the current bar

## Difficulty Progression

### Structure
The game uses explicit levels. Each level has a fixed total customer count (`levelCustomersTotal`) that must be served to clear the level. On clearing, the player scores a bonus and `setupLevel()` is called with the incremented level number, recalculating all difficulty parameters.

### Key Difficulty Variables
- `level`: starts at 1, increments each time all customers for the level are served
- `diff = Math.min(level - 1, 12)`: the raw difficulty scalar, caps at 12 (reached at level 13)
- `customerSpeedBase`: starts at `0.4 + 0 * 0.08 = 0.4`, increases by 0.08 per level; at level 13 it is `0.4 + 12 * 0.08 = 1.36`
- `drinkSpeed`: starts at `4.5 + 0 * 0.3 = 4.5`, increases by 0.3 per level; at level 13 it is `4.5 + 12 * 0.3 = 8.1`
- `spawnInterval`: starts at `Math.max(30, 90 - 0 * 5) = 90` frames, decreases by 5 per level; reaches minimum 30 at level 13
- `levelCustomersTotal`: `8 + level * 4`; at level 1 = 12 customers, at level 5 = 28 customers
- `drinksWanted` per customer: `1 + Math.floor(Math.random() * Math.min(3, level))`; from level 1 customers only want 1 drink, from level 3 onward up to 3 drinks

### Difficulty Curve Assessment
The difficulty curve is well-structured but the starting speed of 0.4 combined with 12 customers per level is manageable. However, level 3 introduces multi-drink customers (up to 3 drinks per person), which dramatically increases complexity without much ramp-up. The interaction of empty mugs sliding back (which cause a life loss if the bartender is on the wrong bar) is not telegraphed to new players.

## Suggested Improvements
- [ ] Reduce `levelCustomersTotal` formula from `8 + level * 4` to `6 + level * 3` for the first 4 levels to shorten early levels and let players feel progression sooner
- [ ] Reduce `customerSpeedBase` starting value from 0.4 to 0.25 and increase the per-level step from 0.08 to 0.10 — slower start, same end speed at cap
- [ ] Delay multi-drink customers until level 4: change `Math.min(3, level)` to `Math.min(3, Math.max(1, level - 2))` so customers only ever want 1 drink for the first 2 levels
- [ ] Add a brief visual tutorial arrow or flash on the first empty mug that returns, explaining to the player they need to catch it
- [ ] Start with 4 lives instead of 3 (`lives = 4` in `onInit`) to give new players more room to learn the multi-bar timing
- [ ] Show a "combo" indicator when the player catches multiple empty mugs in a row to reward skilled play
