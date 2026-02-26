# Factory Chain -- Audit

## Files
- `/Users/joe/dev/openarcade/factory-chain/game.js` (887 lines)
- `/Users/joe/dev/openarcade/factory-chain/v2.html` (120 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used for start/end screens
- `setScoreFn` registered with `Math.floor(score)`
- `game.start()` called
- `onUpdate` receives `dt` parameter and uses it for time-based simulation

DOM structure:
- `canvas#game` 600x500
- Standard overlay elements
- `#score`, `#aiScore`, `#timer`, `#infoText` present
- Toolbar buttons use `onclick="selectTool('...')"` which requires `window.selectTool` -- this is correctly set on line 456

Mouse events use `pendingClicks` and `pendingMoves` queues with proper coordinate scaling. Hover cell tracking works for placement preview.

The `hexToRgb` function on line 462 expects 6-char hex colors (e.g., `#e88030`), and all `MTYPE` colors use this format, so no parsing issues.

## B) Playable?

**PASS**

Controls:
- **Click toolbar buttons** or **number keys 1-5**: Select tool (Smelter, Assembler, Constructor, Belt, Delete)
- **Escape**: Cancel selection
- **Click on player factory grid**: Place machine/belt or delete

Game mechanics:
- Split screen: Player factory (left) vs AI factory (right)
- Production chain: Ore (left edge) -> Smelter ($5, makes ingots $2) -> Assembler ($8, makes parts $5) -> Constructor ($12, makes products $15) -> Exit (right edge)
- Belts ($1/tile) connect machines; click start then end for L-shaped path
- 3-minute timer
- Passive income: $1 every 3 seconds
- AI builds its own factory independently every 2 seconds

Machine simulation is frame-rate-dependent via `dt`: ore intake at 0.025/tick for smelters from edge, machines process on timers, output flows to next machine or exit. Buffers cap at 3 input/3 output.

The inspect mode (click with no tool selected) shows machine stats -- very helpful for debugging production chains.

## C) Fun?

**PASS**

Engaging factory-builder:
- Clear production chain with visible flow
- AI competitor adds urgency
- Real-time simulation with progress bars on machines
- Hover preview shows placement validity (green/red)
- Belt path preview with L-shaped line
- Edge indicators: green arrows (ore supply) on left, dollar signs (exit) on right
- Animated belt chevrons
- Machine glow when processing
- Keyboard shortcuts for fast play
- Bottom legend explains the full chain

The 3-minute timer creates pressure. The AI is competent but beatable -- it follows a scripted strategy (smelter -> assembler -> constructor) which the player can outpace with efficient layout.

Small critique: belt placement could be more intuitive. The L-shaped routing sometimes places belts in unexpected positions. But the delete tool and 50% refund on machines mitigate this.

## Verdict: PASS

Strong factory management game. The production chain concept is clear, the AI provides good competition, and the 3-minute timer creates urgency. Controls work well with both mouse and keyboard. The simulation runs correctly with dt-based timing. No bugs found.
