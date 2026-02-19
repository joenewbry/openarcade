# Merchant Routes

## Game Type
Economic strategy / trading game — buy and sell goods across cities to out-earn 2 AI competitors in 25 turns

## Core Mechanics
- **Goal**: Accumulate the most gold after `MAX_TURNS = 25` turns by buying goods cheap and selling them high across 10 cities
- **Movement**: Select destination city each turn; travel consumes the turn regardless of distance
- **Key interactions**: Buy goods at current city price; sell at other cities; prices fluctuate via supply/demand; buy carts to expand carrying capacity; random events trigger every 3 turns affecting prices and conditions

## Controls
- Click city on map to travel
- Click goods to buy/sell quantities
- Click cart upgrade to purchase

## Difficulty Progression

### Structure
No difficulty scaling within a game — fixed 25-turn structure. Difficulty comes from competing against 2 AI opponents who also trade optimally. No levels or progression between games.

### Key Difficulty Variables

| Variable | Value | Notes |
|---|---|---|
| `MAX_TURNS` | 25 | Fixed game length |
| Starting gold | 100 each | Player and all AI start equal |
| Starting carts | 1 (capacity 6) | Fixed |
| Cart cost | `50 * player.carts` | 50 for 1st, 100 for 2nd, 150 for 3rd |
| AI starting city | Player: 0, AI1: 5, AI2: 9 | Spread across map |
| Event frequency | Every 3 turns | 12 events in `EVENTS` array |
| Cities | 10 | Fixed map |
| Goods | 8 types | Fixed catalog |

### Difficulty Curve Assessment
The game is primarily competitive against 2 AI opponents rather than a difficulty ramp. The main friction for new players is the opacity of the price system — `getCityPrice` uses supply/demand math that isn't visible, so beginners don't know where to sell what they just bought. The 25-turn limit is tight: 1 cart (capacity 6) at 100 gold starting means the first profitable route must be found within 3–4 turns or the player falls behind AI opponents that start spread across the map (cities 0, 5, 9) and can independently exploit different regional markets. The escalating cart cost (`50 * player.carts`: 50, 100, 150) means the second cart costs as much as the first but the third cart costs 3x the first — cart investment requires strong early trading to justify. Random events every 3 turns can positively or negatively affect all traders equally, which is fair but can swing the game unpredictably.

## Suggested Improvements
- [ ] Add a "market tip" UI element that shows the top 2 profitable trade routes from the current city (e.g. "Iron: sell at City 7 for +40 profit") calculated from current prices, helping new players understand the price system without exposing all information
- [ ] Reduce AI starting advantages on an easy mode: set AI starting gold to 75 (vs player's 100) and AI starting city to adjacent cities (1 and 2 instead of 5 and 9) so the player has a geographic advantage to learn the trading loop
- [ ] Add a price history sparkline (last 5 turns) for each good in each city so players can identify trends rather than making blind trades — store `priceHistory[city][good]` as a rolling 5-entry array
- [ ] Increase starting gold from 100 to 150 for the first game (use a `gamesPlayed` counter in localStorage) to give new players a buffer to make mistakes while still learning the cart upgrade decision tree
- [ ] Add a "tutorial game" with only 1 AI opponent (instead of 2) and guided prompts for the first 5 turns ("You're at City 0. Iron is selling at City 3 for a 30-gold profit. Travel there?") before enabling free play
- [ ] Show a post-game summary of each AI's most profitable routes to teach players which trade patterns work — this turns each loss into a learning experience rather than an opaque outcome
