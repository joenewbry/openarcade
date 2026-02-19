# Creep TD Versus

## Game Type
Tower defense / competitive real-time strategy (player vs AI)

## Core Mechanics
- **Goal**: Reduce the AI's lives to 0 by sending creeps that survive through their tower maze; defend your own base by building towers to kill the AI's creeps before they reach your exit
- **Movement**: No movement; mouse-driven placement on a 12×14 grid; towers must not block the only path from entry to exit (BFS pathfinding validates each placement)
- **Key interactions**: Buy towers from 4 types to defend; spend gold to send creeps to the opponent; passive gold income every 3 seconds; automatic waves every 10 seconds escalate the game

## Controls
- 1: Select Basic tower ($10)
- 2: Select Sniper tower ($25)
- 3: Select Splash tower ($30)
- 4: Select Slow tower ($15)
- S: Select Sell mode (returns `sellback` gold)
- Q: Send Basic creep ($8)
- W: Send Fast creep ($12)
- E: Send Tank creep ($20)
- R: Send Swarm creep ($15, sends 5 at once)
- Click: Place selected tower / sell tower in sell mode
- Right-click or Escape: Cancel selection

## Difficulty Progression

### Structure
Difficulty is a mix of passive time pressure (auto-waves) and active AI decisions. Auto-waves send creeps to both players every 10 seconds (`600 frames`), escalating in type. The AI makes building and sending decisions every ~70 frames with gold it accumulates alongside the player.

### Key Difficulty Variables
- Starting gold: `50` for both player and AI
- Passive income: `+5 gold every 3 seconds (180 frames)` — same for both
- Auto-wave schedule: Waves 1-3 (0-30s): Basic creeps; Waves 4-6 (30-60s): Fast; Waves 7-9 (60-90s): Tank; Wave 10+ (90s+): Swarm + Tank simultaneously
- AI build rate: Acts every `70 frames`; `buildWeight` favors towers when `towerCount < 6` (80%), decreases to 55% at 6-15 towers, 35% at 15+
- AI tower selection probability: Splash (25% if gold ≥30), Sniper (45% if ≥25), Slow (60% if ≥15), falls back to Basic otherwise
- AI creep sending: prefers Fast if player has <5 towers; prefers Tank if player has >12 towers
- Player starting lives: `20`; AI starting lives: `20`
- Creep stats: Basic (70 HP, speed 1.0, reward $3); Fast (40 HP, speed 2.2, reward $4); Tank (200 HP, speed 0.55, reward $8); Swarm (30 HP each ×5, speed 1.3, reward $1 each)

### Difficulty Curve Assessment
The first 30 seconds are reasonable — both sides are building with Basic creeps incoming. The transition at wave 4 to Fast creeps (speed 2.2) is a significant jump that can overwhelm an under-built defense. The AI's 80% build rate in early game means it builds towers aggressively while the player is still learning the interface. The simultaneous Swarm + Tank auto-waves from wave 10 onward are extremely hard to defend without a fully developed maze. New players often don't realize they need to intentionally lengthen the creep path through tower maze design.

## Suggested Improvements
- [ ] Increase starting gold from 50 to 75 to allow placing 2-3 Basic towers before the first auto-wave hits at 10 seconds
- [ ] Delay the first auto-wave from 10 seconds to 20 seconds (`1200 frames` instead of the first wave at `600`) to give players time to build an initial layout
- [ ] Change auto-wave 4+ from pure Fast to a mix of Fast and Basic (e.g., 1 Fast + 1 Basic) to smooth the transition rather than a sudden creep type switch
- [ ] Add a brief tutorial overlay on first game explaining path-lengthening strategy — the core insight of TD versus is non-obvious to new players
- [ ] Reduce AI `buildWeight` from `0.8` to `0.65` when `towerCount < 6` so the AI doesn't build a nearly complete defense in the first 30 seconds while the player is still figuring out the controls
- [ ] Add a kill counter milestone reward: every 10 creeps killed grants +10 gold bonus, incentivizing active defense rather than passive tower placement
