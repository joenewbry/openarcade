# Co-op Dungeon Crawler

## Game Type
Top-down action RPG dungeon crawler (1 player + 1 AI ally, 3 floors)

## Core Mechanics
- **Goal**: Clear all rooms on 3 dungeon floors by defeating all monsters, including the boss room on each floor; maximize score through kills, loot, and room clears
- **Movement**: WASD or arrow keys for free movement in any direction; camera follows player
- **Key interactions**: Auto-attack by pressing Space near enemies; pick up loot with E; use 3 class abilities with number keys 1-2-3; AI ally fights independently and prioritizes healing if low HP

## Controls
- WASD or Arrow Keys: Move
- Space (held): Attack (auto-targets nearest enemy)
- E: Pick up loot
- 1 / 2 / 3: Use class ability
- Class selection: Choose Warrior, Mage, or Rogue before starting

## Difficulty Progression

### Structure
The game has 3 floors (`MAX_FLOORS = 3`). Each floor generates a dungeon with `6 + floor * 2` rooms (8 rooms floor 1, 10 floor 2, 12 floor 3). Monster count per room scales with floor. The boss room is always the last generated room. Completing a boss room transitions to the next floor with a partial heal.

### Key Difficulty Variables
- Rooms per floor: `6 + floor * 2` (8 / 10 / 12)
- Non-boss monster count per room: `2 + Math.floor(Math.random() * 3) + floor` — Floor 1: 2-4, Floor 2: 3-5, Floor 3: 4-6 monsters
- Monster HP scaling: `t.hp * (1 + (floor - 1) * 0.4)` — Floor 2 at +40%, Floor 3 at +80%
- Monster ATK scaling: `t.atk * (1 + (floor - 1) * 0.3)` — Floor 2 at +30%, Floor 3 at +60%
- Boss HP: `100 + floor * 80` — Floor 1 boss: 180 HP, Floor 2: 260 HP, Floor 3: 340 HP
- Boss ATK: `15 + floor * 5` — Floor 1: 20, Floor 2: 25, Floor 3: 30; Boss DEF: `5 + floor * 3`
- Boss attack cooldown: 30 frames (vs 40 for normal monsters)
- Floor-to-floor heal on transition: `+30%` of max HP for both player and ally
- Monster aggro range: 120 px (boss: 180 px)
- Loot drop chance from normal monsters: 35%; boss always drops loot (+ 50% chance of second item)
- Starting class HP: Warrior 150, Rogue 100, Mage 80

### Difficulty Curve Assessment
Floor 1 is fairly gentle with weak monsters and a small map, but Floor 2's 40% HP/30% ATK jump combined with more rooms can feel abrupt, especially for Mage players (80 HP base). The boss on Floor 3 at 340 HP with 30 ATK and 30-frame attack speed will rapidly kill a weakened Mage. The AI ally is competent but also dies permanently if both heroes fall — a single bad engagement in Floor 3 can end the run. Loot drops are critical for progression but their 35% chance means players can go through 5+ rooms without meaningful upgrades.

## Suggested Improvements
- [ ] Increase loot drop chance from 35% to 50% on floors 1-2 to ensure players find at least one health potion per floor wing before the boss
- [ ] Reduce Floor 2 monster HP scaling from `+40%` to `+25%` and Floor 3 from `+80%` to `+55%` — the 0.4 and 0.8 multipliers make the jump feel like a wall rather than a ramp
- [ ] Add a guaranteed health potion drop when the boss is killed (currently boss loot is random), so players enter the next floor with a baseline recovery option
- [ ] Increase Mage base HP from 80 to 100 — currently the Mage takes 2-3 hits to die from a Floor 3 boss, making it unsurvivable without perfect ally support
- [ ] Allow ally resurrection: if only one hero falls, the surviving hero can stand over the body for 3 seconds to revive with 25% HP, preventing single-death run-ending scenarios
- [ ] Add a visible room counter showing cleared/total rooms per floor so players know how far they are from the boss room
