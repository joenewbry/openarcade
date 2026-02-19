# Factory Chain

## Game Type
Real-time strategy / factory builder vs. AI

## Core Mechanics
- **Goal**: Outscore the AI by building production chains that turn ore into products and ship them off the right edge for points before the 3-minute timer runs out
- **Movement**: No movement — point-and-click (or keyboard shortcuts) to place machines and belt tiles on your 10x8 grid
- **Key interactions**: Place machines (Smelter, Assembler, Constructor), draw belt connections between them, watch items flow left-to-right automatically; machines auto-pull from the left edge (ore) and auto-sell at the right edge

## Controls
- `1`: Select Smelter tool ($5)
- `2`: Select Assembler tool ($8)
- `3`: Select Constructor tool ($12)
- `4`: Select Belt tool ($1/tile)
- `5` / `x`: Select Delete tool (50% refund on machines)
- `Escape`: Cancel current tool
- `Click`: Place machine or set belt endpoints on player factory (left half of canvas)

## Difficulty Progression

### Structure
This is a single-session, fixed-duration match (180 seconds = `GAME_SECS = 180`). There is no level progression — the game ends when the timer hits zero. Difficulty is implicit: the AI opponent acts every 2 seconds with a hard-coded build strategy.

### Key Difficulty Variables
- `GAME_SECS`: fixed at 180 (3 minutes)
- Starting money: `playerMoney = 25`, `aiMoney = 25` (equal)
- Passive income rate: `1/3 credits/second` for both player and AI
- Machine costs: Smelter `5`, Assembler `8`, Constructor `12`
- Belt cost: `$1` per tile
- Production rates (in ticks at 60fps): Smelter `80`, Assembler `110`, Constructor `150`
- Output values per item: Ingot `$2`, Part `$5`, Product `$15`
- AI act interval: every `2000ms` (2 seconds)
- AI strategy: scripted sequential build — Smelter first, then Assembler, then Constructor, then belts; expands to 2 of each if money allows

### Difficulty Curve Assessment
The game is not too hard per se, but it's extremely opaque for new players. There is no tutorial or guided first build. The belt system requires two clicks (start then end), and the ore-to-product chain is non-obvious without reading the legend at the bottom. New players typically spend the first 60–90 seconds building nothing productive while the AI has a Smelter running at the 2-second mark. The AI has a significant first-mover advantage despite equal starting money.

## Suggested Improvements
- [ ] Give the player a pre-built Smelter and one belt on game start (deduct cost from starting $25) as a tutorial scaffold — or increase starting money from $25 to $40 to reduce the "figuring out the UI" tax
- [ ] Add a short (5-second) pre-game countdown or planning phase before the AI starts acting, so the player isn't already behind before they've placed anything
- [ ] Delay the AI's first action from 2 seconds to 8 seconds on the first match, giving the player time to observe and react — the AI instantly builds on game start
- [ ] Show a visual "production chain" diagram or highlighted example in the overlay before the game starts, so the Ore→Smelter→Ingot→Assembler→Part→Constructor→Product chain is obvious without reading tiny footer text
- [ ] Add a `Total Income` counter per factory so the player can see their throughput rate at a glance and understand what's working
- [ ] Consider extending `GAME_SECS` from 180 to 240 seconds — with the learning curve, 3 minutes is very short for a first-time player to build a meaningful chain
