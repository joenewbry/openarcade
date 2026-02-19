# Simon — Visual & Sound Design

## Current Aesthetic

400×450 canvas with 4 large rounded-rectangle panels arranged in a 2×2 grid. Colors: Green (top-left, `#44ff44`), Red (top-right, `#ff4444`), Yellow (bottom-left, `#ffff44`), Blue (bottom-right, `#4444ff`). Each panel brightens to a lighter shade when active. A small dark circle in the center hosts the score/level text. A `SIMON` title is displayed. The game already uses Web Audio API for sine tone playback (E4, C4, A3, E3) and a sawtooth buzz on wrong input. The overall look is clean but flat — the panels look like colored rectangles rather than glowing buttons.

## Aesthetic Assessment
**Score: 3/5**

Simon has a strong concept and the existing implementation is coherent. The rounded panels read clearly as game buttons. The sound system already works. However, the panels are flat-lit with no depth or tactile quality, the center hub is a plain circle, the inactive state is dim without atmosphere, and there's no visual fanfare for milestone sequences or game-over states. It looks like a functional prototype rather than a polished retro-arcade experience.

## Visual Redesign Plan

### Background & Environment

Replace the plain dark background with a **deep space/void aesthetic** — a rich near-black (`#050508`) background with a subtle radial gradient brightening slightly toward the center panel area (where the buttons are). Add a very faint concentric ring pattern in the background (thin circles at 60px, 120px, 180px radius from center), at 3% opacity, suggesting a retro futuristic target or radar dish aesthetic that ties into Simon's circular layout.

The four panels get a realistic **illuminated button** treatment: a subtle inner gradient that suggests physical depth (top half slightly lighter, bottom half slightly darker within the panel), and a bright neon glow (setGlow) matching each panel's color that pulses gently at 0.8Hz even when idle. When activated, the glow intensity triples and the panel floods with light.

### Color Palette
- Green panel: `#00dd44` (active: `#44ff88`)
- Red panel: `#dd2222` (active: `#ff5555`)
- Yellow panel: `#ddbb00` (active: `#ffee44`)
- Blue panel: `#2244dd` (active: `#4488ff`)
- Background: `#050508`
- Center hub: `#111118`
- Text: `#ffffff`
- Glow/bloom: panel color per button

### Entity Redesigns

**Panel buttons:** Add physical depth to each panel. Draw the rounded rect with a lighter 2px inner border along the top and left edges (highlight edge) and a darker 1px border along the bottom and right edges (shadow edge), creating a subtle 3D press illusion. The panel center gets a very subtle radial gradient — lighter in the center, fading to the base color at edges — suggesting a dome/convex button surface. Add a tiny specular glint dot in the upper-left of each panel (small white ellipse at ~15% opacity) to suggest a physical reflective button material.

When a panel is **active/pressed**: invert the highlight/shadow edges (now bottom/right is lighter, top/left is darker) to simulate pressing in. The panel floods with its bright active color, the glow triples, and a white flash circle briefly pulses from the center of the panel outward.

**Center hub:** Redesign from a plain circle into a proper retro-electronic control unit. Draw a larger dark circle with a subtle metallic rim (a lighter grey ring stroke). Inside, display a small `SIMON` logo text in the panel glow color. Below it, the score in a digital-readout monospace font. Below that, a small level indicator (dots or dashes). The hub has a subtle inner glow halo.

**Panel dividers:** The gaps between panels (the cross-shaped area in the center) get a dark chrome treatment — very dark, slightly reflective. Draw thin neon lines along the divider edges in a dark near-black with faint color bleeds from adjacent panels.

**Score/level display:** In the center hub, the current level number is displayed with a leading zero (01, 02, etc.) in a large LCD-style digit font — monospace with slightly separated segments. When the level increases, the digits flip/count up with a brief animation (rapid cycling of numbers).

### Particle & Effect System

- **Correct sequence:** Each correct panel press emits a brief ring ripple (expanding circle outline) from the panel center, in the panel's color.
- **Sequence complete (all panels shown):** Brief white flash across all 4 panels simultaneously, then each panel pulses its glow in sequence (green, red, yellow, blue) — a victory shimmer lasting 0.5s.
- **New high-level milestone (every 5 levels):** Confetti-style particle burst from the center hub — 12 small squares in the 4 panel colors shoot outward radially and fade.
- **Wrong button:** All 4 panels flash red briefly. The center hub shakes (position jitter ±4px for 20 frames). A dark crack-like overlay briefly appears across the panel that was pressed.
- **Game over:** All panels slowly dim over 30 frames. The center hub displays "GAME OVER" replacing the score. A descending particle spiral — 8 colored dots spiral inward toward the center and vanish.
- **Simon sequence showing:** Each active panel emits a soft halo pulse outward (a larger transparent circle expanding from the panel) synchronized with the audio tone, visualizing the sound shape.
- **Idle state:** All panels pulse their glow very gently (0.8Hz sine on the glow intensity, amplitude ±10%) — the game breathes while waiting.

### UI Polish

- Title: "SIMON" in large text at the top in a neon white with a faint color cycle glow (hue slowly rotating through the 4 panel colors over 4 seconds). Draw it with a mild drop shadow for depth.
- Level display: "LEVEL" label in small dim text above the number in the hub, with the number itself prominent.
- Best score: Small "BEST: XX" text below the hub in dim amber color.
- Start/restart prompt: During idle state, "TAP TO PLAY" text below the hub, blinking on a 1Hz cycle in dim white.
- Speed indicator: A small row of 4 dots below the score (like a progress bar) that fills in as speed increases with each milestone.

## Sound Design Plan
*(Web Audio API only)*

The game already has Web Audio API implemented (sine tones for the 4 buttons, sawtooth buzz for failure). The redesign enhances these existing sounds and adds missing effects.

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Green button | OscillatorNode, sine | 329.63 Hz (E4) | 0.4s | Existing — keep |
| Red button | OscillatorNode, sine | 261.63 Hz (C4) | 0.4s | Existing — keep |
| Yellow button | OscillatorNode, sine | 220 Hz (A3) | 0.4s | Existing — keep |
| Blue button | OscillatorNode, sine | 164.81 Hz (E3) | 0.4s | Existing — keep |
| Wrong input | OscillatorNode, sawtooth | 80 Hz, 1.0s | 1.0s | Existing — enhance: add 40 Hz sub-bass layer |
| Correct press | OscillatorNode, sine | Panel freq, soft envelope | 0.4s | Add subtle reverb (delay node) |
| Sequence complete | Chord: all 4 frequencies | 329+261+220+164 Hz simultaneous | 0.5s | Victory harmonic |
| Level milestone (5,10,15...) | Ascending arpeggio | 329→392→494→659 Hz, 80ms each | 0.4s | Celebration sting |
| Game over | OscillatorNode, sawtooth | 200→80 Hz descend + noise burst | 0.6s | Defeat |
| New game start | OscillatorNode, sine | 4-note ascending scale E4→G4→B4→E5 | 0.4s | Intro jingle |
| Idle ambient | OscillatorNode, sine | 80 Hz very low gain 0.01 | Loop | Sub-bass presence |
| High speed mode | Add tremolo to button tones | LFO 12 Hz on gain | — | Above level 10 |

### Music/Ambience

Simon's core experience IS the sound, so music is minimal to avoid interference. A very low sub-bass drone (sine oscillator, 55 Hz, gain 0.01) plays continuously as a presence tone — felt more than heard. Between sequences (during the "waiting for input" phase), a subtle high-frequency shimmer plays: a triangle oscillator at 4kHz, gain 0.005, with a slow amplitude wobble at 0.2Hz — barely perceptible, adding electronic ambience. When the speed increases (above level 10), this shimmer gains a second oscillator at 4.4kHz (a slight dissonance) to add tension. At level 15+, a third 4.8kHz layer is added. All ambient tones mute instantly on wrong press, resume after 1 second.

## Implementation Priority
- High: Panel physical depth with highlight/shadow edges and dome gradient; active panel press-in illusion with inverted edges; glow pulse on idle (breathing panels); ring ripple on correct press; wrong-press all-panels red flash + hub shake
- Medium: Center hub metallic rim and LCD digit score display; white flash on sequence complete; particle burst on level milestones; SIMON title color-cycle glow; game-over spiral particle animation
- Low: Confetti panel-color particles on milestone; background concentric ring pattern; speed indicator dot row; sub-bass ambient drone layer; high-speed shimmer dissonance layers
