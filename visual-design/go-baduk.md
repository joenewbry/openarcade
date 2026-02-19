# Go (Baduk) — Visual & Sound Design

## Current Aesthetic
A 600×600 canvas showing a 9×9 Go board. The board is a flat warm yellow-brown (`#d4a843`) rectangle with thin brown grid lines. Star points (hoshi) are small filled circles. Black and white stones are plain filled circles: black stones have a slight white specular highlight circle, white stones have a lighter inner circle and specular. Coordinate labels (A–I, 1–9) appear along the board edges in dark text. A ghost stone appears on hover. A "Pass" button sits below the board. Captures are displayed as a simple count. Territory scoring fills intersections with colored squares. The overall design is clean and readable but utterly without character — it looks like a functional demo, not a premium game.

## Aesthetic Assessment
**Score: 2.5/5**

Go's ancient beauty and strategic depth deserve a much more considered aesthetic. The board is flat and plastic-looking, the stones lack material quality, and there is no environmental context. The game would benefit enormously from a premium wooden board aesthetic with realistic stone appearance, ambient atmosphere, and meditative sound design.

## Visual Redesign Plan

### Background & Environment
A **traditional Japanese study room** ambience. The canvas background (beyond the board) is a deep warm charcoal (`#1a1208`) suggesting lacquered wood or dark stone. A subtle cloth or tatami texture covers this background area: thin diagonal lines (`#221a10` at 10% alpha) spaced 8px apart in both diagonal directions, suggesting woven texture.

Two soft warm light pools (large ellipses, `#fff4cc` at 5% alpha, 250×180px) illuminate from upper-left and lower-right corners, suggesting paper lantern lighting from above.

A thin decorative border wraps the board: a 6px dark-brown (`#3a2008`) outer frame, then a 3px warm `#8a5a20` inner frame, then the board surface — suggesting a traditional go-ban (碁盤) kaya wood board with a thick elevated body.

The board itself upgrades significantly:
- Base color: a rich honey-amber gradient (lighter `#e8b84a` top-left to warmer `#b8882a` bottom-right) suggesting natural wood grain direction.
- Grain lines: 10–14 very subtle curved horizontal lines (`#c8982a` at 15% alpha) flowing across the board, suggesting actual kaya wood grain.
- The board surface has a slight sheen — a large soft white highlight ellipse at 4% alpha in the upper-left third, suggesting a lacquered or polished surface.
- Grid lines: warm dark brown (`#5a3008`) at 1px, crisply drawn.
- Star points (hoshi): filled circles, 5px radius, in the same dark brown as grid lines.

### Color Palette
- Background: `#1a1208`
- Background texture lines: `#221a10`
- Light pool: `#fff4cc`
- Board outer frame: `#3a2008`
- Board inner frame: `#8a5a20`
- Board surface light: `#e8b84a`
- Board surface dark: `#b8882a`
- Wood grain: `#c8982a`
- Board sheen: `#ffffff`
- Grid line: `#5a3008`
- Hoshi: `#5a3008`
- Coordinate text: `#6a4010`
- Black stone base: `#080808`
- Black stone highlight: `#444444`
- Black stone specular: `#aaaaaa`
- White stone base: `#f0f0f0`
- White stone shadow: `#cccccc`
- White stone specular: `#ffffff`
- Ghost stone (black): `rgba(30,30,30,0.4)`
- Ghost stone (white): `rgba(240,240,240,0.4)`
- Territory black marker: `rgba(20,20,20,0.5)`
- Territory white marker: `rgba(220,220,220,0.5)`
- Last move indicator: `#cc3300`
- Capture counter: `#c8982a`

### Entity Redesigns

**Board** — The rendering priority is a convincing kaya wood surface:
1. Draw the board rectangle with a honey-amber fill.
2. Apply 12 subtle curved lines (`strokePoly` of gentle arcs) in `#c8982a` at 12% alpha for wood grain.
3. Overlay a large white radial gradient ellipse at 4% alpha for surface sheen.
4. Draw grid lines at 1px in dark brown.
5. Draw hoshi as 5px filled circles.
6. Frame the board with the dual-border treatment.

**Black stones** — Rendered as polished go-ishi (slate stones):
- Base: a near-black circle (`#080808`).
- The stone has a simulated 3D depth via a small grey highlight arc (`#444444`) on the upper-left edge (a partial circle arc, covering about 100° from 210° to 310°, at 50% alpha) — suggesting reflected light on a convex surface.
- A small bright specular dot (`#aaaaaa`, 3px) sits in the upper-left of the stone, offset slightly from center.
- A very subtle shadow ellipse beneath the stone (slightly offset down-right, dark brown at 30% alpha).
- `setGlow('#000000', 0.2)` — the stone has a faint shadow halo on the board.

**White stones** — Rendered as polished clamshell stones:
- Base: bright off-white fill (`#f0f0f0`).
- A very subtle light-grey inner ring (`#dddddd`) at 85% of the stone radius suggests the stone's natural curvature.
- Highlight arc in pure white (`#ffffff`) on the upper-left edge, more prominent than the black stone's (clamshell reflects more).
- Specular dot (`#ffffff`, bright, 4px) in the upper-left.
- Shadow ellipse beneath (slightly offset, dark grey at 25% alpha).
- `setGlow('#f0f0f0', 0.15)` — a very subtle white glow.

**Ghost stone (hover)** — The hover preview stone renders as a semi-transparent version of the appropriate color stone, with all the same lighting details but at 40% overall alpha. The cursor snaps to the nearest valid intersection.

**Last move indicator** — Instead of no indicator, the most recently placed stone has a small red-orange dot (`#cc3300`, 3px) at its center, persisting until the next move is made.

**Territory markers** — During scoring, intersections fill with translucent colored markers: small filled squares at 50% alpha in each player's color. The border of the marked territory region gets a faint outline to group it visually.

### Particle & Effect System
- **Stone placement**: On placing a stone, a gentle ripple ring expands from the stone center — a `strokeCircle` expanding from 0 to the stone radius + 8px over 12 frames, in the stone's color at 40% → 0% alpha. Simultaneously, 3 very small dust motes (1–2px) scatter from beneath the stone, suggesting physical placement.
- **Stone capture**: Captured stones fade out with a 8-frame dissolve (alpha drops from 100% to 0%, scale from 1.0 to 0.6). A brief colored flash at 15% alpha marks the capture position.
- **Ko threat indicator**: When a ko situation exists, the contested intersection gets a subtle pulsing amber ring (stroke, oscillating between 10% and 30% alpha at 2 Hz).
- **Score territory reveal**: Territory fills animate in zone by zone — each intersection's marker fades in over 3 frames with a 1-frame stagger between adjacent intersections, flowing outward from each player's stones.
- **Pass action**: When a player passes, a faint ripple ring expands from the board center and a brief "PASS" text floats upward from the pass button, fading over 30 frames.

### UI Polish
- Coordinate labels (A–I, 1–9) use a warm brown color matching the board frame — not black — integrating them into the board aesthetic.
- Capture counts display as elegant counters at the board edges with small stone-icon circles.
- The "Pass" button is redesigned as an elegant dark-wood styled button with warm text.
- Turn indicator: a small stone icon (using the stone drawing code) appears next to "Your turn" or "AI thinking…" text, coloring appropriately.
- "AI thinking…" state: the cursor stone on the board gently pulses (alpha 30%→60%→30%, 20-frame cycle) during AI computation.
- Game end: a clean territory overlay fills the board, and the margin of victory text displays in a centered panel with dark-glass styling and warm text — "Black wins by X.5" or "White wins by X.5".

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Stone placement (black) | Low wooden click | 600 Hz sine, fast attack, 80 ms decay | 100 ms | Slate on wood |
| Stone placement (white) | Slightly lighter click | 800 Hz sine, fast attack, 70 ms decay | 90 ms | Clamshell on wood |
| Stone capture | Soft slide + thud | 400 Hz triangle, 150 ms decay | 180 ms | Stones removed |
| Pass | Soft tone | 440 Hz triangle, 200 ms decay | 250 ms | Neutral pass signal |
| AI thinking start | Subtle hum | 120 Hz triangle, very low gain, looped | Looped | Computation indicator |
| AI thinking end | Short resolution | 660 Hz sine, 100 ms | 150 ms | AI move ready |
| Game over (win) | Gentle ascending | C4–E4–G4–C5 triangle arpeggio, 120 ms each | 600 ms | Calm victory |
| Game over (lose) | Gentle descending | C5–A4–F4–C4 triangle arpeggio, 120 ms each | 600 ms | Graceful defeat |
| Ko warning | Two soft tones | 880 Hz → 660 Hz triangle, 80 ms each | 200 ms | Ko conflict signal |
| Territory scoring | Soft progression | Alternating 440/520 Hz clicks, per intersection | Short | Count up sound |

### Music/Ambience
Meditative ambient atmosphere: no driving beat. Instead:
- A solo *shakuhachi* approximation: a triangle wave oscillator (LPF 600 Hz, gentle vibrato via LFO 4 Hz at 0.02 semitone depth) plays long sustained notes from a pentatonic scale (D, F, G, A, C) at slow irregular intervals (every 3–8 seconds), with 1.5 s attack and 3 s decay. Gain: 0.12.
- A background koto suggestion: 2–3 detuned sine oscillators at very low gain (0.03), playing occasional short plucked notes in the same pentatonic scale. Attack instant, decay 800 ms.
- Subtle room ambience: pink noise filtered at LPF 200 Hz, gain 0.01 — a whisper of room presence.
- During AI thinking, the ambient sounds continue unchanged — the turn-wait should feel contemplative, not anxious.
- No percussion or rhythm. The music should feel timeless and unhurried, befitting the game's ancient heritage.

## Implementation Priority
- High: Stone 3D appearance (highlight arc + specular dot + shadow ellipse), wood grain board texture, stone placement ripple animation, stone capture dissolve, all sound events
- Medium: Board frame dual-border treatment, board honey-amber gradient + surface sheen, last move indicator red dot, territory reveal animation flow, ghost stone transparency polish
- Low: Background tatami texture + paper lantern light pools, ko pulsing amber ring, pass ripple animation, AI thinking stone pulse, ambient shakuhachi music, score panel dark-glass styling
