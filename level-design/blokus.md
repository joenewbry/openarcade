# Blokus

## Game Type
Abstract strategy board game (1v1 vs AI)

## Core Mechanics
- **Goal**: Place more cells on the 14x14 board than the AI; each piece must touch your existing pieces only at corners (not edges)
- **Movement**: Click pieces in the panel to select; move mouse over board for placement preview; click to place
- **Key interactions**: Piece rotation (R), flip (F), piece selection, corner-touch placement rule; pass button when no moves available

## Controls
- Mouse click on piece panel: select piece
- Mouse click on board: place selected piece
- R: rotate piece clockwise
- F: flip piece horizontally
- Pass button (HTML element): pass turn when no valid move exists

## Difficulty Progression

### Structure
There is no progression — the game is a single match of Blokus on a fixed 14x14 board with the standard 21-piece Blokus set for both sides. Player starts at top-left corner (0,0); AI starts at bottom-right corner (13,13). The game ends when both players have no valid moves.

### Key Difficulty Variables
No numeric difficulty variables. The AI uses a fixed scoring heuristic:
- `pieceSize * (earlyGame ? 4 : 2)` — values large pieces more in the early game
- `cornerGain * 2.5` — rewards moves that expand its own valid-corner reach
- `oppLoss * 1.5` — rewards moves that reduce the player's valid corner count
- `earlyGame` threshold: first 8 AI pieces placed (`totalPiecesUsed < 8`)
- Early game: subtract `cd * 0.15` to discourage moves far from board center (6.5, 6.5)

### Difficulty Curve Assessment
The AI plays a reasonable greedy strategy and will consistently beat new players who don't understand the corner-touching mechanics. However the AI is not optimal — it evaluates all legal moves each turn with a single-ply heuristic and no lookahead, so an experienced Blokus player can beat it. The game is appropriately challenging for a solo puzzle experience, though the complete absence of difficulty settings means beginners and veterans face identical opposition.

## Suggested Improvements
- [ ] Add a beginner AI mode that picks uniformly at random among legal moves (ignoring the corner-gain and opponent-loss terms) so new players can learn corner-touch rules without being blocked immediately
- [ ] Display the number of cells placed in real-time (not just pieces remaining) so players can track progress toward a win without mental arithmetic
- [ ] Highlight the player's valid corner squares more prominently — the current `CORNER_DOT` opacity of 0.55 is easy to miss; increase to 0.85 and add a subtle pulse animation
- [ ] Add an undo button (similar to bridge-building-race) to undo the most recent player move, encouraging experimentation without fear of ruining the game
- [ ] Show a preview of how many corners the selected placement would open/close before the player commits to placing
