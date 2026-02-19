# Go (Baduk)

## Game Type
Two-player abstract strategy board game (player vs. MCTS AI)

## Core Mechanics
- **Goal**: Control more territory than the opponent by the end of the game; the game ends when both players pass consecutively; score is calculated using Chinese area scoring (stones on board + surrounded empty intersections + komi for White)
- **Movement**: Click any empty intersection to place a black stone; the AI (White) responds automatically after each placement; stones are permanent unless captured
- **Key interactions**: Capture opponent stones by surrounding all their liberties; pass your turn using the Pass button; ko rule prevents immediately recapturing a single stone; suicide moves are illegal; game score updates live in the HUD

## Controls
- `Mouse click`: Place black stone at the nearest valid intersection (snaps within `CELL_SIZE * 0.5` radius)
- `Mouse hover`: Displays a ghost stone preview at legal positions; illegal or occupied positions show no preview
- `PASS button` (on-screen): Pass the current turn; two consecutive passes end the game

## Difficulty Progression

### Structure
Go (Baduk) has no level counter or difficulty ramp — every game is played on the same 9×9 board against the same MCTS AI with fixed parameters. The game ends when both players pass, then final score is computed and the player can restart. There is no progression system; the AI difficulty is constant from game 1 onward.

### Key Difficulty Variables
- `BOARD_SIZE`: `9` (fixed; 9×9 grid, 81 intersections)
- `KOMI`: `6.5` (compensation points added to White's score to offset Black's first-move advantage)
- AI simulation budget (`sims`):
  - Stone count < 10: `400` simulations
  - Stone count 10–29: `500` simulations
  - Stone count ≥ 30: `600` simulations
- MCTS exploration parameter: `explorationParam = 1.41` (UCB1 constant)
- Random playout pass probability: `0.1` (10% chance per move of forcing a pass during rollout)
- Playout move cap: `movesLeft = 81 * 2 = 162` moves max per simulation
- Eye avoidance: up to 5 attempts to find a non-eye move during rollouts before passing
- AI uses `getLegalMovesStrict` (full copy+tryPlace check) for expansion and `getLegalMoves` (fast heuristic) for random rollouts
- Scoring: Chinese area scoring — each intersection counts 1 point for the color that owns it (stone or territory); White adds KOMI

### Difficulty Curve Assessment
The MCTS AI is competent for a casual player but has known weaknesses that experienced Go players will exploit. With 400–600 simulations on a 9×9 board, the AI can evaluate roughly 4–8 moves to 1 ply of depth via tree search before the playout budget runs out — it plays reasonable joseki-like sequences in the opening but tends to make territorial miscalculations in complex middle-game fights. The AI also lacks any opening book or pattern database, so it does not reliably play star points or efficient corner openings. For complete beginners, the AI is a challenging opponent because they do not yet understand liberties, capturing, or territory — the game offers no tutorial or guidance. For experienced Go players (even at 15–20 kyu), the AI is beatable with consistent corner play and reducing White's territory systematically. There is no adjustable difficulty level, handicap system, or stone advantage option.

## Suggested Improvements
- [ ] Add a handicap system: allow the player to request 2–9 handicap stones placed at star points before the game begins (standard Go handicap positions for 9×9 are [2,2], [2,6], [6,2], [6,6], [4,4]), and reduce `KOMI` to `0.5` when handicap stones are placed — this makes the AI beatable for beginners and harder for stronger players
- [ ] Add a difficulty selector that adjusts the simulation budget: Easy = `100` sims, Medium = `400`–`600` sims (current), Hard = `1200` sims — this is a simple change that meaningfully affects AI strength without structural changes to the MCTS code
- [ ] Show a brief territory overlay during gameplay (not just at game end): a translucent territory shading that updates every few moves would help beginners understand where they are winning or losing, since reading territory is the hardest skill for new players
- [ ] Add a "hint" button that runs a quick MCTS pass (e.g. 200 sims) and highlights the suggested move with a green marker — a single-use or limited-use hint would lower the skill floor significantly without removing challenge
- [ ] Display last-move markers more prominently: the current red dot (`STONE_RADIUS * 0.3`) is subtle on the dark board; enlarging it to `STONE_RADIUS * 0.45` or using a contrasting color (bright yellow) would help players track the AI's responses without losing their place
- [ ] Add a basic tutorial overlay or rule tooltip: the game starts with no explanation of liberties, capture, ko, or scoring — a first-launch "How to Play" screen with 4–5 illustrated slides would dramatically improve accessibility for players unfamiliar with Go
