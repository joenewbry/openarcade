# Stock Market Sim — Level Design Notes

## Game Type
Competitive trading simulation, turn-based (1 player vs 3 AI traders, 20 rounds).

## Core Mechanics
- **Goal**: End `MAX_ROUNDS = 20` with the highest portfolio value of all four players.
- **Resources**: Start with `$100,000` cash. Buy and sell shares of 8 stocks.
- **Market events**: 70% of rounds after round 1 trigger a market event (effects ±6–18% on 1–3 stocks).
- **Insider tips**: 50% of rounds provide a tip that may be accurate or misleading (tip is flagged as "reliable" or potentially deceptive).
- **AI strategies**: Three AI traders use distinct strategies — value (buy underpriced), momentum (follow trend), and contrarian (buy recent losers).
- **Key interactions**: Buy/sell any number of shares each round. Prices update after all players act. Scores are final portfolio value.

## Controls
- **Click stock**: Select stock to trade
- **+/- buttons or text input**: Set buy/sell quantity
- **Buy / Sell buttons**: Confirm transaction
- **End Turn button**: Pass to AI turns, then advance round
- **Portfolio panel**: Shows holdings, current value, cash remaining

## Difficulty Progression

### Structure
Fixed 20-round match against 3 AI traders. No difficulty modes or escalation. All AI traders start with identical $100,000 and use static strategies throughout. Market events and insider tips are random each session.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `startingCash` | $100,000 | All players begin equal |
| `MAX_ROUNDS` | 20 | Total game length |
| Stock `volatility` range | 0.04–0.09 | Per-round price swing percentage |
| Market event probability | 70% (after round 1) | Frequency of price shocks |
| Event price impact | ±6–18% | Range of stock price change per event |
| Insider tip probability | 50% | Frequency of trade hints |
| Tip accuracy | Variable | Tips may be misleading |
| AI strategies | value, momentum, contrarian | Fixed throughout match |
| Number of AI traders | 3 | Constant |
| Number of stocks | 8 | Fixed pool |

### Difficulty Curve Assessment
- **No difficulty ramp**: AI strategies are fixed and unchanging. A player who understands the market mechanics faces the same challenge in round 1 as round 19. This is appropriate for a competitive sim — the "difficulty" is the complexity of the market itself.
- **High event volatility early**: A 70% event rate starting from round 2 means the market is chaotic immediately. New players who haven't built a portfolio yet are hit by events with little understanding of which stocks to protect or diversify.
- **Insider tips are confusing without context**: A 50% chance the tip is misleading, with no indication of reliability, teaches distrust. New players don't know when to follow tips, leading to seemingly random outcomes.
- **20 rounds is the right length**: Long enough for strategies to differentiate, short enough to complete in one session (~10–15 minutes).
- **Equal starting position is fair but opaque**: All players at $100,000 is correct, but new players don't know which AI strategy they're competing against, making it hard to counter any specific approach.
- **No feedback on why AI won**: At game end, the final standings are shown but not why — e.g., "momentum AI rode the tech surge in rounds 12–16." This prevents learning.

## Suggested Improvements

1. **Add difficulty tiers** — introduce `AI_SKILL` levels. On `Easy`, AI traders make suboptimal decisions 30% of the time (random buy/sell instead of strategy-driven). On `Hard`, AI traders use predictive models and consider all 8 stocks simultaneously. The current behavior is effectively `Medium`.

2. **Reduce event frequency for rounds 1–5** — change the 70% event probability to scale: `Math.min(0.7, 0.3 + round * 0.08)`. This means rounds 1–5 have 30–70% event chance, giving new players time to understand baseline market behavior before chaos arrives.

3. **Make insider tips clearly tiered** — split tips into "Confirmed Intel" (always accurate, rare: 20% of tip events) and "Rumor" (50/50 accurate, common: 80% of tip events). Display the category to the player. This turns a confusing mechanic into a risk-management decision.

4. **Show AI strategies after game over** — in the end-screen, reveal which AI used which strategy and show a graph of each player's portfolio over 20 rounds. This post-game analysis is the primary teaching tool for players to improve in future sessions.

5. **Add a "tutorial round 0"** — before the 20 scored rounds begin, run a single unscored practice round with guided prompts ("The momentum AI just bought 50 shares of TECH — this means it expects prices to rise. What will you do?"). One tutorial round dramatically reduces early-game confusion without lengthening the main game.

6. **Cap max volatility stocks at 1–2 in the starting portfolio suggestions** — if the UI highlights 1–2 high-volatility stocks (0.08–0.09) as "high risk/high reward" and 2–3 low-volatility stocks (0.04–0.05) as "stable," new players immediately understand the trade-off without reading documentation.
