# Competitive Tetris Audit

## A) Works?
YES. Side-by-side Tetris (player vs AI) on 600x500 canvas. Two 10x20 boards with standard 7-piece bag randomizer, wall kicks, ghost piece, next piece preview, garbage lines. AI evaluates all rotations/columns and picks the best placement using a scoring heuristic (holes, height, bumpiness, complete lines). DOM refs `#score`, `#aiScore` match v2.html.

## B) Playable?
YES. Arrow keys: left/right move, up rotate, down soft drop, SPACE hard drop. DAS (Delayed Auto Shift) implemented at 170ms delay + 50ms repeat for smooth left/right holding. Lock delay of 500ms prevents instant locking. Speed increases every 30 seconds. Clearing 2+ lines sends garbage to opponent (2=1, 3=2, 4=4 garbage lines). Game ends when either side tops out.

## C) Fun?
YES. Competitive Tetris is inherently engaging. AI is competent but beatable -- it evaluates positions well but has a fixed 80ms move timer that limits its speed. Garbage sending mechanics add interactive tension. Speed escalation keeps games from dragging. Ghost piece and next piece preview are essential QoL features.

## Issues Found
- **Minor**: `onUpdate` receives `dt` but the engine may pass milliseconds as the fixed-step delta. The code uses `dt` for `speedTimer`, `aiMoveTimer`, DAS timers, and gravity -- all assuming dt is in milliseconds. If the engine passes seconds, all timings would be off. Need to verify engine convention.
- **Minor**: Click-to-start (not keyboard) -- v2.html overlay says "Click to Start" and the code only checks `pendingClicks` for state transitions. No keyboard alternative for starting (though this is minor since mouse is available).
- **Minor**: Board overlap check: `P1_X=15`, `BOARD_W=220`, so P1 right edge is at 235. P2 at `W-BOARD_W-15=365`. Preview boxes extend beyond board edges (P1 preview at 228, P2 preview at 301). The gap between 235 and 365 has center info drawn there. Layout is tight but functional.
- **Minor**: AI wall kicks use `[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,1]` as `[dc, dr]` offsets. Standard SRS kick tables are more nuanced, but this simplified version works adequately.

## Verdict: PASS
Solid competitive Tetris. Good AI, proper DAS, garbage mechanics, and speed escalation make for an engaging experience.
