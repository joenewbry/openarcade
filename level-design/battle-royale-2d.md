# Battle Royale 2D

## Game Type
Top-down battle royale (player vs AI bots)

## Core Mechanics
- **Goal**: Be the last player standing on a 3000x3000 map. Survive the shrinking safe zone, collect weapons and ammo, and eliminate all other players.
- **Movement**: WASD or Arrow keys move the player; the player faces the mouse cursor direction.
- **Key interactions**: Shooting enemies, collecting weapon/ammo pickups scattered across the map, staying inside the safe zone boundary, switching weapons.

## Controls
- WASD / Arrow keys: move player
- Mouse: aim direction
- Left-click / Space: fire
- R: reload
- 1-4 / scroll wheel: switch weapons

## Difficulty Progression

### Structure
The match starts with 8 players (1 human + 7 AI bots) on a `3000x3000` map. The safe zone shrinks on a fixed timer: every `ZONE_INTERVAL=30000`ms (30 seconds), the zone radius shrinks by multiplying by `0.6`. This happens up to 7 times, collapsing to a minimum radius of `80` units. Players outside the zone take `ZONE_DAMAGE=2` HP per `500ms` tick, scaled by `1 + zonePhase * 0.5` (so later zones deal more damage: phase 3 deals `5` HP/tick, phase 6 deals `8` HP/tick). All players start with a Pistol (12 round magazine, 24 total ammo).

### Key Difficulty Variables
- Player count: `8` total (1 human + 7 AI bots), fixed.
- Map size: `3000x3000` units.
- Player speed: `2.5` units/frame (fixed).
- `ZONE_INTERVAL`: `30000`ms (30 seconds between zone shrinks).
- Zone radius shrink factor: `* 0.6` per phase (7 total shrinks), from full map to radius `80`.
- `ZONE_DAMAGE`: `2` HP per 500ms tick at phase 0; `2 * (1 + zonePhase * 0.5)` at later phases. Max at phase 6: `8` HP/tick = `16` HP/second.
- Starting weapon: Pistol, `12` magazine / `24` total ammo.
- AI bots: fixed behavior, always armed, react to player proximity. No difficulty scaling.

### Difficulty Curve Assessment
The first 30 seconds before the first zone shrink provide no pressure, but new players who don't know the map layout may spend the entire safe-zone window running in the wrong direction without ever encountering loot. AI bots are always armed (start with pistol like the player) and immediately aggressive, meaning a new player who randomly spawns near a bot cluster at match start is likely eliminated within the first 60 seconds. The zone damage escalation in late phases (up to `16` HP/second) is lethal for anyone not already positioned near center, effectively eliminating players who survive the bots but mismanage zone positioning. No minimap, zone timer, or zone boundary warning is provided.

## Suggested Improvements
- [ ] Add a visible zone boundary on the game map (a colored circle or pulsing ring) and a countdown timer showing seconds until the next zone shrink — these are genre staples that this implementation is missing entirely.
- [ ] Show a simple minimap (even a 100x100 pixel scaled-down version) in the HUD corner displaying player position, zone boundary, and bot positions within render range.
- [ ] Reduce the first `ZONE_INTERVAL` from `30000`ms to `60000`ms to give new players more time to find loot and orient themselves before zone pressure begins.
- [ ] Spawn the player guaranteed within `400` units of at least two weapon/ammo pickups, preventing the failure case where a player spawns in a loot-empty corner.
- [ ] Add a 5-second "grace period" at match start (after the start countdown) during which AI bots do not actively seek or shoot the player — this gives new players time to assess their surroundings and move without immediate lethal pressure.
- [ ] Reduce late-phase zone damage from `2 * (1 + zonePhase * 0.5)` to `2 * (1 + zonePhase * 0.3)`, capping maximum zone damage at approximately `10` HP/tick instead of `16`, making the final zone phases survivable for longer.
