# Tower Wars

## Game Type
Dual-grid tower defense vs. AI (send creeps / build towers simultaneously)

## Core Mechanics
- **Goal**: Reduce the AI's lives from 20 to 0 by sending creeps through its maze, while defending your own base against AI-sent creeps.
- **Movement**: Creeps pathfind via BFS from a fixed entry cell (row 1, col 0) to exit cell (row 14, col 12) on each 13x16 grid.
- **Key interactions**: Place towers on your grid to kill incoming creeps; spend gold on sending creeps to the AI's grid; sell towers for half cost.

## Controls
- Mouse click on player grid: place selected tower type (if affordable and path remains open)
- Mouse click on sell mode: remove tower, refund sell value
- HTML buttons: select tower type (Arrow, Cannon, Ice, Zap), Sell mode, Send Creep buttons (Scout, Soldier, Tank, Speed)

## Difficulty Progression

### Structure
The game is open-ended — no discrete levels or waves. It runs as a continuous real-time duel until one side reaches 0 lives (starting at 20 each). Two timers drive pacing:
- **Gold timer**: every 2000 ms both player and AI receive +3 gold passively.
- **Wave timer**: every 8000 ms the game automatically sends a Scout (type 0) to both sides, regardless of player action.
- **AI action timer**: every 2000 ms the AI calls `aiDecide()` — 55% chance to build a tower, else send a creep.

### Key Difficulty Variables
- `playerGold` / `aiGold`: both start at `50`, passive income `+3` per 2 seconds
- `BALL_SPEED_BASE` (N/A — no speed escalation for creeps; speed is fixed per type)
- Scout speed: `1.8`, Soldier: `1.0`, Tank: `0.6`, Speed creep: `2.5`
- AI decision interval: `2000 ms` (fixed, never accelerates)
- Auto-wave Scout interval: `8000 ms` (fixed, never accelerates)

### Difficulty Curve Assessment
The AI acts every 2 seconds with unlimited time and 50% tower-priority — it consistently out-builds most new players who are still figuring out tower placement. There is no warm-up period: the AI begins acting and creeps begin flowing immediately at game start, giving the player no time to establish a basic defense before threats arrive.

## Suggested Improvements
- [ ] Add a 10-15 second pre-game build phase where gold ticks but no creeps or AI actions fire, letting the player place 2-3 starter towers before combat begins.
- [ ] Slow the AI action interval from 2000 ms to 3500 ms for the first 30 seconds of play, then ramp down to 2000 ms, so new players aren't immediately overwhelmed.
- [ ] Increase starting gold from `50` to `80` for the player only (not AI) to allow a better initial defense footprint.
- [ ] Make the auto-wave (currently always a Scout) escalate over time: first 2 minutes send Scouts, then alternate Scout/Soldier, then Scout/Soldier/Tank, so there is a genuine ramp.
- [ ] Increase `playerLives` / `aiLives` from `20` to `30` to extend games and reduce "sudden death" feel early on.
