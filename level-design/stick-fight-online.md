# Stick Fight Online — Level Design Notes

## Game Type
Platform fighter / battle royale (1 player vs 3 AI opponents, best-of-rounds format).

## Core Mechanics
- **Goal**: Reach `WIN_SCORE = 5` round wins before any AI opponent does.
- **Movement**: 2D platformer physics. Jump, double-jump, and move on procedurally placed platforms.
- **Combat**: Punch enemies to deal 12 damage. Pick up and use weapons (sword, gun, grenade, laser). Players die when health reaches 0 or fall into lava.
- **Lava mechanic**: Lava rises from the bottom of the arena starting at `roundTimer = 480` frames (8 seconds), forcing players upward and closing the ring.
- **Key interactions**: Weapon pickup on contact. Platforms crumble after `CRUMBLE_TIME = 120` frames of standing on them. Score a point by being the last player alive per round.

## Controls
- **A / D or Arrow Left / Right**: Move horizontally at `MOVE_SPEED = 2.8`
- **W / Arrow Up / Space**: Jump (`JUMP_FORCE = -9`); double-jump available
- **Left Mouse Click / F**: Punch (12 damage, melee range)
- **Right Mouse Click / G**: Use/fire held weapon
- **E**: Pick up weapon
- **Q**: Drop weapon

## Difficulty Progression

### Structure
Match of rounds, each round ending when one player remains. No explicit difficulty ramp across rounds — all AI opponents are constant-skill from round 1. Lava adds intra-round time pressure that accelerates within a round at fixed thresholds.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `GRAVITY` | 0.45 | Fall acceleration per frame |
| `JUMP_FORCE` | −9 | Initial jump velocity |
| `MOVE_SPEED` | 2.8 | Horizontal movement speed |
| `WIN_SCORE` | 5 | Rounds needed to win the match |
| Lava start time | 480 frames (8 seconds) | Delay before lava begins rising |
| `LAVA_RISE_SPEED` | 0.15 px/frame | Base rise rate |
| Lava acceleration at 900 frames | +0.10 px/frame | Speed bump at 15 seconds |
| Lava acceleration at 1200 frames | +0.15 px/frame | Second speed bump at 20 seconds |
| `CRUMBLE_TIME` | 120 frames (2 seconds) | Platform crumble delay |
| Sword damage | 22 | Highest melee weapon |
| Gun damage/ammo | 18 / 6 shots | Mid-range weapon |
| Grenade blast damage | up to 40 / 3 ammo | Area-of-effect weapon |
| Laser damage/ammo | 25 / 4 shots | Precision weapon |
| Punch damage | 12 | Unarmed melee |
| AI opponents | 3, from round 1 | Constant throughout match |

### Difficulty Curve Assessment
- **Three simultaneous AI opponents from round 1 is overwhelming**: A new player facing 3 AI fighters immediately, with no warm-up, is a very steep entry. Being outnumbered 3:1 with no lives means losing round 1 in seconds is common.
- **Lava at 8 seconds is very fast**: The arena starts shrinking at 8 seconds, leaving minimal time to establish position, pick up weapons, or recover from an early hit. On crumbling platforms, 8 seconds is often not enough time to climb to safety.
- **No inter-round difficulty scaling**: Rounds 1 through 5 feel identical. A player who barely wins could coast through on luck, and a losing player gets no assistance.
- **Crumble platforms add significant complexity early**: `CRUMBLE_TIME = 120` frames (2 seconds) means platforms disappear quickly. Combined with 3 AI opponents and lava at 8 seconds, the first round is chaotic and skill-agnostic.
- **WIN_SCORE = 5 means match length is unpredictable**: A 5-round match can end in as few as 5 quick rounds or drag through many rounds if scores are close.

## Suggested Improvements

1. **Start with 1 AI opponent in round 1, add one per round** — round 1: 1 AI, round 2: 2 AI, round 3+: 3 AI (or based on score). This creates a natural learning curve where the player practices 1v1 before facing a full 3v1. Change the AI count based on `currentRound < 2 ? 1 : currentRound < 3 ? 2 : 3`.

2. **Delay lava start from 480 to 720 frames (12 seconds)** — give players 4 extra seconds to orient, grab a weapon, and establish position before the arena starts closing. The lava acceleration thresholds at 900 and 1200 frames can remain, maintaining late-round urgency.

3. **Increase `CRUMBLE_TIME` from 120 to 180 frames (3 seconds)** — platforms should give the player a clear visual warning before disappearing. 2 seconds is too short when also managing combat and lava. 3 seconds rewards attentiveness without removing the mechanic's threat.

4. **Add 1 extra life per match (respawn once in round 1 only)** — let the player respawn at the top of the map once during round 1 only, to learn the arena layout without immediately losing the match. After round 1, no respawns (standard rules apply).

5. **Scale `WIN_SCORE` with player preference** — offer short (3), standard (5), and extended (7) match lengths at the start screen. New players benefit from shorter matches where a single bad round isn't catastrophic.

6. **Add per-round score display between rounds** — show a scoreboard between rounds (current scores: player vs AI1/AI2/AI3). Currently there is no moment of reflection — rounds transition immediately, preventing players from understanding how far they are from winning.
