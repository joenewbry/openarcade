# Splendor Online — Level Design Notes

## Game Type
Turn-based card/resource engine-building game (Splendor clone) vs AI opponent.

## Core Mechanics
- **Goal**: Reach 15 prestige points before the AI opponent does.
- **Resources**: Collect gem tokens (6 colors: white, blue, green, red, black, gold) to purchase development cards.
- **Cards**: Three tiers (tier 1: cheap/low prestige, tier 2: mid, tier 3: expensive/high prestige). Cards provide permanent gem bonuses and prestige points.
- **Nobles**: Tiles that award 3 prestige automatically when you meet their card-bonus thresholds.
- **Key interactions**: Take 3 different gems, take 2 of same gem (if ≥4 available), reserve a card (take 1 gold), or buy a card from board or hand.

## Controls
- **Click gem token**: Take that gem color
- **Click card**: Buy or reserve card (context-dependent)
- **Click noble**: No direct interaction (awarded automatically)
- **Turn-based**: Player acts, then AI acts after `aiThinkTimer = 40` frame delay

## Difficulty Progression

### Structure
Fixed single-session match against one AI opponent. No escalating difficulty — the challenge is purely strategic. Game ends when either player reaches 15 prestige. No levels, rounds, or ramping parameters.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `supply[g]` | 4 per gem color | Starting gem pool |
| `supply.gold` | 5 | Wild tokens available |
| `WIN_PRESTIGE` | 15 | Points needed to win |
| `aiThinkTimer` | 40 frames | Delay before AI moves (~0.67s at 60fps) |
| `aiScoreMove` randomness | none noted | AI evaluates all legal moves deterministically |
| AI heuristics | `evaluateBonusValue`, `howCloseToAfford`, `evaluateGemNeed` | AI scoring functions |

### Difficulty Curve Assessment
- **No progression**: The game has a single fixed difficulty with no ramp. A new player immediately faces the same AI as an experienced player.
- **AI feel**: The AI uses three scoring heuristics and has a fixed think delay of ~0.67 seconds. It plays competitively from turn 1 with no warmup phase.
- **Starting parity**: Both player and AI start with identical resources (0 gems, 0 cards), which is correct for a competitive card game.
- **Issue — no tutorial mode**: New players have no introduction to engine-building strategy before facing a competent AI.
- **Issue — opaque AI evaluation**: The AI's move scoring is not surfaced to the player, making it hard to learn from losses.

## Suggested Improvements

1. **Add difficulty tiers** — introduce an `AI_DIFFICULTY` variable (`'easy'`, `'medium'`, `'hard'`). On `easy`, cap AI evaluation at only considering tier-1 cards and add random noise `(Math.random() - 0.5) * 6` to every move score. On `hard`, remove the `aiThinkTimer` delay and let AI evaluate noble targets explicitly.

2. **Reduce `aiThinkTimer` only on hard** — currently `aiThinkTimer = 40` frames for all modes. On `easy`, increase to `90` frames and add a chance (20%) the AI picks a suboptimal move (random legal move). This makes early turns more forgiving.

3. **Surface AI reasoning hints** — after the AI moves, briefly highlight what it bought/reserved with a tooltip like "AI reserved a tier-2 card." This helps new players recognize patterns and learn the engine-building loop.

4. **Start with a shorter win target option** — add a `SHORT_GAME` mode where `WIN_PRESTIGE = 10` instead of 15. This gives new players a faster feedback loop to learn the card economy before playing full 15-point games.

5. **Introduce noble previews more clearly** — display which noble tiles are active and what card-bonus thresholds they require in a persistent HUD panel. Currently, players may miss nobles as a win condition entirely for the first few games.

6. **Add a "practice mode" with undo** — allow the player to undo their last action once per turn in a single-player practice session (no undo in competitive). This dramatically lowers the entry barrier for a complex card game without affecting competitive integrity.
