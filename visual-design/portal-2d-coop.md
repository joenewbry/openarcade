# Portal 2D Co-op — Visual & Sound Design

## Current Aesthetic

A 600×400 tile-based platformer with a dark `#0a0a1a` background and a faint grey grid overlay. Player 1 (You) is a cyan-blue circle (`#4af`) and Player 2 (ATLAS) is an orange circle (`#fa4`). Portals are colored ellipses with a pulsing ring. The companion cube is grey with a pink heart. Buttons are red/green circles. Doors use hazard stripes with a colored light indicator. Exit rooms show green chevrons. Five test chambers are included. The aesthetic is minimal and placeholder-like despite the clever mechanic implementation.

## Aesthetic Assessment
**Score: 2/5**

The core Portal homage is recognizable but visually underdeveloped. The player characters are featureless circles. The environments are tile grids with no surface detail. Portals have correct colors but lack the iconic swirling aperture feel. The companion cube is rudimentary. There's no sense of depth, materiality, or the sterile Aperture Science laboratory atmosphere.

## Visual Redesign Plan

### Background & Environment

Embrace the Aperture Science aesthetic: clean white tile panels with thin dark grout lines (`#1a1a1a` on `#e8e8e8` panels). But since this is a dark-themed canvas game, invert it: charcoal grey panels (`#1c1c24`) with subtle lighter border lines (`#2a2a36`), simulating modular test chamber wall tiles. Add a faint directional light source from above — a soft elliptical gradient at canvas top creating a `#ffffff` at 4% alpha wash that fades toward the bottom, simulating overhead fluorescent lighting.

The background grid transforms: instead of a plain grey mesh, draw 40×40 px tiles with a 1px lighter border (`#252530`) and occasional subtle panel variation (every 5th tile slightly darker, `#161620`). A very faint scanline overlay (1px horizontal lines every 4px at 3% alpha) gives the display a monitor-through-glass feel, referencing Aperture's observation chambers.

**Floor surfaces:** Draw the floor tile row with a subtle top-edge highlight (1px line at 60% white alpha) and a bottom-edge shadow (1px line at 40% black alpha) to give tile thickness.

### Color Palette
- Primary (P1): `#33aaff` (blue player & portal)
- Primary (P2): `#ff8833` (orange player & portal)
- Secondary: `#ccddee` (white tile highlights, UI text)
- Background: `#0d0d1a`, `#1c1c24`
- Glow/bloom: `#44bbff` (blue portal glow), `#ffaa44` (orange portal glow)
- Companion cube: `#ccccdd` with `#ff6699` heart accent
- Buttons/doors: `#ff3344` (off), `#33ff88` (on)

### Entity Redesigns

**Players:** Replace plain circles with a more humanoid silhouette rendered in canvas 2D: an outer circle for the body, a smaller top circle for the head (offset upward by 0.3× radius), and two tiny arc feet at the bottom. Player 1 uses blue-white gradient fill (bright `#66ccff` at top, `#1166cc` at bottom). Player 2 uses orange-white gradient (bright `#ffcc66` at top, `#cc6600` at bottom). Each player has a helmet visor — a small white ellipse arc at the head. A glow aura (matching portal color, radius 1.4×, alpha 0.25) pulses slowly (±0.08 alpha over 60 frames) around each player to identify their "color" at a glance.

**Portals:** The current ellipse pulsing ring gets a full Aperture-style treatment. Draw the portal as an ellipse (width = 0.5 tile, height = 1.5 tiles) with: (1) a very dark inner fill (`#000010` at 85% alpha) simulating the dimensional hole, (2) a mid ring 4px wide in the portal color at full alpha, (3) an outer glow ring using `shadowBlur=18` in the portal color, (4) 8 small teardrop/flame shapes rotating around the ellipse perimeter at 0.5°/frame — alternating brighter/dimmer to simulate the aperture iris. The entrance-side portal has a slightly more intense glow than the exit side.

**Companion Cube:** Upgrade from a plain grey square. Draw a white-panelled cube face: outer square `#bbbbcc`, inner square `#ccccdd` inset by 4px, four corner triangular fills `#aaaabc`, and the heart in `#ff6699` with a white specular highlight dot. Add a very subtle drop shadow (dark oval, offset 2px down, alpha 0.3) beneath the cube.

**Buttons:** The circular pressure plates become platform-flush circles with a 3px rim in `#666677`, a concave inner face (darker center gradient), and a colored status indicator dot (red/green) at center with a matching glow. When pressed, the button "depresses" — rendered 2px smaller with a brighter center flash.

**Doors:** Upgrade hazard stripes to a proper door panel: dark metal frame (`#333340`) with diagonal amber/black hazard bands at 45° across the door face. A status light bar along the top edge — red or green with a radial glow. When opening, draw the door splitting in half vertically with each half sliding into the wall (animate over 20 frames).

**Exit chevrons:** Replace plain arrows with a pulsing green `#00ff88` doorway: two vertical bars flanking the exit with arcing electricity-like sparks between them (8 short curved lines at random offsets, fading each frame). The chevrons become animated arrows sliding upward in a looping sequence.

### Particle & Effect System

- **Portal entry:** When a player enters a portal, emit 12 particles in the portal's color, radiating outward in a ring, lifetime 15 frames, size 3→1px. A brief white flash ring expands from the portal entry point (radius 0 → 2.5×portal radius over 10 frames, alpha 0.8 → 0).
- **Portal exit:** Same ring flash at the exit portal, offset 3 frames from entry.
- **Button press:** 6 particles in button color (green if activating, red if releasing) burst upward, lifetime 12 frames.
- **Companion cube drop:** On landing, a small dust puff — 8 white-grey particles spread sideways, lifetime 10 frames, size 2px.
- **Player respawn:** Bright flash at spawn point (matching player color), expanding ring, then the player fades in over 8 frames.
- **Co-op sync glow:** When both players stand on buttons simultaneously, a shared gold `#ffd700` aura pulses between them (drawn as a gradient-filled line connecting players, alpha 0.4→0.1→0.4 over 40 frames).

### UI Polish

- **Player labels:** "YOU" and "ATLAS" labels above each player in their respective colors, using a small sans-serif with a 1px dark outline, floating 4px above the player head at 80% alpha.
- **Room indicator:** "CHAMBER X / 5" rendered top-center in `#aabbcc` with a thin underscore line, styled like an Aperture Science monitor readout.
- **Solution indicator:** When a puzzle is solved (door opens), flash "CHAMBER SOLVED" in green with a bright bloom, centered on screen for 90 frames then fading.
- **Portal pairing lines:** Draw a very faint dashed line connecting matching portal pairs (same color) at 8% alpha — barely visible, just hinting at the dimensional link.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Portal open (blue) | OscNode (sine) sweep up + reverb tail | 440→880 Hz, then 880 Hz ring at 0.3 vol | 300 ms | Ascending whoosh feel |
| Portal open (orange) | OscNode (sine) sweep up | 360→720 Hz | 300 ms | Same shape, lower pitch |
| Portal entry | BiquadFilter bandpass noise | White noise at 1.5kHz center, Q=2 | 120 ms | Dimensional whoosh |
| Portal exit | Same bandpass noise reversed | White noise 1.5kHz, reversed envelope | 120 ms | Mirror of entry |
| Player jump | OscNode (triangle) short | 200→280 Hz | 80 ms | Light boing |
| Player land | OscNode (square) + noise | 120 Hz + white noise at 0.3 vol | 60 ms | Thud on panel |
| Button press | OscNode (square) | 440 Hz, hard attack | 100 ms | Mechanical click |
| Button release | OscNode (square) descend | 440→220 Hz | 100 ms | Click down |
| Door open | OscNode (sawtooth) low rumble | 80→60 Hz over 400ms, vol 0.5 | 400 ms | Heavy mechanical |
| Companion cube land | OscNode (triangle) + noise | 180 Hz + 0.4 noise | 150 ms | Heavier thud |
| Puzzle solved | Ascending chord | 523 + 659 + 784 Hz simultaneous, sine | 500 ms | C-E-G major chord |
| Player death | OscNode (sine) descend | 440→55 Hz sweep, vol 0.6 | 400 ms | Portal death womp |

### Music/Ambience

Aperture Science lab ambience: a constant very low hum of ventilation — `55 Hz` sine wave at 0.025 volume through a `BiquadFilter` lowpass at 100 Hz. Layered with an occasional distant mechanical clunk (triangle wave 80 Hz, 200ms, 0.04 vol) every 8–15 seconds at random intervals. Every 30–60 seconds, a distant PA chime — three soft sine tones (880, 1108, 1318 Hz) at 0.03 volume, staggered 150ms apart, simulating the Aperture announcement system without any speech. Creates a sterile, slightly ominous corporate science facility atmosphere.

## Implementation Priority
- High: Portal glow treatment with iris rotation particles, player humanoid silhouette upgrade, portal entry/exit sound whooshes
- Medium: Companion cube panel detail, button press/depress animation, puzzle-solved chord, floor tile depth lines
- Low: Lab ambience hum loop, door split animation, co-op sync gold aura, chamber readout UI
