# Minesweeper — Visual & Sound Design

## Current Aesthetic

Dark navy grid (#1e2d4a unrevealed cells, #141e30 revealed, #0f3460 grid lines) with lime-green (#8f0) header text and glow. Numbers colored 1-8 using blue/green/red/purple/teal/pink/gray. Mines render as red filled circles with white center dot. Flags are red unicode symbols. Raised 3D bevel effect on unrevealed cells via highlight/shadow edge rects. Very minimal — functional but cold.

## Aesthetic Assessment
**Score: 2/5**

Competent but sterile. The lime-on-navy palette lacks personality. Bevel effect is subtle to the point of invisibility. Numbers have glow but the overall look is generic "dark mode grid." No environmental storytelling, no character.

## Visual Redesign Plan

### Background & Environment

Replace the flat dark background with a deep-ocean sonar theme. The playing field is a sonar display — the grid sits on a subtly animated hexagonal grid texture (drawn via thin diagonal lines in dark teal). A slow circular "ping" ripple emanates from the center every few seconds, brightening grid lines it passes over momentarily. Add a faint scanline overlay (alternating 1px transparent strips every 2px) for a CRT monitor feel.

Outside the 400px canvas boundary draw soft vignette — corners are darkest, center slightly lighter, as if lit by the monitor glow from behind.

### Color Palette
- Primary: `#00ffe7` (sonar cyan — numbers 1, glow accents)
- Secondary: `#ff3c5a` (danger red — mines, flags)
- Background layers: `#020d1a`, `#041525`
- Unrevealed cell: `#0a2233`
- Revealed cell: `#030e18`
- Glow/bloom: `#00ffe7`, `#ff6a00` (mine explosion glow)
- Grid lines: `#0a3a4a`
- Number 1: `#00ffe7`
- Number 2: `#00ff88`
- Number 3: `#ff3c5a`
- Number 4: `#b060ff`
- Number 5: `#ff6a00`
- Number 6: `#00ddff`
- Number 7: `#ff00cc`
- Number 8: `#aaaaaa`

### Entity Redesigns

**Unrevealed cells:** Slightly raised panel look. Top-left edges are `#0e3348`, bottom-right edges are `#020c18`. Center fill `#0a2233`. On hover, the cell brightens to `#0e3050` with a faint cyan outline glow. Add a tiny specular highlight dot (1x1 px, `#ffffff18`) at top-left corner.

**Revealed cells (empty):** Near-black `#030e18` with a very faint inner border in `#051520` to show the recess. No brightness — these are "scanned clear" zones.

**Revealed cells (numbered):** Numbers rendered larger (16px font for 25px cells), centered, with color-specific bloom glow (setGlow at 0.5 intensity). Each number has a subtle dark background rectangle to prevent bleed.

**Flags:** Replace unicode flag with a custom drawn flag: a vertical pole (2px rect, 8px tall, `#aaaaaa`), a triangular flag (fillPoly, 3-point triangle) in `#ff3c5a` with cyan glow, and a base circle at the bottom. Flag waves slightly — the triangle tip oscillates ±1px using `Math.sin(frameCount * 0.15 + c)` for per-cell phase offset.

**Mines:** On reveal, replace plain circle with a "depth charge" design: outer ring (strokeCircle in `#ff3c5a`, glow 0.8), inner dark circle, 8 spike lines radiating outward (drawn with drawLine). The mine that triggered game-over gets a bright flash ring that expands outward over 20 frames. Correctly flagged mines (win state) render with cyan color instead.

**Header:** Make the timer, mine count, and progress readout feel like cockpit instruments. Add a thin horizontal scan-bar that drifts slowly down the header area. Timer displays in large bold cyan, mine counter in red with the depth-charge icon. Progress bar fills cyan from left to right across the header bottom edge.

### Particle & Effect System

**Cell reveal (flood fill):** Each cell that reveals during flood fill emits 3-4 tiny particles in `#00ffe7` that drift upward and fade over 20 frames. Stagger the particles by cell reveal order for a ripple/cascade feel.

**Mine hit:** Large burst of 20+ orange-red particles from mine center, radius expanding outward. A bright white flash rect covers the canvas for 2 frames. All revealed mines get a pulsing red glow ring that cycles at 0.5Hz.

**Flag plant:** 6 cyan spark particles shoot upward and fade. The flag itself "snaps" into place with a 3-frame scale animation (drawn oversized then normal size).

**Win state:** All cells flash to cyan in sequence (row by row, staggered by 2 frames per row). Score bonus text floats upward from center.

### UI Polish

- Cursor becomes a crosshair when hovering the grid (already done via contextmenu prevention).
- Header separator line gets a periodic bright ping that sweeps left to right.
- Score numbers tick up one digit at a time when incrementing (animate over 10 frames).
- Game-over overlay has a scanline wipe effect — the overlay fades in from top to bottom over 20 frames.
- "MINESWEEPER" title in overlay uses letter-spacing glow, each letter slightly offset in timing.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cell reveal (single) | OscillatorNode (sine) | 880Hz → 1100Hz linear ramp | 60ms | Very short, soft click-pop. Volume 0.12. |
| Flood fill cell | Same as above, pitched by cell index | 600–1200Hz range | 40ms | Stagger by 8ms per cell for cascade sound |
| Flag plant | Two OscillatorNodes (sawtooth + sine) | 440Hz + 880Hz, fast attack | 80ms | Pluck-like chord. Sawtooth immediately filtered low. |
| Flag remove | Reverse of flag plant — pitch falls 880→440 | 80ms | |
| Mine explosion | OscillatorNode (sawtooth) + noise via AudioBuffer | Start 200Hz, exponential decay to 30Hz | 800ms | Layer with white noise burst at full volume decaying. |
| Win fanfare | Three OscillatorNodes, ascending arpeggio | C4-E4-G4-C5 (261, 329, 392, 523Hz) | 600ms total | Each note 150ms, staggered. Sine wave, volume 0.3. |
| Sonar ping (ambient) | Single sine sweep | 1200Hz → 400Hz over 1.5s | Loop every 4s | Very quiet (volume 0.04). Gives the sonar atmosphere. |
| Timer tick (last 10s) | Short percussive sine | 660Hz, 30ms | Every second | Increases urgency |

### Music/Ambience

A looping ambient "sonar room" soundscape: the sonar ping every 4 seconds (sine sweep as above), layered with a very low sub-bass hum (OscillatorNode at 55Hz, volume 0.02, slight vibrato at 0.1Hz). No melody — just atmosphere. The hum intensifies (volume 0.04) during the last 10 seconds of a timed challenge or near game-over.

## Implementation Priority
- High: Flag redesign (waving triangle), mine depth-charge visual, flood-fill particle cascade, mine explosion flash + particle burst
- Medium: Sonar ping ambient sound, header scan-bar animation, reveal sound cascade, hover cell brightening
- Low: Win row-flash animation, score tick-up animation, header letter-spacing glow overlay effect
