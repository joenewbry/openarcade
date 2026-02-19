# Tapper — Visual & Sound Design

## Current Aesthetic

Four horizontal bar lanes with distinct neon-colored glow lines (`#f44`, `#f80`, `#0f0`, `#48f`). The bar counter surface is dark brown (`#2a1a08`). Customers are simple colored circles with eyes and rectangular bodies. The bartender is white with an amber apron and hat. Mugs are small rectangles with a handle stub and white foam on top. Dollar sign tips float across bars. A level progress bar sits in the bottom-right corner. The overall look is functional but extremely crude.

## Aesthetic Assessment
**Score: 2/5**

The neon bar glow is the best idea in the current design — it gives each lane personality. But everything rendered is blocky and geometric with no atmosphere. The bar looks like a rectangle, the bartender looks like a stick figure, the customers are barely recognizable. There's no sense of a loud, chaotic bar environment.

## Visual Redesign Plan

### Background & Environment

The background should evoke a retro 1980s neon bar atmosphere. Dark charcoal background (`#111116`) with a subtle brick wall texture: draw a grid of thin lines forming brick-sized rectangles, very dark gray on black, barely visible at 8% opacity. A neon "OPEN" sign effect in the top-right corner: draw the word with a thick colored glow using setGlow.

Each bar lane should have a wooden counter top rendered with grain detail — thin horizontal lines of alternating light/dark browns across the bar surface rectangle. The bar front face (below counter surface) should have a scalloped trim pattern (series of small arc segments).

Add hanging pendant lights above each bar — small trapezoid shapes with a bright circle below them, casting a cone-shaped glow pool onto the bar surface. The glow pools animate with a very slow flicker (0.95-1.0 multiply factor oscillating at 2 Hz).

At the right side, replace the plain door rectangle with an actual swinging door silhouette — two panels with a porthole window circle (white circle with concentric rings). Customers push through from behind the door.

### Color Palette
- Primary: `#da4` (amber/gold — bartender theme)
- Secondary: `#f44`, `#f80`, `#0f0`, `#48f` (bar lane neons)
- Background: `#111116`, `#1a1208`
- Glow/bloom: `#da4`, `#0f8` (tips), lane colors for each bar

### Entity Redesigns

**Bartender:** A significantly more detailed sprite. Hat with brim (two rectangles). Face circle with proper eyes and a small smile curve (three line segments). White dress shirt with visible button line. Amber apron with two pocket squares. Arms visible: at rest they hang at sides; during serve animation the right arm extends forward with a hand shape (small pentagon). Feet visible at bottom as two small rectangles.

**Customers:** Each customer should have a distinct silhouette. Three customer archetypes with different hat styles: a fedora (flat rectangle with curved brim), a baseball cap (semicircle with brim), and a top hat (tall rectangle). Bodies use the bright CUST_COLORS palette. Give customers a sway animation while waiting (gentle left-right oscillation of ±2 pixels at 1.5 Hz). While drinking, animate them tilting back (head circle moves up and rotates slightly). Angry exclamation mark should be drawn as a bold "!" with a shadow and slight animation bounce.

**Beer Mugs:** Make them look like actual beer mugs. The body should be slightly narrower at the bottom (trapezoid). The handle should be a proper C-shape: two horizontal lines connected by a curve (approximated by a small arc polygon). The foam should overflow — a white irregular blob shape sitting above the mug rim. The beer inside should be amber-yellow with a semi-transparent darker layer at the bottom for depth. Full mugs glow amber; empty mugs are a dull gray-brown.

**Tap Handles:** The tap at the left should be a proper beer tap shape — a vertical post with a large lever handle (T-shape) at the top. Give it a glossy metallic look with a highlight strip.

### Particle & Effect System

- **Serve drink:** Amber liquid splash burst at the point the mug appears — 4-6 droplet particles
- **Customer served:** Small burst of green star/plus shapes rising upward above the customer
- **Life lost (drink falls off end):** Mug shatters — 8 glass shard particles (bright white thin triangles) plus amber droplets
- **Tip collected:** Bright gold coin spin animation (alternating wide/narrow ellipses for spin effect), then flies toward bartender
- **Level complete:** Confetti burst — 20 small colored rectangles raining down from top
- **Customer leaves happy:** Small heart shapes drift upward from departing customer

### UI Polish

- Bar indicators (left arrows): Replace with glowing fist icons or bartender heads pointing to active lane
- Progress bar: Style as a beer glass filling up with amber liquid — the fill is the progress, with foam at the fill level
- Level flash overlay: Instead of plain dark overlay with text, add a spotlight effect (bright circle in center expanding) with the level number in huge neon letters
- Lives indicator: Draw as three beer mugs (full = life remaining, broken = lost)

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Mug slide start | Low scrape | Sawtooth 150 Hz, fast decay | 60ms | Ceramic on wood |
| Mug hit customer | Dull thud | Sine 200 Hz, short | 80ms | Soft catch |
| Customer drinks | Gulp sequence | Sine 330 Hz blip × 3 | 300ms | Staggered 60ms apart |
| Customer happy (served) | Bright chime | Sine 880+1320 Hz | 200ms | Positive feedback |
| Life lost (mug falls) | Glass shatter | Noise burst highpass 3kHz | 300ms | Crash |
| Empty mug return | Slide scrape | Sawtooth 120 Hz, reverse envelope | 80ms | Softer than serve |
| Tip collected | Coin clink | Sine 1200 Hz, sharp attack | 100ms | Metallic ring |
| Customer angry (!) | Low growl | Sawtooth 80 Hz, brief | 150ms | Dissatisfied rumble |
| Level complete | Fanfare | Ascending arpeggio 261, 329, 392, 523, 659 Hz | 500ms | Major scale run |
| Game over | Sad trombone | Sine descend 440, 415, 392, 349 Hz | 800ms | Wah-wah fall |
| Bartender move | Footstep | Noise 200 Hz, lowpass, 40ms | 40ms | Soft shuffle |

### Music/Ambience

A looping bar ambience: chatter noise (bandpass filtered noise at 800 Hz, gain 0.06), a subtle jazz bass line (triangle wave arpeggating I-IV-V-I in A minor at ~1 bar per 4 seconds, gain 0.05). The tempo should speed up subtly as level increases, creating urgency. Higher levels add a faster hi-hat sound (noise bursts at 0.25s intervals, gain 0.03).

## Implementation Priority
- High: Beer mug with proper trapezoid body and C-handle, customer sway animation, wooden bar grain texture
- Medium: Pendant lights with glow pools, bartender arm extension on serve, tip coin spin animation
- Low: Brick wall background, confetti burst on level complete, jazz ambience loop, swinging door sprite
