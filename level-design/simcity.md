# SimCity

## Game Type
City builder / resource management simulation

## Core Mechanics
- **Goal**: Grow a city by zoning land and providing power; earn tax revenue each cycle to fund further expansion; avoid bankruptcy
- **Movement**: Scroll the 40x40 map with arrow keys; no character
- **Key interactions**: Zone tiles (residential, commercial, industrial, road, power plant, park); zones grow automatically if demand and power conditions are met; tax revenue arrives every 300 frames; running out of money triggers a bankruptcy timer

## Controls
- 1 — select Residential zone ($10)
- 2 — select Commercial zone ($15)
- 3 — select Industrial zone ($15)
- 4 — select Road ($5)
- 5 — select Power Plant ($50)
- 6 — select Park ($20)
- Arrow keys — scroll the map
- Mouse click on map — place selected zone on tile

## Difficulty Progression

### Structure
Open-ended sandbox with no win condition. Failure occurs only via bankruptcy: if `money <= 0` for more than `bankruptTimer > 600` frames (~10 seconds), the game ends. Growth happens automatically every 60 frames based on demand and power availability. Tax revenue arrives every 300 frames. Difficulty is entirely self-imposed by the player's spending choices.

### Key Difficulty Variables
- Starting money: `500`
- `ZONE_COSTS`: `[0, 10, 15, 15, 5, 50, 20]` — indices map to zone types (road=$5, residential=$10, commercial=$15, industrial=$15, park=$20, power plant=$50)
- Growth interval: every `60` frames
- Tax interval: every `300` frames
- `POWER_RANGE`: `6` tiles — radius within which a power plant powers adjacent zones
- `bankruptTimer` threshold: `600` frames (~10 seconds of negative balance)
- Residential `growChance`: `0.15` if demand is met and zone is powered; `0.03` otherwise
- Tax rate: ~`0.05` × population per cycle (approximate)

### Difficulty Curve Assessment
The starting budget of $500 makes the opening choices critical — a Power Plant at $50 is mandatory but consumes 10% of starting funds, and any misstep (placing zones out of power range, over-investing in parks) can lead to a low-population, low-tax-revenue spiral that is hard to recover from. The 10-second bankruptcy timer is very short and provides no warning, so the game can end abruptly before the player recognizes their cash is dangerously low.

## Suggested Improvements
- [ ] Raise starting money from `500` to `800` — the current budget forces the optimal opener (1 power plant + a tight cluster of zones) with zero experimentation room, punishing players who place even 1-2 tiles suboptimally
- [ ] Add a low-funds warning when `money < 100` (e.g. a flashing alert) and extend the `bankruptTimer` threshold from 600 to 1200 frames (~20 seconds) so players have time to react rather than losing without warning
- [ ] Reduce Power Plant cost from `$50` to `$35` or increase `POWER_RANGE` from 6 to 8 tiles — the current cost-to-coverage ratio means the first power plant barely covers the tiles needed to generate enough tax income to afford a second one
- [ ] Show a demand indicator (e.g. "Residential: HIGH, Commercial: LOW") so the player knows which zone types will grow; currently growth rates are invisible and players guess at zone composition
- [ ] Display the next tax collection countdown on the HUD so players know when revenue is coming and can decide whether to spend now or wait
- [ ] Increase residential `growChance` from `0.03` to `0.06` for unpowered zones — or allow partial growth — so a player who runs out of power range does not see their city completely stagnate while they save for another plant
