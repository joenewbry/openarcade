# Tron — Visual & Sound Design

## Current Aesthetic

A 500×500 grid with dark blue `#16213e` gridlines. Player trail is a semi-transparent rgba(0,255,136,0.35) green fill, AI trail is rgba(255,136,0,0.35) orange. Heads are bright solid squares with glow. Crash is red. HUD text is dim white. The palette directly echoes the Tron franchise and is visually appropriate. However the trail cells are flat translucent fills with no energy or depth — they feel like colored floor tiles rather than deadly light ribbons.

## Aesthetic Assessment
**Score: 3/5**

The color choices are exactly right. The grid reference is good. What's missing is the signature neon ribbon quality — the trails should feel like luminous energy walls, not tinted squares. The speed and danger of a light cycle game should be felt visually at every moment.

## Visual Redesign Plan

### Background & Environment

Replace the flat `#16213e` grid with a deeply atmospheric grid. Background fill: `#020818` (near-black with blue tint). Grid lines drawn at 0.5px in `#0a1428` — very dark, almost invisible except near the heads.

Add a perspective effect: grid lines are drawn at uniform spacing but with a very subtle intensity gradient — cells closer to the center of the canvas are slightly brighter (add a radial fade using stacked dark fillRect at the edges at 6% opacity). This creates a sense of depth without any actual 3D math.

Every 5 cells draw a brighter major grid line at `#0e1c38` to create a 50px-spaced secondary grid — the "sector" lines of the Grid.

Add a faint ambient flicker: every 180 frames, apply a brief full-screen fillRect `#ffffff04` for 1 frame — the characteristic electrical flicker of Tron displays.

### Color Palette
- Background: `#020818`
- Grid line minor: `#0a1428`
- Grid line major: `#0e1c38`
- Player head: `#00ff88`
- Player trail bright: `#00ff88`
- Player trail mid: `#00cc66`
- Player trail dim: `#004422`
- AI head: `#ff8800`
- AI trail bright: `#ff8800`
- AI trail mid: `#cc6600`
- AI trail dim: `#442200`
- Crash: `#ff2200`
- Glow/bloom: `#00ffaa` (player), `#ffaa00` (AI)

### Entity Redesigns

**Trails** — The light wall effect. Each trail cell is drawn with three layers:
1. Outer glow: fillRect the full cell size in the trail's dim color (3rd quarter of gradient), e.g. `#004422`.
2. Inner bar: a thinner fillRect (2px inset on each side) in the mid color `#00cc66`.
3. Core: a 1px center line using the bright color `#00ff88` — simulated by a 1-2px wide fillRect down the center of the cell in the direction of travel.

This creates a ribbon of light with a bright core and glowing aura — the canonical Tron wall appearance.

The most recently placed trail cells (last 3) are drawn at full brightness. Older cells gradually dim: segment i from the head gets color at brightness = max(0, 1 - i/gridLength) × scale. Implement as a lookup: the last 5 cells draw at 100%, 6–15 cells at 60%, remaining at 30%.

**Heads** — The light cycle head gets upgraded:
- Draw a filled square at the head position in the bright color with a strong glow (0.9).
- Add a small "cycle" body: a 1-cell-long rect in the direction of travel, slightly narrower, acting as the cycle's tail.
- The head has a 1px white core square (2×2px) at its center.
- On the frame the player changes direction, briefly flash the head white (1 frame full white fillRect).

**Crash effect** — Rather than a simple red square:
- On crash, replace the head with an expanding ring of 12 particles shooting outward in all directions. Particles are 2px squares in the crashing player's color fading to red, life 400ms.
- A bright white flash fills the entire canvas for 1 frame.
- The crash location retains a pulsing red X mark (two diagonal lines) that fades over 600ms.
- Screen shake: shakeAmount = 8px, decaying over 300ms.

### Particle & Effect System

Trail particles: As the cycle moves, emit 1–2 tiny particles (1px squares) per frame from the head position. They drift slowly backward (opposite to direction of travel) and fade over 200ms in the cycle's color. Creates a subtle "speed glow" vapor trail.

Turn spark: On each direction change, emit 4 particles outward from the head in the turn directions, bright color, very short life (100ms). A tiny visual punctuation for the turn.

"Round Won" flash: On AI crash, the player's trails all briefly flash to 100% brightness simultaneously for 3 frames, then return to normal — a whole-grid celebration.

### UI Polish

HUD redesign for Tron aesthetic: Replace plain text labels with styled HUD elements:
- "YOU" and "CPU" labels get small colored squares beside them (the cycle colors).
- "Round N" is rendered in a larger monospaced-style font at the center top.
- Round won message "ROUND WON!" uses a large 28px text with the player color, a 0.5s pulse glow (oscillating strength 0.7→1.2→0.7 over 200ms), and then fades.
- A scan-line overlay: draw 30 horizontal lines 1px tall across the entire canvas at every other 16px, each at `#00000014` opacity — classic CRT scan-line effect that costs almost nothing and dramatically enhances the retro feel.

Score display: Styled as a data readout — "SCORE: 000320" with leading zeros, monospace feel, `#00ff88` color with dim glow.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cycle engine (loop) | Sawtooth osc through lowpass, pitch based on speed | 80→120Hz, filter cutoff 400Hz, gain 0.08 | Continuous | Engine hum per player |
| Direction change | Short blip: square osc | 880Hz, gain 0.2→0 | 40ms | Turn click |
| Trail placed (every 4 cells) | Very quiet tick: sine 1200Hz | Gain 0.04→0 | 20ms | Subtle electric crackle |
| AI crash | Distorted explosion: noise through lowpass 300Hz | Gain 0.6→0, fast attack | 400ms | Wall impact |
| Player crash | Same but with descending pitch sweep 400→50Hz added | Gain 0.7→0 | 500ms | Game-over impact |
| Round start (after reset) | Short rising tone: sine 440→660Hz | Gain 0.3→0 | 200ms | New round begin |
| Round won flash | Quick victory sting: three fast sine notes 523→659→784Hz | 80ms each, gain 0.3 | 240ms | Winner moment |
| Game over | Descending tritone: 440→311Hz, slow decay | Both sines simultaneously, gain 0.4→0 | 800ms | Defeat sting |
| Cycle speed up (as score grows) | Engine hum pitch rises | Pitch LFO tied to score/time | — | Dynamic tension |

### Music/Ambience

The signature Tron sound is electronic, pulsing, futuristic. Implement a 4-bar looping ambient sequence using the Web Audio API scheduler pattern:

- Beat 1: kick substitute — short sine 60Hz, 80ms, gain 0.15→0
- Beat 3: snare substitute — noise burst through bandpass 2kHz, 60ms, gain 0.12→0
- Continuous: two oscillators at 110Hz (triangle, gain 0.04) and 165Hz (sine, gain 0.025) with a slow amplitude LFO at 0.25Hz creating a subtle throb.
- Every 2 bars: a high arpeggio note at 880→1047→1318Hz (sine, gain 0.08, 100ms each) — the characteristic Tron musical glint.

BPM: 120. The pattern plays on a 2s loop using setInterval/AudioContext.currentTime scheduling. Volume is low (overall gain 0.15) — atmospheric, not distracting.

As the game progresses (rounds 3+), slowly increase the ambient BPM to 140 by scaling the interval timing. Raises tension naturally.

## Implementation Priority
- High: Three-layer trail rendering (dim/mid/bright), head "cycle body" extension, crash particle burst + screen shake, scan-line overlay
- Medium: Trail cell brightness decay gradient, turn spark particles, trail particle vapor trail, direction change sound, crash sounds
- Low: Major/minor grid distinction, ambient cycling music, radial perspective grid fade, engine hum continuous sound, dynamic BPM scaling
