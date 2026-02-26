# Puzzle Race -- Audit

## A) Works?
YES. Correct engine integration. Uses `new Game('game')`, implements callbacks, calls `game.start()`. Mouse click is handled via direct canvas listener with proper coordinate scaling.

Keyboard input uses `document.addEventListener('keydown')` directly (not the engine's `input` system). This is acceptable since the engine's `wasPressed` only tracks specific keys and the game needs number keys 1-9 + shift modifier detection. However, this listener is NOT removed on game reset, and new listeners are NOT added on restart, so there's no leak -- the listener is added once in `createGame()`.

DOM refs `scoreEl`, `bestEl` are used without null checks but exist in v2.html.

The Sudoku generation uses backtracking with random number ordering, and puzzle creation removes clues while verifying unique solvability via `countSolutions`. This is computationally expensive but runs once at init.

## B) Playable?
YES. Controls:
- Click cell on left grid to select
- Arrow keys to navigate selection
- Type 1-9 to place number
- Shift + 1-9 for pencil marks
- Backspace/Delete to clear
- Click to start/restart

The game presents two side-by-side Sudoku grids: player (left) and AI (right). Both solve the same puzzle. The AI uses a solve queue built from naked singles and hidden singles logic, placing numbers at intervals of 2-4 seconds.

Error detection: wrong numbers are shown in red with a flash animation. The game only ends (player win) when ALL cells are filled correctly.

## C) Fun?
YES. Novel concept -- Sudoku race against AI:
- Clear visual differentiation: player grid has selection highlights, AI grid shows progress
- Pencil marks system (Shift + number) for advanced Sudoku technique
- Error feedback with red flash animation
- Timer at top center with elapsed time
- Remaining cells counter for both player and AI
- Score system: win bonus = cells * 10 + time bonus; loss = correct cells * 5
- AI solve speed creates good pressure without being unfair
- Dashed divider between grids
- Controls help text at bottom

The AI difficulty is moderate -- it solves cells every 2-4 seconds, giving skilled Sudoku players a fair race.

## Verdict: PASS

Creative twist on Sudoku with the competitive AI race element. Solid implementation with pencil marks, error detection, and good visual feedback. The puzzle generation ensures unique solutions. No bugs found.
