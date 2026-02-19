# Tile Kingdoms

## Game Type
Tile-placement board game (Carcassonne clone)

## Core Mechanics
- **Goal**: Score more points than the AI opponent by placing tiles to complete cities, roads, and monasteries, and by placing meeples (followers) on features to claim them
- **Movement**: No real-time movement; player draws a random tile and must place it adjacent to existing tiles on the board, following edge-matching rules
- **Key interactions**: Click a valid board position to place the current tile; optionally click a feature on the placed tile to place a meeple; click "Pass" to skip meeple placement; game ends when the tile pool is exhausted

## Controls
- Left-click on board: place current tile at that position
- Left-click on placed tile feature: place a meeple on that feature
- Pass button: skip meeple placement for the current turn

## Difficulty Progression

### Structure
Tile Kingdoms is a finite game with no difficulty escalation. The pool contains ~57 tiles across 14 types (castle, road, monastery, field, and combinations thereof). Both the player and AI start with 7 meeples. The AI uses `evaluateAIMove()` to score all legal placements and picks the highest-value move; it does not make intentional mistakes or adjust difficulty based on score. The game ends when the tile pool is empty — typically after 57 total turns (split between player and AI).

### Key Difficulty Variables
- Tile pool: ~57 tiles total, 14 distinct tile types
- Starting meeples: 7 per side
- `TILE_SIZE`: 40 pixels
- AI strategy: `evaluateAIMove()` scores every legal position/rotation combination and picks the maximum
- Scoring: completed city = 2 pts per tile; completed road = 1 pt per tile; completed monastery = 9 pts; meeples returned on feature completion
- No time limit, no randomness in AI decision-making (deterministic best-move selection)

### Difficulty Curve Assessment
The AI selects the objectively best move every turn, making it a strong opponent for a player who is still learning what constitutes a "good" tile placement. There is no difficulty setting, no grace period, and no AI mistake tolerance. Since the AI evaluates all rotations simultaneously, a new player who doesn't know Carcassonne rules will lose by a large margin while having no insight into why their placements are suboptimal.

## Suggested Improvements
- [ ] Add an "Easy" mode that introduces noise into the AI evaluation: `score += (Math.random() - 0.5) * evaluatedScore * 0.4` before selecting the best move, causing the AI to occasionally pick suboptimal placements and letting new players learn the tile-matching system
- [ ] Highlight valid placement positions on the board before the player clicks — the current UX requires trial-and-error clicking to find legal spots, which is friction rather than strategy
- [ ] Show a meeple count display for both sides in the HUD at all times (currently you must count meeples on the board manually); running out of meeples is a critical resource constraint that needs to be visible
- [ ] Add a score breakdown at game end showing points per feature type (cities, roads, monasteries) for both sides so players understand where they gained or lost points
- [ ] Show the remaining tile count and a small preview of the next 2–3 tiles in the queue so players can plan ahead — the current single-tile draw with no preview makes late-game strategy nearly impossible
- [ ] Consider a "Tutorial mode" that plays the first 6 tiles automatically with explanatory popups showing why each tile was placed there, teaching the scoring rules before the competitive match starts
