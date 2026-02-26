# Audit: Warzone Diplomacy

## Files
- `/Users/joe/dev/openarcade/warzone-diplomacy/game.js` (918 lines)
- `/Users/joe/dev/openarcade/warzone-diplomacy/v2.html` (145 lines)

---

## A) Works? NEEDS_FIX

The game initializes and the engine API is used correctly for callbacks, overlay, state management, and drawing primitives. However, there is a color-parsing bug that affects territory rendering.

### Bug: Short hex colors produce invalid 5-char hex strings

`PLAYER_COLORS` on line 19:
```js
const PLAYER_COLORS = ['#4488ff', '#e55', '#3b3', '#d4d', '#fa0'];
```

Four of five colors are 3-char hex. In `drawTerritory()` (lines 657-661):
```js
const fillHex = color.replace('#', '');    // e.g. 'e55' (3 chars)
const fillColor = '#' + fillHex + '80';    // '#e5580' (5 chars -- INVALID)
renderer.fillPoly(t.polyPoints, fillColor);
```

The engine's `parseColor` only handles 3, 6, or 8-char hex after the `#`. A 5-char string falls through to the default `return [1, 1, 1, 1]` (opaque white). This means territories owned by players 1-4 render as white fill polygons instead of their faction color.

Similarly, the glow outline on line 675:
```js
renderer.strokePoly(t.polyPoints, PLAYER_COLORS[0] + '60', 1);
```
Player 0's color is `'#4488ff'` so `'#4488ff60'` is valid 8-char hex. But if this pattern were applied to other players, it would break the same way. Currently only player 0 uses it, so no additional issue here.

**Fix**: Normalize all `PLAYER_COLORS` to 6-char hex:
```js
const PLAYER_COLORS = ['#4488ff', '#ee5555', '#33bb33', '#dd44dd', '#ffaa00'];
```

### Dead code (non-blocking)

Lines 641-643 in `drawContinentRegions`:
```js
const r = parseInt(base.slice(1, 3), 16);
const g = parseInt(base.slice(3, 5), 16);
const b = parseInt(base.slice(5, 7), 16);
```
These variables are computed but never used. The `fill` on line 643 is constructed by string concatenation, not from these values.

### DOM dependency

Buttons `btnAttack`, `btnReinforce`, `btnSubmit`, `btnUndo` use `onclick` attributes calling global functions (`setMode`, `submitOrders`, `undoOrder`). These are wired up in game.js via `window.setMode = setMode` etc. (lines 849-851). This works but is fragile -- if the module hasn't loaded yet, clicking a button throws. In practice, the overlay blocks interaction until the user clicks, so this is not a real issue.

---

## B) Playable? PASS

Despite the color bug making territory fills white for most players, the game is mechanically playable:

**Controls**: Click-based. Select Attack or Reinforce mode via buttons, then click territories on the canvas. Submit orders to resolve the turn. Undo button removes the last order. Mouse tooltips show territory info on hover.

**Game flow**: Turn-based Risk-like gameplay. Each turn: place reinforcements, plan attacks, submit. Attacks resolve with dice rolls (Risk-style: highest dice compared pair-wise, defender wins ties). AI opponents have distinct personalities (aggressive, defensive, diplomatic, opportunist) that affect their strategies.

**Alliance system**: AI-to-AI and AI-to-player alliances form dynamically. Alliances decay over time (3-5 turns). Betrayal mechanics reduce trust scores and prevent re-alliance for 5 turns. This adds strategic depth.

**Win conditions**: Control 75% of 24 territories (18+), or be the last player standing. Loss on elimination.

**Auto-spend**: Unspent reinforcements are automatically distributed to border territories on submit, preventing the player from wasting them.

**Interaction model**: The canvas click handler properly scales mouse coordinates to canvas coordinates (`mx = (e.clientX - rect.left) * (W / rect.width)`). Territory hit detection uses point-in-polygon with a fallback to nearest-center (within 35px). This is robust.

---

## C) Fun? PASS

The strategic depth is solid for a browser game:

1. **Meaningful decisions**: Choosing where to reinforce and which targets to attack requires reading the board state. Attacking a weak neighbor vs. building up defenses is a real tradeoff.
2. **Diplomacy layer**: Alliances forming and breaking adds unpredictability. The betrayal mechanic (trust erosion, cooldown) creates genuine tension around whether an ally will turn.
3. **Distinct AI personalities**: Aggressive AI attacks often, defensive AI turtles, diplomatic AI forms alliances, opportunist AI stacks one border territory. This creates varied game dynamics.
4. **Information display**: The log panel shows dice rolls, captures, and diplomacy events. The legend shows each player's territory count and personality. Tooltips show territory details. Good situational awareness.
5. **Continent bonuses**: Controlling all territories in a continent gives bonus reinforcements (Risk-style), creating sub-goals.
6. **Session length**: Games run 10-30 turns, which is a good length for the format.

The color bug degrades the visual experience significantly -- it's hard to tell who owns what when most territories render as white -- but the tooltips, legend, and army count circles still convey ownership. Fixing the colors would meaningfully improve the experience.

---

## Verdict

| Check       | Verdict   |
|-------------|-----------|
| A) Works    | NEEDS_FIX |
| B) Playable | PASS      |
| C) Fun      | PASS      |

### Required Fix

**File**: `/Users/joe/dev/openarcade/warzone-diplomacy/game.js`, line 19

Change:
```js
const PLAYER_COLORS = ['#4488ff', '#e55', '#3b3', '#d4d', '#fa0'];
```
To:
```js
const PLAYER_COLORS = ['#4488ff', '#ee5555', '#33bb33', '#dd44dd', '#ffaa00'];
```

This ensures all colors are 6-char hex, so appending `'80'` produces valid 8-char hex that the engine's `parseColor` can handle.
