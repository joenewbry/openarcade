# Survival Island — Level Design Notes

## Game Type
Survival crafting (single-player, open-world sandbox, escape objective).

## Core Mechanics
- **Goal**: Survive on an island by gathering resources, crafting tools, and building a raft to escape. Manage hunger and health to stay alive.
- **Day/night cycle**: `daySpeed = 0.0003` per frame — one full day cycle takes `1 / 0.0003 = 3333` frames (~55 seconds at 60fps).
- **Hunger decay**: `player.hunger -= 0.015` per frame. Hunger drains from 100 to 0 in `100 / 0.015 = 6667` frames (~111 seconds, ~1.8 minutes).
- **Night damage**: Without shelter and campfire active, `player.health -= 0.03` per frame at night. Night lasts half a day cycle (~28 seconds).
- **Starvation damage**: When hunger = 0, `player.health -= 0.08` per frame.
- **Key interactions**: Gather resources (TREE, ROCK, BERRY, PLANT, FISH_SPOT), craft tools (axe, spear, campfire, shelter), build raft (wood:10, fiber:5) to escape.

## Controls
- **WASD / Arrow keys**: Move player
- **E / Click**: Interact with / gather from resource node
- **C**: Open crafting menu
- **B**: Open build menu
- **Tab**: Toggle inventory
- **No attack button listed**: Combat with spear is likely auto or proximity-triggered

## Difficulty Progression

### Structure
Open-ended session with no explicit levels. Challenge comes from resource scarcity and time pressure (hunger/health decay). Hostile AI appears if `personality > 0.7`. Resource respawns occur every 15,000–30,000ms. No escalating difficulty — the game is hardest in the first minutes (no tools, scarce food) and eases once crafted.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `daySpeed` | 0.0003 / frame | Day cycle: ~55 seconds per full cycle |
| `player.hunger` decay | 0.015 / frame | Full hunger drain in ~1.8 minutes |
| Night health damage | 0.03 / frame (no shelter) | ~55 HP lost per exposed night |
| Starvation damage | 0.08 / frame | Can kill in ~21 seconds at 0 hunger |
| TREE resource | hp:3, +2 wood | Axe doubles damage (+4 wood) |
| ROCK resource | hp:4, +2 stone | Standard gather |
| BERRY resource | hp:1, +3 food | Fastest food source |
| PLANT resource | hp:2, +2 fiber | Needed for raft |
| FISH_SPOT resource | hp:2, +4 food | Best food yield |
| Raft cost | wood:10, fiber:5 | Win condition craft |
| Axe craft cost | wood:3, stone:2 | Tool that doubles wood yield |
| Resource respawn | 15,000–30,000ms | 15–30 second respawn |
| AI hostile threshold | `personality > 0.7` | ~30% of AI NPCs attack |
| AI move speed | 0.04 | Fixed, no escalation |

### Difficulty Curve Assessment
- **Hunger decay is extremely fast**: Full hunger drain in ~1.8 minutes means a new player who doesn't immediately find food will starve before they understand the crafting system. This is the most punishing aspect of the game.
- **Day cycle of 55 seconds is too short**: A full day — gather, craft, survive night — takes less than a minute. Players who need 2 minutes to understand the UI will face multiple nights before finding food. Night without shelter deals `0.03 * ~28fps * 30 = ~25 HP` per night out of 100 HP — lethal after 4 nights.
- **Starvation damage (0.08/frame) is extremely high**: At 0 hunger, a player dies in `100 / 0.08 = 1250 frames` (~21 seconds). This is death from AFK — barely enough time to react if a player doesn't notice the hunger meter.
- **Raft escape requires 10 wood + 5 fiber** — needs axe (3 wood + 2 stone) first. Total: 13 wood, 5 fiber, 2 stone. Trees give 2 wood without axe. That's 5 tree chops (hp:3 each = 15 hits) plus 4 plant gathers before being able to escape. This is a meaningful progression but brutal if hunger runs out first.
- **No tutorial or first-time guidance**: The game drops the player into survival with no hints about the day cycle, hunger urgency, or crafting priority order.

## Suggested Improvements

1. **Slow hunger decay from 0.015 to 0.008 per frame** — this extends full hunger drain time from ~1.8 minutes to ~3.5 minutes. New players need time to discover berries and fish spots before starving. The added time doesn't remove urgency; it gives players a chance to understand the systems before dying.

2. **Lengthen the day cycle** — change `daySpeed` from 0.0003 to 0.00015 per frame, making one full cycle ~110 seconds (~1.8 minutes). This gives players nearly 2 minutes per day rather than 55 seconds, making each night a dramatic event rather than a constant rapid rotation that's impossible to prepare for.

3. **Reduce starvation damage from 0.08 to 0.03 per frame** — the current starvation rate kills in 21 seconds. At 0.03/frame, a player has 56 seconds to find food before dying — still urgent but survivable with awareness. This prevents the situation where a player is eaten by starvation damage during a crafting menu animation.

4. **Add a visible crafting priority hint at game start** — display a brief overlay (dismissable) showing the optimal first-5-steps chain: "1. Find berries → 2. Gather wood → 3. Gather stone → 4. Craft axe → 5. Build campfire." This onboarding hint eliminates the worst new-player experience (dying in 2 minutes without understanding what to do) while not making the game trivial for experienced players.

5. **Add a "slow start" period for the first day** — during the first day cycle only, set `player.hunger` decay to `0.004` (1/4 normal) and disable hostile AI spawning. This gives every player their first day as a tutorial phase to learn gathering. From day 2 onward, normal decay and hostile AI apply. Implement with a `dayCount < 1` check.

6. **Show raft progress tracker in HUD** — display a persistent "Raft: 0/10 wood, 0/5 fiber" counter. The escape condition (raft) is the core win objective but completely invisible in the UI. Players who don't know what to gather feel aimless. Showing progress creates a clear goal and makes every wood or fiber gather feel meaningful.
