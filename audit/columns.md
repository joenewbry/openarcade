# Columns Audit

## A) Works?
YES. Clean engine integration. 300x600 canvas with 6-column, 13-row grid. Piece is a vertical column of 3 gems that falls and can be moved left/right or cycled (rotated). Match detection checks horizontal, vertical, and both diagonals for 3+ of same color. Gravity, chain reactions, flash animation on clears all implemented.

## B) Playable?
YES. ArrowLeft/Right to move, ArrowUp to cycle gem order, ArrowDown for soft drop, SPACE for hard drop. Ghost piece shows landing position. Level increases every 30 gems cleared, speeding up drop rate. Game over when spawn column is blocked.

## C) Fun?
YES. Faithful Columns implementation with good visual polish: gem glow effects, ghost piece preview, flash animation on matches, chain combo text display. 6 distinct gem colors. Scoring rewards chains with multipliers. Level progression provides good difficulty curve.

## Issues Found
- **Minor**: `BOARD_Y_OFFSET` is `H - ROWS * CELL = 600 - 13*50 = -50`. This means the top row of the board is drawn 50px above the canvas top edge, which is intentional -- it provides a hidden buffer row. Pieces spawn at `row: -2` which is further above. This works but means the top row is partially visible.
- **Minor**: No `best` score persistence across page loads.
- **Minor**: The `canMove` function checks `r >= ROWS` for bottom boundary but pieces at `row = -2` with 3 gems means indices -2, -1, 0 -- the check `r >= 0 && board[r][col] !== null` correctly skips negative rows.
- **Potential Issue**: With only 6 columns and 13 rows, the board fills up relatively quickly. This is standard for Columns but may feel small.

## Verdict: PASS
Solid puzzle game. Clean mechanics, good visual feedback with ghost pieces and chain animations.
