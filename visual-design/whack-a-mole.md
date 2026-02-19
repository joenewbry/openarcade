# Whack-a-Mole — Visual & Sound Design

## Current Aesthetic

A 3x3 grid of dirt mounds on a dark green canvas (`#1a2a1e`). Moles pop from elliptical holes rendered with clip-simulation. Three mole types: normal (brown `#8B6914`), golden (`#ffd700`), and bomb (red `#c03030`). HUD shows a color-coded timer bar (warm → orange → red) and heart icons. Particle effects on hit: star bursts for golden, red sparks for bomb, amber stars for normal. A "WHACK!" floating text labels each hit. Miss clicks draw a red X.

## Aesthetic Assessment
**Score: 2/5**

The greens are muddy, the moles are flat blobs, and nothing feels tactile or delightful. The star bursts are barely visible. The whole scene reads as grey-green mud with orange accents — competent but lifeless.

## Visual Redesign Plan

### Background & Environment

Replace the flat dark rectangle with a stylized top-down garden scene. The ground should feel lush and layered: a rich grass base with subtle hand-painted texture squares (lighter/darker greens drawn as a tile grid). Add ambient light bloom in the center of the field as if a single overhead lamp illuminates the game board. Between holes, draw tiny tufts of grass (short V-strokes in varying greens) and scattered pebbles (tiny filled circles in stone grey). The background border should be slightly darker, like soil at the edges.

Draw a thin wooden-plank visual frame around the grid border — planks rendered as filled rects with light/dark stripe alternation and subtle nail-dot circles at corners.

### Color Palette
- Primary: `#5ecf2e`
- Secondary: `#3a8c1a`
- Background: `#1f3d0e`, `#2a4f14`
- Glow/bloom: `#aaff44`, `#ffd700`
- Dirt/holes: `#3d1f08`, `#5a2e0c`
- Plank frame: `#7a4f1e`, `#5c3610`

### Entity Redesigns

**Holes:** The elliptical holes should have a strong 3D depth cue. Draw a dark inner ellipse (`#0a0a0a`) with a radial gradient illusion using 3-4 concentric ellipses fading darker toward center. Add a dirt-rim highlight arc on the upper lip in warm tan. A second outer ring of darker soil completes the illusion of depth.

**Normal Mole:** Rounder and more characterful. Warm brown body (`#a07428`) with a distinctly lighter cream belly. Add visible ears — two small filled semicircles atop the head. Round black eyes with white specular dot. Wide pink-tan snout (larger ellipse). Short stubby paws visible at hole edge.

**Golden Mole:** Gleaming metallic gold. The body should pulse with a subtle shimmer: 3 orbiting sparkle stars rotate around it (already exists, enhance size and brightness). Add a glowing crown shape on top using 3 small spikes. Strong gold glow bloom.

**Bomb Mole:** Matte charcoal body (`#2a2a2a`) with a red-lit underbelly suggesting internal heat. Eyebrows furrow at sharp angles. The fuse is improved: a curled zigzag line (more segments) ending in a bright orange-white spark with a halo bloom. Eyes glow red with fill `#ff2200`. On explosion: massive red-orange burst with screen shake.

**Whacked state:** Eyes become X marks with exaggerated cartoon sadness. Body slightly squishes horizontally. Brief white flash on impact frame.

### Particle & Effect System

**Normal whack:** 8 amber star particles explode outward with strong initial velocity decaying over 30 frames. "WHACK!" text in bold warm gold rises and fades.

**Golden whack:** 16 gold star particles plus 6 white sparkle dots in expanding ring. "+50!" text pulses large then shrinks-fades. Screen brightens slightly for 3 frames (simulate flash via bright overlay polygon).

**Bomb hit:** 12 fire particles (orange/red/yellow) burst outward with slight upward bias. "OUCH! -20" in red pulses. Screen shakes (already implemented). A ring shockwave: expanding circle stroke fades out.

**Miss effect:** Replace plain red X with a small ripple: two concentric circle strokes expand and fade. Color shifts from white to red.

### UI Polish

**Timer bar:** Rounded caps, inner glow matching bar color. Add a small clock icon (circle + two line hands) at the left end. At <10s remaining, the bar pulses in opacity.

**Lives (hearts):** Increase heart visual size. Animate a small beat-pulse on each heart. When a life is lost, the heart cracks and fades.

**Score text:** Displayed in chunky outlined font style (simulate with double-draw: dark offset text then bright top layer). Score increase: briefly scale up 1.2x and back.

**Overlay:** Dark translucent panel behind title text. Title "WHACK-A-MOLE" in large warm gold with drop shadow (draw twice, offset 2px dark then normal). Subtitle in lighter warm white.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Normal mole pop-up | OscillatorNode sawtooth → lowpass filter sweep | 150→400 Hz over 80ms | 120ms | Quick "bwop" tone |
| Normal whack | OscillatorNode square + white noise burst | 220 Hz square, noise filtered at 800 Hz | 80ms | Satisfying thud+crunch |
| Golden whack | Triangle wave chord (C5+E5+G5) + shimmer noise | 523+659+784 Hz, simultaneous | 300ms | Bright celebratory chord fading |
| Bomb mole appear | Low rumble: OscillatorNode sawtooth 80 Hz + distortion | 80 Hz, gain ramp up | 200ms | Ominous growl |
| Bomb whack | White noise burst + low thud sine 60 Hz | Noise 0→1→0 gain over 150ms | 200ms | Explosion impact |
| Miss click | Short sine blip descending | 600→200 Hz glide over 80ms | 100ms | Negative feedback "doop" |
| Game start | Ascending arpeggio C3-E3-G3-C4 | 131→165→196→262 Hz, 80ms each | 320ms | Cheerful fanfare |
| Timer low (<10s) | Metronome tick: short sine 880 Hz | Each second, 40ms duration | 40ms | Urgency pulse |
| Game over | Descending minor arpeggio | 392→330→262→196 Hz, 120ms each | 480ms | Sad resolution |

### Music/Ambience

A looping background track using the Web Audio API: three oscillators forming a gentle major chord (C-E-G) with slow LFO tremolo (0.3 Hz) create a laid-back garden ambience. Detune one oscillator by +7 cents for warmth. Gain is low (~0.08) to not compete with sound effects. A subtle hi-hat pattern (periodic white noise burst, 0.01 gain, every 500ms) adds rhythm without a beat being heavy.

## Implementation Priority
- High: Mole visual overhaul (rounder, ears, better eyes), golden glow bloom, screen shake on bomb, hole depth cues
- Medium: Particle enhancements (more stars, larger), background grass texture tiles, timer bar pulse at low time, sound effects for all events
- Low: Wooden frame border, heart pulse animation, menu overlay styled text, background ambient music loop
