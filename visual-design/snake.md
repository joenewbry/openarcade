# Snake — Visual & Sound Design

## Current Aesthetic

A 400x400 grid with dark blue `#16213e` grid lines on a near-black background. The snake segments are drawn as solid rectangles in a cyan-green gradient (bright head, darker tail). Food is a red circle with a red glow. No particle effects, no animation, no background texture.

## Aesthetic Assessment
**Score: 2/5**

The glow on the head and food is a good start, but the segments are flat rectangles with no shape, the background is a featureless void, and there is no juice whatsoever — no eating animation, no death effect, no trail life.

## Visual Redesign Plan

### Background & Environment

Replace the static grid with a deep dark background featuring a subtle hexagonal dot grid that pulses very faintly. Add a slight vignette darkening the corners. The grid lines should be nearly invisible — just enough to orient the player without competing with the snake. Occasional ambient floating particles (slow-drifting specks of `#0ff` at ~3% opacity) give the void a living feel.

### Color Palette
- Primary: `#00ffcc` (snake head, bright teal)
- Secondary: `#00aa88` (snake body mid)
- Background: `#040d12`, `#060f18`
- Grid lines: `#0a2030` (near-invisible)
- Food: `#ff2244`
- Glow/bloom: `#00ffcc`, `#ff2244`
- Score accent: `#ffdd00`

### Entity Redesigns

**Snake head:** Rounded rectangle with two bright eye dots on the leading face. A subtle inner highlight line runs along the top edge. Emits a strong cyan glow.

**Snake body segments:** Slightly rounded rectangles with a gradient from bright teal at the neck to deep teal-green near the tail. Each segment shrinks by ~1px relative to its predecessor to create a natural tapering. Segments near the tail are semi-transparent.

**Food:** Replace the plain red circle with a glowing pulsing orb: an inner bright core (`#ff4466`) surrounded by a soft outer halo that breathes in/out at ~1Hz. When eaten, the food explodes into 8-12 tiny particles that scatter and fade.

**Trail effect:** When moving, leave very faint ghost copies of the last 2 positions at low alpha, creating a motion-blur feel.

### Particle & Effect System

- **Eat event:** 10 particles in `#ff4466` and `#ffdd00`, short life (~20 frames), radial burst from food position. Play a tone synth.
- **Death event:** 20 particles in the snake's teal color, longer life (~45 frames), scatter from head position with downward drift. Screen flashes dark red briefly.
- **Score milestone (every 5 points):** Brief screen-edge glow pulse in `#ffdd00`.
- **Ambient:** 15-20 slow-drifting background particles at very low alpha.

### UI Polish

- Score counter rendered with a glowing teal monospace aesthetic, not plain text.
- Speed increase feedback: a small velocity indicator line near the score that grows as the snake accelerates.
- Level-up flash when interval decreases.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Eat food | Sine wave + quick pitch sweep up | 440 Hz → 880 Hz | 80ms | Short satisfying pop; slight reverb tail |
| Turn direction | Soft click (noise burst) | Bandpass noise, Q=20, 2000 Hz center | 15ms | Subtle tactile feedback |
| Death | Descending tone + noise burst | 300 Hz → 80 Hz sawtooth + white noise | 600ms | Low boom, fade out |
| Speed increase | Short ascending chirp | 600 Hz → 1200 Hz triangle | 50ms | Plays every 5 score increments |
| Game start | Rising arpeggio | 220, 330, 440, 660 Hz sine | 400ms total | Brief fanfare |
| Milestone (×5) | Bell-like tone | Sine 880 Hz, fast attack, long decay | 300ms | Soft chime |

### Music/Ambience

A generative ambient drone: two sine waves at 55 Hz and 82.5 Hz (perfect fifth) at very low volume (~5%), slowly modulated with an LFO at 0.07 Hz. As the snake grows longer, add a third overtone at 110 Hz and increase the LFO rate slightly, building tension organically. No looped music file — pure synthesis.

## Implementation Priority
- High: Food eat particles, death particle burst, food pulse animation
- Medium: Snake body tapering and gradient, rounded segment corners, ambient drone
- Low: Background hex grid, velocity indicator, milestone flash, motion-blur trail
