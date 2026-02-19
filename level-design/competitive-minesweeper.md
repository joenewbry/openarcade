# Competitive Minesweeper

## Game Type
Puzzle racing / competitive single-player vs AI

## Core Mechanics
- **Goal**: Clear more safe cells than the AI within 120 seconds; reveal all non-mine cells to win outright
- **Movement**: Mouse-driven; click cells to reveal, right-click to flag suspected mines
- **Key interactions**: First click guarantees safety (mines placed after first move); hitting a mine costs 5 seconds off the clock; flagging a definite mine costs no time; AI uses constraint-based probability solving

## Controls
- Left click: Reveal cell
- Right click: Flag/unflag cell as suspected mine
- (Mouse only — no keyboard controls during gameplay)

## Difficulty Progression

### Structure
There is no difficulty progression within a session — each game uses the same board size and mine count regardless of player skill or games played. The only dynamic element is the AI's probabilistic move timing.

### Key Difficulty Variables
- Board size: `COLS = 10, ROWS = 10` — 100 cells
- Mine count: `MINES = 15` — 15% density (standard intermediate difficulty)
- Time limit: `TOTAL_TIME = 120` seconds — fixed
- Mine hit penalty: `-5` seconds from `timeLeft` per hit (applied to both player and AI)
- AI move delay: `300-600ms` per move (random in `aiDelay = 300 + Math.random() * 300`)
- AI wins if `aiCellsLeft <= 0` — AI clears board faster than the time limit almost always
- Score formula on player win: `cellsCleared * 10 + Math.floor(timeLeft) * 5 - playerMineHits * 10`
- Score formula on loss: `cellsCleared * 5 - playerMineHits * 10`

### Difficulty Curve Assessment
The AI is a near-perfect constraint-solver that will clear the board in roughly 60-90 seconds at its current move pace. A new player who doesn't know minesweeper logic will likely hit several mines, lose 25+ seconds from penalties, and never finish. The 15-mine density on a 10x10 board is the same as standard "intermediate" minesweeper — quite punishing for unfamiliar players. There's no easy mode or tutorial explaining the number logic.

## Suggested Improvements
- [ ] Add a difficulty selector: Easy (10 mines, 150s), Normal (15 mines, 120s), Hard (20 mines, 100s) by exposing `MINES` and `TOTAL_TIME` as configurable rather than fixed constants
- [ ] Slow down the AI on Easy mode by increasing `aiDelay` to `600 + Math.random() * 400` ms, giving beginners a fairer race
- [ ] Reduce mine penalty from 5 seconds to 3 seconds on Easy mode to prevent one early mistake from being effectively fatal to the timer
- [ ] Show a brief tutorial overlay explaining that numbers indicate adjacent mines, and that right-click flags a mine — many new players don't know standard minesweeper rules
- [ ] Award a small time bonus (+5 seconds) when the player correctly flags a mine and it gets confirmed at game end, rewarding good logical play
- [ ] Display the AI's current probability reasoning as a faint heat map on the AI's board so players can learn from it
