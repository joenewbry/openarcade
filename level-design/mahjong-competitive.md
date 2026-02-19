# Mahjong Competitive

## Game Type
Turn-based card/tile game — competitive Japanese Riichi Mahjong against 3 AI opponents

## Core Mechanics
- **Goal**: Score the most points across all hands; players start at 25000 points each; highest score at game end wins
- **Movement**: No spatial movement — hand management and discard selection each turn
- **Key interactions**: Draw and discard tiles; declare Riichi (costs 1000 points, locks hand); call Pon/Chi/Kan to take discards; win by completing a valid hand (4 sets + 1 pair); dealer rotates on non-dealer wins

## Controls
- Click tiles to select/discard
- Buttons for Riichi, Pon, Chi, Kan, and Tsumo/Ron declarations

## Difficulty Progression

### Structure
No difficulty scaling — the game runs a fixed East round + South round (up to 8 total hands). All rules apply from hand 1. The AI opponents use `aiEvalDiscard` (entropy/shanten-based discard selection) and `aiShouldCall` logic throughout the entire game without any handicapping.

### Key Difficulty Variables

| Variable | Value | Notes |
|---|---|---|
| Starting points | 25000 each | Fixed for all players |
| Rounds | East + South (max 8 hands) | Fixed structure |
| AI discard logic | `aiEvalDiscard()` | Full logic active from hand 1 |
| Riichi cost | 1000 points | Fixed |
| Scoring | `fanToPoints(fan, isDealer)` | Standard Riichi Mahjong values |

There are no difficulty levels, no AI handicap parameters, and no progressive unlocks. This is a single fixed difficulty game.

### Difficulty Curve Assessment
For players unfamiliar with Riichi Mahjong, the game has no onboarding — all 5 call types (Riichi, Pon, Chi, Kan, Tsumo/Ron) and hand-reading are available immediately with no guidance. The AI uses competent discard logic from the first draw, which makes early hands punishing for beginners who are still learning which tiles to keep. The 8-hand structure (East + South rounds) means a bad start is nearly unrecoverable — losing 8000+ points on a dealer hand in hand 1 leaves very little room to come back. There is no "easy mode" or rule variant (e.g. no-Riichi beginner mode). The game suits players who already know Mahjong; it is inaccessible as an introduction to the game.

## Suggested Improvements
- [ ] Add a difficulty selector at game start: Easy (AI uses random discard from bottom 4 tiles of hand), Normal (current `aiEvalDiscard`), Hard (current AI + aggressive calling) — this requires adding a `difficulty` parameter to AI functions
- [ ] Implement a "beginner mode" toggle that disables Riichi and Kan, reducing complexity from 5 interaction types to 3 (Pon, Chi, Ron/Tsumo) and making the hand-completion goal clearer for new players
- [ ] Add a hand analyzer overlay that highlights the player's current shanten count ("3 tiles from winning") and color-codes useful vs useless tiles, giving beginners the same feedback the AI uses implicitly
- [ ] Show a brief pop-up explanation when any call button first becomes available (e.g. "Pon: take this tile to make a set of 3") to teach the rules through play rather than requiring prior knowledge
- [ ] Add an East-only (4-hand) quick game mode alongside the full East+South game, so beginners can complete a game in half the time and iterate on learning faster
- [ ] Consider starting beginners at 30000 points (change starting points from 25000 to 30000 in easy mode) to provide a buffer against early high-value losses while learning
