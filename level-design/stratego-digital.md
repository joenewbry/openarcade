# Stratego Digital — Level Design Notes

## Game Type
Turn-based strategy board game (Stratego clone, 1 player vs 1 AI, full piece-placement + combat).

## Core Mechanics
- **Goal**: Capture the AI's Flag piece, or eliminate all movable AI pieces.
- **Board**: 10×10 grid. Lake obstacles at fixed positions block movement.
- **Pieces**: 40 pieces per side, ranks 1–10 plus Marshal (10), General (9), Colonel (8)... down to Scout (2), Miner (1), Spy (1), Bomb (B), Flag (F). Higher rank defeats lower (except Spy beats Marshal, Miner defeats Bomb).
- **Placement**: Player places all 40 pieces on their 4 bottom rows. Right-click auto-places randomly.
- **AI moves**: After `setTimeout 650ms` delay. AI scores moves with `aiScoreMove` function (with randomness factor).
- **Key interactions**: Move one piece per turn (Scout can move multiple squares). Attacking reveals both pieces — lower rank is removed (ties = both removed).

## Controls
- **Click piece**: Select piece to move
- **Click destination**: Move selected piece to empty square or attack enemy
- **Right-click (setup phase)**: Auto-place all pieces randomly
- **Drag (setup phase)**: Drag pieces to position them manually
- **End Setup button**: Confirm piece placement and start the game

## Difficulty Progression

### Structure
Single fixed-session match against one AI. No difficulty modes, no phases, no escalation. The AI uses the same strategy from move 1 to the final move. Score = number of AI pieces captured. No match timer.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| AI think delay | `setTimeout(650)` ms | Time before AI moves (~0.65 seconds) |
| `aiScoreMove` randomness | `(Math.random() - 0.3) * 4` | Randomness added to AI move scores |
| AI piece visibility | Hidden (unknown ranks) | Player cannot see AI piece ranks until combat |
| Player piece visibility | Fully visible | AI "knows" player's piece ranks (or plays as if it does) |
| Board size | 10×10 with lake obstacles | Fixed classical Stratego layout |
| Pieces per side | 40 | Standard Stratego complement |
| Auto-placement | Right-click trigger | Places player pieces randomly |

### Difficulty Curve Assessment
- **No difficulty ramp**: The AI plays at a constant skill level throughout the entire game. Early game (placement phase) and late game (endgame hunts) feel identical in AI quality.
- **AI randomness is a blunt instrument**: `(Math.random() - 0.3) * 4` adds noise biased slightly negative (−1.2 average), which makes the AI slightly worse than a pure greedy scorer. This is the only "difficulty" lever, and it's not exposed to the player.
- **The setup phase is the most important and least guided**: Where pieces are placed is the entire strategic foundation of Stratego. A random auto-placement (right-click) immediately places the player at a disadvantage against an AI that likely has a reasonable default setup. New players are not taught what good placement looks like.
- **AI 650ms delay feels slow**: In a game where the player must carefully consider moves, 0.65 seconds of AI thinking is fine tactically but feels unresponsive in late-game blitz situations. However, for a board game this is acceptable.
- **No win/loss explanation**: After the match ends (flag captured or pieces exhausted), the board clears with no post-game analysis. Players cannot review which AI pieces were where, preventing learning.

## Suggested Improvements

1. **Add difficulty tiers** — expose `AI_DIFFICULTY` setting with three modes:
   - `Easy`: Increase randomness to `(Math.random() - 0.3) * 10` and add 20% chance of picking a random legal move instead of the highest-scored move.
   - `Medium`: Current behavior (existing randomness factor).
   - `Hard`: Reduce randomness to `(Math.random() - 0.3) * 1` and add AI memory of player piece positions it has observed in combat.

2. **Add guided setup templates** — in the placement phase, offer 3 preset layouts the player can apply ("Defensive: Bombs around Flag," "Aggressive: High-rank pieces forward," "Balanced: Mixed approach"). Players can still customize after applying a template. This teaches strategic fundamentals to new players.

3. **Show a post-game board reveal** — after the match ends, reveal all AI piece positions (showing where the Flag was hidden, where Bombs were placed, etc.) for 5 seconds before returning to the menu. This single feature transforms every loss into a learning opportunity.

4. **Highlight valid moves after piece selection** — when the player clicks a piece, highlight all squares it can legally move to (and which are attacks). Scouts especially have multi-square movement that new players don't discover. This removes the "I didn't know I could do that" frustration.

5. **Add AI reaction to player patterns** — on `Hard` difficulty, track whether the player tends to move pieces in a specific direction and have the AI probe defensively on that flank. This makes Hard feel genuinely intelligent rather than just less random.

6. **Reduce auto-placement chaos** — when the player right-clicks to auto-place, use a heuristically decent default: place Bombs adjacent to Flag, put high-rank pieces on flanks, Miners in mid-field. Currently auto-placement is fully random, which may place the Flag in the front row with no Bomb protection — a guaranteed loss.
