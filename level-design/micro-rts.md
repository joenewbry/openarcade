# Micro RTS

## Game Type
Real-time strategy — gather minerals, build an army, and destroy the enemy base before time runs out

## Core Mechanics
- **Goal**: Destroy the enemy `BASE_HP = 500` before time runs out (`GAME_TIME = 300` seconds); if time expires, higher remaining base HP wins
- **Movement**: Units move at type-specific speeds (Worker: 1.5, Soldier: 1.8, Tank: 0.9 px/frame); units auto-attack enemies in range
- **Key interactions**: Workers gather minerals (`GATHER_AMT = 8` per trip, `GATHER_TIME = 800` ms, `CARRY_MAX = 40`); spend minerals to train units; units auto-attack when enemies enter attack range; fog of war with `FOG_RADIUS = 120` px

## Controls
- Click unit to select; drag to box-select multiple
- Right-click to move selected units / assign workers to mineral patch
- Train unit buttons in base panel (Worker: 50, Soldier: 75, Tank: 150 minerals)
- Click enemy base to attack-move there

## Difficulty Progression

### Structure
Single match against 1 AI opponent. No campaign or level progression. AI difficulty does not scale — the AI follows a fixed 3-phase behavioral script per match.

### Key Difficulty Variables

| Variable | Value | Notes |
|---|---|---|
| `GAME_TIME` | 300 seconds (5 min) | Fixed |
| `MAX_UNITS` | 30 per player | Hard cap |
| Starting minerals | 100 each | Equal starts |
| Starting units | 2 workers each | Equal starts |
| AI Phase 1 (eco) | 0–60s elapsed | Focuses on gathering and training workers |
| AI Phase 2 (build) | 60–120s elapsed | Trains soldiers and tanks |
| AI Phase 3 (attack) | 120s+ elapsed | Attacks when `aiArmy.length >= 4` |
| AI defend trigger | Player units within 200 px of AI base | Pivots army to defense |

Unit stats:
- Worker: HP 40, speed 1.5, DMG 5, range 15, atkSpeed 1000ms, cost 50
- Soldier: HP 80, speed 1.8, DMG 15, range 18, atkSpeed 700ms, cost 75
- Tank: HP 200, speed 0.9, DMG 40, range 60, atkSpeed 1500ms, cost 150

### Difficulty Curve Assessment
The AI's 3-phase script is predictable but effective: a player who doesn't attack before 120 seconds faces a coordinated army push. The AI phases by elapsed time, not by economic position — a player who rushes aggressively at 90 seconds with only 3 soldiers will face an AI that hasn't started attacking yet, meaning early aggression is underrewarded. The `MAX_UNITS = 30` hard cap creates a strategic ceiling: a late-game army of 30 Tanks costs 4500 minerals, which is only achievable in 5 minutes with perfect economic play. Workers gathering 8 minerals per 800ms trip with a 40-mineral carry cap means each worker delivers 40 minerals per ~3.2 trip cycle (800ms gather + ~1600ms travel = ~2400ms) = ~16.7 minerals/sec from 1 worker. Starting with 100 minerals and 2 workers, a player can train their first Soldier in ~18 seconds if all 100 starting minerals are saved — but new players typically don't know to queue units immediately, so they fall behind the AI's optimized build order.

## Suggested Improvements
- [ ] Add a difficulty setting that adjusts AI phase timing: Easy (Phase 3 attack at 180s instead of 120s), Normal (current 120s), Hard (90s) — implement by changing `AI_ATTACK_PHASE_START = 180` on easy, giving beginners 60 more seconds before facing an army
- [ ] Reduce the AI defend trigger radius from 200 px to 150 px on Easy mode so players can probe the enemy base and retreat without immediately causing a full counter-attack pivot
- [ ] Start the player with 150 minerals (instead of 100) on the first game to allow an immediate Soldier purchase plus a Worker reinvestment, teaching the economy loop in the first 30 seconds rather than requiring 80+ seconds of saving before first combat unit
- [ ] Add a visual build-queue indicator showing what the AI is training (visible once scouted with a worker) so players can react to an incoming Tank rush rather than being surprised by it — store `aiTrainingQueue` in visible game state when player has vision of enemy base
- [ ] Cap Worker cost at 30 minerals (reduce from 50) to make economic investment feel faster and less costly — at 50 minerals, buying a 3rd worker delays combat units by nearly the same cost as a Soldier (75), making economic expansion feel uncompetitive
- [ ] Add a "practice mode" with AI frozen after Phase 1 (no attack ever) so new players can learn unit control, worker assignment, and the `FOG_RADIUS = 120` scouting mechanic without a ticking threat — toggle via a `practiceMode` flag that skips AI Phase 2 and 3 transitions
