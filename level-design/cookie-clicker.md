# Cookie Clicker

## Game Type
Idle/incremental clicker

## Core Mechanics
- **Goal**: Reach 1,000,000 total cookies baked to win the game
- **Movement**: No movement; mouse-driven clicking on the cookie to earn cookies, clicking shop buttons to buy buildings
- **Key interactions**: Click the cookie to earn `cookiesPerClick` cookies per click; buildings generate cookies passively at their CPS rate; buying more of the same building costs 15% more each time (exponential scaling)

## Controls
- Click on cookie: Earn cookies
- Space: Also triggers a cookie click
- Click shop buttons or keys 1-6: Buy corresponding building
- Keys 1-6: Buy buildings by keyboard shortcut

## Difficulty Progression

### Structure
This is an idle game with a hard win condition at 1,000,000 total cookies. There is no traditional "difficulty" — the game becomes progressively easier as buildings accumulate and passive CPS grows. The challenge is front-loaded: early game is slow clicking with minimal income; late game is waiting for passive income to accumulate.

### Key Difficulty Variables
- Starting `cookiesPerClick = 1`; Cursor building adds `0.1` per click per cursor owned
- Building CPS rates: Cursor 0.1, Grandma 1, Farm 5, Factory 20, Mine 50, Bank 100
- Building costs (base): Cursor 15, Grandma 100, Farm 500, Factory 3000, Mine 10000, Bank 40000
- Cost scaling: `Math.floor(baseCost * Math.pow(1.15, count))` — 15% more per purchase, industry standard
- `MILESTONE = 1,000,000` cookies total — fixed win condition, no level scaling
- CPS needed to win in reasonable time: A Bank (100 CPS) at base cost 40,000 cookies means early players spend significant time clicking before passive income outpaces clicking
- Winning CPS estimate: 1 Bank + 2 Mines = 200 CPS → 1M cookies in ~83 minutes of idle — very slow

### Difficulty Curve Assessment
The early game before the first Grandma (100 cookies) is extremely slow — pure clicking with 1 cookie per click. The milestone of 1,000,000 is very high relative to early CPS. Players clicking at 2 clicks/second earn 120 cookies/minute before buildings, meaning the first building takes ~1 minute of pure clicking, which is reasonable, but the overall 1M milestone makes completion take 30-90 minutes depending on optimization — long for a casual session. There's no sense of mid-game pacing; it's either clicking or waiting.

## Suggested Improvements
- [ ] Reduce the win milestone from 1,000,000 to 500,000 to make a satisfying session achievable in 15-25 minutes rather than 30-90
- [ ] Increase `cookiesPerClick` starting value from 1 to 2 to give the very early game more engagement before the first building purchase
- [ ] Add a "Golden Cookie" random event that appears every 2-3 minutes and multiplies CPS by 7 for 30 seconds — a standard Cookie Clicker mechanic that breaks up the wait and rewards attentiveness
- [ ] Scale Cursor CPS contribution from `0.1` to `0.15` per cursor; currently 10 cursors only contribute 1 CPS total, making them feel worthless compared to a single Grandma
- [ ] Add a progress milestone reward at 100K cookies (e.g., unlock a free Farm) to give players a mid-game celebration before the slog to 1M
- [ ] Show an estimated "time to 1M at current CPS" display so players can evaluate whether to click more or buy more buildings
