# Factory Co-op -- Audit

## Files
- `/Users/joe/dev/openarcade/factory-coop/game.js` (894 lines)
- `/Users/joe/dev/openarcade/factory-coop/v2.html` (82 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called
- `buildFactory()` called before `game.start()` to set up the layout

DOM structure:
- `canvas#game` 600x400
- Standard overlay elements
- `#score`, `#timer` present

Click events use `pendingClicks` queue. Canvas click only used for start/restart; all in-game interaction is keyboard-based (WASD/Space/E).

Timer uses frame counting (every 60 frames = 1 second) rather than `dt`-based timing. This is acceptable for a fixed-step game loop but means the timer runs slightly fast/slow if frame rate varies.

## B) Playable?

**PASS**

Controls:
- **WASD** or **Arrow keys**: Move player
- **Space**: Grab/drop items at bins, machines, or output
- **E**: Alternative interact (same as Space essentially)

Game flow:
- Factory floor with 4 raw material bins (Red, Blue, Green, Yellow)
- 3 machine types: Paint, Cut, Assemble (2 of each)
- Orders appear with countdown timers requiring specific products
- Recipe example: Red Widget = raw_red -> Paint -> painted_red -> Cut -> cut_red -> Assemble -> red_widget
- Deliver completed product to Output zone
- AI companion independently picks up orders and fulfills them
- 3-minute timer

The AI ally is well-implemented:
- Claims uncompleted orders
- Navigates to bins, machines, and output
- Avoids collision with player (dodges perpendicular to path)
- Handles machine processing waits

Collision system uses corner-checking against tile grid. Machines block movement. Conveyors are walkable but decorative (no conveyor movement physics).

## C) Fun?

**NEEDS_FIX**

The concept is great (Overcooked-style cooperative factory) but has issues:

1. **Space and E do the same thing**: `grabDrop` and `interact` are nearly identical functions. The overlay says "SPACE grab/drop | E interact" but they behave the same. This is confusing.
2. **No visual feedback on what you're carrying**: The held item shows as a tiny circle (8px radius) above the player with a 7px label. Very hard to read at 600x400.
3. **Order panel overlaps gameplay**: The orders panel renders over the left side of the factory (0-130px), covering the material bins where you need to interact.
4. **Difficulty scaling is aggressive**: Orders get more complex and spawn faster. By minute 2, multiple orders expire before you can fulfill them, which feels frustrating.
5. **AI sometimes gets stuck**: If the machine it wants is processing, it waits indefinitely at that machine rather than finding an alternative or working on a different order.

The core Overcooked loop works though: grab materials, process through machines in order, deliver. The AI helper genuinely assists.

## Verdict: PASS

The game works and is playable. The cooperative factory concept is engaging. The AI companion actually helps. Issues with UI readability (tiny items, overlapping panels) and control confusion (Space vs E) reduce the experience but nothing is broken. The order overlap with the bin area is the most impactful UX issue.
