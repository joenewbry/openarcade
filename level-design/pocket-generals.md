# Pocket Generals

## Game Type
Turn-based tactical strategy (player vs AI on an 8×8 grid)

## Core Mechanics
- **Goal**: Capture the enemy base or eliminate all enemy units. The player controls blue units; the AI controls red units.
- **Movement**: Click a unit to select it, then click a valid destination cell (within the unit's move range). Click an enemy in attack range to attack.
- **Key interactions**: Terrain matters — Forest tiles grant +1 defense; Mountain tiles are impassable. Artillery attacks from range 2–3 without being able to fire at adjacent cells. Units do not regenerate HP between turns. There is no turn limit; the game ends only on victory or defeat.

## Controls
- Mouse Click: select unit, move unit, attack enemy unit

## Difficulty Progression

### Structure
Single-match format with no wave system or escalating parameters. Both sides have fixed unit pools set at game start. The AI uses a minimax algorithm at depth 1 with alpha-beta pruning to evaluate moves each turn. There is no difficulty increase over time — the AI plays at the same level from turn 1 to the end of the game.

### Key Difficulty Variables
- Grid: `8 × 8`, `CELL_W = 60` px, `CELL_H = 50` px
- Player starting units: `3 infantry + 1 tank + 1 artillery`
- AI starting units: same composition (3 infantry + 1 tank + 1 artillery)
- Unit stats:
  - Infantry: move `1`, HP `3`, attack `2`, range `1`
  - Tank: move `2`, HP `5`, attack `4`, range `1`
  - Artillery: move `1`, HP `2`, attack `5`, range `2–3`
- Forest terrain: `+1` defense bonus (reduces incoming damage by 1)
- Mountain terrain: impassable
- AI search depth: `1` ply (evaluates only its own immediate moves, not the player's response)
- No turn limit, no HP regeneration, no reinforcements

### Difficulty Curve Assessment
The depth-1 minimax AI is predictable for experienced tactics players — it cannot plan ahead and will make locally optimal moves that leave it vulnerable to 2-move combinations. However, for new players unfamiliar with turn-based tactics, the AI is still competent because the player must also figure out the artillery range restriction (no adjacent fire), Forest defense bonuses, and positional control simultaneously. The artillery is the most impactful unit (5 attack, range 2-3) but also the most fragile (2 HP), making it a glass cannon that new players frequently rush forward and lose immediately. The player and AI start with identical forces, giving no player handicap.

## Suggested Improvements
- [ ] Give the player a `+1` infantry advantage at game start (4 infantry instead of 3) as a built-in beginner handicap against the AI's perfect computational decision-making
- [ ] Add a move range preview on unit selection (highlight valid movement cells in blue and valid attack cells in red) so new players understand artillery's unusual range-2-minimum restriction immediately
- [ ] Increase artillery HP from `2` to `3` — at 2 HP a single infantry attack (2 dmg) or any tank hit destroys it, making it unreliable and discouraging players from learning its range mechanic
- [ ] Add a turn counter display (e.g. "Turn 12") and a simple unit-count summary (e.g. "Blue: 4 units | Red: 3 units") so the player can gauge game state at a glance
- [ ] Highlight forest tiles more distinctly and add a tooltip or label showing "+1 DEF" when hovering, since the terrain bonus is invisible to new players and materially changes combat outcomes
- [ ] Consider increasing AI search depth to `2` as an optional "Hard" mode, while keeping depth `1` as default — depth 1 is correct for a beginner-friendly default but offers no challenge to players who understand the minimax limitation
