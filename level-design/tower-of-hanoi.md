# Tower of Hanoi

## Game Type
Classic logic puzzle (Tower of Hanoi)

## Core Mechanics
- **Goal**: Move all disks from the leftmost peg to the rightmost peg, following the rule that a larger disk can never be placed on top of a smaller one; complete each puzzle in as few moves as possible
- **Movement**: No real-time movement; player clicks a source peg to pick up the top disk, then clicks a destination peg to place it
- **Key interactions**: Click source peg → click destination peg to move; undo a move with U or Z; the puzzle is solved when all disks are stacked on the right peg in order

## Controls
- Left-click on peg: select that peg as the move source or destination
- U / Z: undo the last move
- (Puzzle auto-advances to next level on completion)

## Difficulty Progression

### Structure
The game starts at level 1 with 3 disks and adds 1 disk per level completion, capping at 8 disks (level 6 and beyond all use 8 disks). The optimal move count is `2^numDisks - 1` — so level 1 requires at minimum 7 moves and level 6 (8 disks) requires 255. Score equals total moves made across all levels (lower is better); an efficiency score is displayed as `Math.max(10, Math.round(1000 * optimalMoves / score))`. There is no time limit and undo is always available.

### Key Difficulty Variables
- Level 1: 3 disks, optimal 7 moves
- Level 2: 4 disks, optimal 15 moves
- Level 3: 5 disks, optimal 31 moves
- Level 4: 6 disks, optimal 63 moves
- Level 5: 7 disks, optimal 127 moves
- Level 6+: 8 disks, optimal 255 moves (cap; formula: `Math.min(numDisks, 8)`)
- Score: cumulative move count (lower is better)
- Efficiency: `Math.max(10, Math.round(1000 * optimalMoves / totalScore))`
- Undo: available via `u` or `z` key, no limit

### Difficulty Curve Assessment
The jump from level 2 (4 disks, 15 moves) to level 3 (5 disks, 31 moves) doubles the required move count and introduces the need to remember a multi-step recursive strategy. Players who solved levels 1–2 by intuition hit a wall at level 3 without understanding the underlying algorithm. The 8-disk cap (255 moves) is a significant endurance challenge that many players will not attempt since there is no reward differentiation between solving it efficiently versus solving it at all.

## Suggested Improvements
- [ ] Display the `optimalMoves` count for the current puzzle alongside the player's current move count at all times (e.g. "Moves: 12 / Optimal: 7") so players can see how their solution compares in real time rather than only at puzzle completion
- [ ] Show a "hint" button that highlights which disk should be moved next using the recursive optimal algorithm — one hint per click, not the full solution — to help players who are stuck at level 3+ without removing the satisfaction of solving it themselves
- [ ] Add a per-level move history display (not just current session total) so players can track their personal best for each disk count; the current cumulative score makes it impossible to know if you improved on a specific puzzle
- [ ] Cap the progression at 7 disks (127 optimal moves) instead of 8 (255 optimal moves) as the maximum level — the jump from 7 to 8 disks is a doubling that most casual players will not find enjoyable, and ending at 7 provides a more satisfying difficulty ceiling
- [ ] Add a brief explanation of the Tower of Hanoi rule ("larger disks can never go on smaller ones") as a one-time overlay before level 1 starts — the rule is visible in the game but nowhere explicitly stated, causing new players to attempt invalid moves and get confused when they are blocked
