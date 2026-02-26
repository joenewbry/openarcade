# Creep TD Versus Audit

## A) Works?
YES. Tower defense versus game on 800x500 canvas. Two 12x14 grids side by side. Player builds towers on their field, sends creeps to opponent's field. AI does the same. BFS pathfinding ensures path from entry to exit is always maintained. DOM shop buttons wired via `window.selectTower` / `window.sendCreep` globals. Canvas mouse events for tower placement.

## B) Playable?
YES. Click to place selected tower on your field (left grid). Keys 1-4 select tower types (Basic, Sniper, Splash, Slow). Keys Q/W/E/R send creeps to AI's field (Basic, Fast, Tank, Swarm). S key enters sell mode. Right-click or ESC cancels selection. Towers auto-target creeps with furthest path progress. Creeps follow BFS path, repath when towers block their route. Auto-waves every 10 seconds escalate difficulty. Lives system: creeps reaching exit cost 1 life. First to 0 lives loses.

## C) Fun?
YES. Strong strategic depth: maze-building to lengthen creep paths, choosing when to build vs. send creeps, tower type selection (splash for groups, slow for tanks, sniper for range). AI builds towers and sends appropriate counter-creeps (fast vs few towers, tanks vs many towers). Passive income every 3 seconds funds both sides. Auto-waves prevent stalling. Good visual feedback: path glow, tower firing flash, projectile trails, floating gold text, death particles.

## Issues Found
- **Minor**: `window.selectTower` and `window.sendCreep` are set as globals from inside the module. The HTML buttons use `onclick="selectTower('basic')"` which requires these to be global. This works but is fragile -- if the module loads after DOMContentLoaded, the onclick handlers would fail. However, since the script is `type="module"` and deferred, the buttons exist before the module runs.
- **Minor**: Canvas width is 800px but the CSS doesn't constrain max-width, so on narrow screens it could overflow.
- **Minor**: `updateButtons` queries DOM elements by ID every call (lines 187-202) rather than caching them. This is slightly inefficient but not a real problem.
- **Minor**: AI tower placement strategy tries to place along the path first, which can sometimes fail to find good spots. The fallback brute-force search over all cells handles this.
- **Minor**: Creep send by player targets `players[1]` (AI field), and AI send targets `players[0]` (player field). The creeps appear on the TARGET's field and must be killed by TARGET's towers. This is correct for the genre.
- **Minor**: `localStorage` is used for best score persistence -- good.
- **Potential Issue**: The `W=800` constant means the canvas is wider than the standard 600px most games use. The v2.html sets `width="800"` on the canvas, which is correct. But if the site has a max-width constraint, this game might not fit.

## Verdict: PASS
Excellent tower defense versus game. Deep strategy, competent AI, good visual feedback, proper pathfinding. The wider canvas is a design choice that works well for the dual-field layout.
