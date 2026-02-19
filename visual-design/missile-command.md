# Missile Command — Visual & Sound Design

## Current Aesthetic

Dark night sky (#0a0a1a to ground), 80 flickering stars, ICBM trails in red (#f44) with orange for MIRVs (#f80). Counter-missile trails in blue (#48f). Explosions as concentric circles — purple outer, orange mid, white-hot core. Ground strip in dark purple (#2a1a3e). Cities as purple (#c4f) silhouettes with yellow windows. Triangular missile bases also in purple. Particles in matching colors. Clean but fairly basic — the explosion rendering is good, rest is minimal.

## Aesthetic Assessment
**Score: 3/5**

The concentric-circle explosions are genuinely good. The color palette (purple cities against dark sky) has atmosphere. But the city and base designs are very rudimentary, the starfield is too sparse, and ICBM trails have no thickness or glow cascade. The ground is flat and lifeless.

## Visual Redesign Plan

### Background & Environment

Transform the sky into a Cold War-era tactical display. The background is deep navy-to-black with a subtle hexagonal grid overlay (very faint lines, `#ffffff06`) that covers the sky area, as if seen on a military radar screen. Stars are increased to 150 and given three size tiers: tiny (0.5px), small (1px), large (1.5px with 0.2 glow). A slow aurora effect — three wide horizontal gradient bands in dark green/blue/purple — drifts across the upper sky at 0.001 speed per frame.

The ground (#2a1a3e) gets texture: a row of thin horizontal scan lines every 4px in `#3a2a4e`. Add distant city glow — a soft upward light bloom on the horizon, several wide but very faint radial blurs (approximated as stacked large translucent circles) behind each city cluster.

### Color Palette
- Primary: `#c060ff` (defense purple — bases, counter-missiles)
- Secondary: `#ff4040` (threat red — ICBMs)
- Tertiary: `#ff8800` (MIRV orange)
- Background layers: `#030510`, `#080a1e`
- Cities: `#dd88ff` (bright lavender)
- Explosions outer: `#9900ff`
- Explosions mid: `#ff6600`
- Explosions core: `#ffffff`
- Ground: `#1a0d2e`
- Glow/bloom: `#c060ff`, `#ff4040`

### Entity Redesigns

**Cities:** Much more architectural detail. Each city is a cluster of 5-7 buildings of varying widths (4-10px) and heights (10-25px). Windows are small `#ffff88` dots, 2px each, randomly on/off per building using a seeded hash. Buildings have antenna spires (1px vertical line at peak). The whole cluster sits on a 3px base bar. Live cities glow `#dd88ff` at 0.4; destroyed cities become rubble (randomly sized gray rects, no glow). A subtle purple light bloom rises from each live city.

**Missile bases:** Redesign from triangle to a proper silo complex: a wide rectangular bunker base (20px wide, 6px tall), a central dome (filled circle, radius 8), two side cannons (2px × 8px rects angled outward). Selected base pulses with a bright glow ring. Ammo displayed as small vertical bars below the base (each bar = 1 ammo unit).

**ICBMs:** Trails get proper variable width — newest trail segment is 2.5px, oldest is 0.5px, with linear interpolation. The ICBM head is a proper warhead: a 4px tall triangle in #f44 with a tiny white-hot leading edge. MIRVs are slightly larger (#ff8800) with a small "fins" indicator (two 2px lines angling back from the body).

**Counter-missiles:** Blue (#c060ff) with a brighter (#d8a0ff) leading tip. Trail is 2px tapering to 0.5px. A tiny rocket exhaust glow at the tail (small orange circle that fades).

**Explosions:** Already strong. Enhance with: a brief bright white "ignition flash" ring at 0 radius that instantly expands to 15px in 3 frames then fades. Add a shockwave ring — a single thin circle that expands to 1.5x maxRadius then disappears over 10 frames. After explosion collapses, leave a brief smoke puff (5 dark gray particles drifting upward).

### Particle & Effect System

**MIRV split:** At the split point, 12 bright orange sparks radiate in a starburst, fading over 20 frames. A brief bright ring flash.

**City destroyed:** 15-20 particles in purple/white/orange fly from destruction point, arc with gravity, some land on ground. Rubble emits a smoke plume (dark gray circles drifting up) for 2 seconds.

**Base hit:** Ammo-drain visual: small orange sparks and a screen shake effect (offset all draw calls by ±2px for 4 frames, implemented via a shakeX/shakeY offset variable).

**Wave complete:** Score tallying animation — each surviving city "lights up" with a bright pulse in sequence, emitting confetti-like cyan particles upward.

**ICBM destroyed by explosion:** 8-10 bright cyan particles radiate from destruction point. A "BOOM" score popup floats upward (+25) in white with a glow.

### UI Polish

- Wave indicator styled as a military "WAVE" badge (bordered rect with stencil-style text).
- Crosshair redesigned: four L-shaped corner brackets instead of simple lines, with a tiny center dot. Rotates 45° during rapid clicking.
- Ammo count as a vertical stack of small rect "shells" rather than a number — depleting shells disappear bottom-to-top.
- Cities remaining displayed as tiny building silhouettes at top right (one per city).
- Wave complete banner slides in from top over 15 frames.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Counter-missile launch | OscillatorNode (sawtooth → square) | 440Hz, fast pitch rise to 880Hz | 120ms | Whoosh character. Add BiquadFilterNode (highpass, 800Hz). |
| ICBM approach (loop per missile) | OscillatorNode (sine) | 80Hz base + slight wobble | Loop | Very quiet (0.02), gives low ominous drone. |
| Explosion | White noise (AudioBuffer) + sine | Noise burst, filtered; sine at 120Hz decay | 600ms | Noise with exponential gain decay. Sine fades from 150→30Hz. |
| ICBM destroyed | Sine sweep up | 300→900Hz over 200ms | 200ms | Victory blip. |
| City destroyed | Noise burst lower frequency | Filtered noise (lowpass 300Hz) | 800ms | Heavier, sadder than normal explosion. |
| MIRV split | Three quick sine blips | 660Hz, 880Hz, 1100Hz in 80ms sequence | 240ms | Rapid triple-beep. |
| Wave complete fanfare | Arpeggio sine | G-B-D-G (196,246,293,392Hz), 120ms each | 480ms | Triumphant. Volume 0.25. |
| Base hit / ammo loss | Short square wave beep | 220Hz, 60ms | 60ms | Harsh alarm sound. |
| Crosshair click (fire) | Very short sine tick | 880Hz, 20ms | 20ms | Satisfying click. |
| Low ammo warning | Alternating beeps | 440Hz and 220Hz, 200ms each | Repeating | Plays when a base has ≤3 ammo. |

### Music/Ambience

Tension-building ambient: a very low drone pad (two OscillatorNodes detuned ±3Hz from 55Hz, giving a beating effect) plays continuously at volume 0.03. Each incoming ICBM adds a slight gain to the drone (max 0.06 at 8+ ICBMs on screen). Between waves, the drone fades to near-silence before the next wave indicator triggers a brief swell. No melodic content — pure atmosphere.

## Implementation Priority
- High: Enhanced city buildings with windows, ICBM trail tapering, explosion shockwave ring + smoke, city-destroyed particles
- Medium: MIRV split starburst, counter-missile exhaust glow, base redesign with ammo bars, wave-complete city pulse animation
- Low: Aurora sky bands, screen shake on base hit, crosshair L-bracket redesign, ammo-stack display, low-ammo warning sound
