# Bejeweled — Visual & Sound Design

## Current Aesthetic
An 8x8 grid of colorful gems on a dark navy background (`#1a1a2e`). Seven gem types with distinct shapes (diamond, circle, square, triangle, hexagon, star, pentagon) and bright flat colors (red, green, blue, yellow, magenta, cyan, orange). Each gem has a small white highlight polygon/circle for shine. Selection uses a white glow border. The hint system pulses white. A pink/magenta (`#f8a`) cursor rectangle for keyboard navigation. A thin pink timer bar runs along the bottom. Sparkle particles fly from matched gems. Combo text appears centered in the field. The look is clean and readable but lacks the jewel depth and radiance of the original Bejeweled games.

## Aesthetic Assessment
The color variety and shape distinction are good — gems are easily identifiable. The flat fill colors lack depth (no faceting, no refraction, no inner light). There's no background atmosphere or board feel. The sparkle particles are minimal. The overall impression is a good prototype but not a polished gemstone experience.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Replace the flat dark background with a deep jewel-case aesthetic. The board itself sits inside an ornate frame — an outer border of dark gold (`#8b6914`) with subtle corner decorations (small filled diamonds at each corner). Behind the gems, the board cells alternate in a subtle checkerboard of two near-identical deep purples (`#12102a` and `#150f2e`) — barely visible but adding texture.

Behind the board (outside the grid), a rich dark background with slow parallax stars — not space stars but glittering gem dust: tiny 1-2px white dots that slowly drift and twinkle. A very soft radial glow emanates from the board center, suggesting the gems emit light onto the surroundings.

### Color Palette
- Ruby: `#ff1a1a` (with inner light: `#ff8080`)
- Emerald: `#00e040` (with inner: `#80ff90`)
- Sapphire: `#1a60ff` (with inner: `#80aaff`)
- Topaz: `#ffdd00` (with inner: `#ffee88`)
- Amethyst: `#cc00ff` (with inner: `#ee88ff`)
- Diamond: `#88eeff` (with inner: `#ffffff`)
- Amber: `#ff7700` (with inner: `#ffbb44`)
- Board frame: `#8b6914`
- Background deep: `#0d0b1a`
- Glow/bloom: gem-specific

### Entity Redesigns
**Gem rendering — multi-layer approach:**
Each gem is drawn in three layers:
1. Dark outer shadow (slightly larger polygon/circle, 50% alpha black)
2. Main gem fill (current color)
3. Inner bright facet: a smaller version of the shape at 40% the radius, filled with the lighter inner color, at 70% alpha — suggesting the gem's internal light
4. Specular highlight: a tiny bright white ellipse at upper-left of the gem

**Diamond gems:** Add a second inner diamond rotated 45° to create the classic cut-gem look.
**Star gems:** The star points get a narrow highlight along each upper edge.
**Circle gems (pearls):** Large specular highlight takes up 30% of radius for a pearlescent look.

**Selected gem:** Glows with its own color at full intensity + a white halo ring that slowly expands and fades (repeating), and the gem itself bobs up 3px.

**Hint gems:** Alternate between a warm golden glow and a white glow in a slow 1-second cycle.

**Matched gems:** Before disappearing, flash white and scale up to 120% over 5 frames, then vanish with an outward burst.

### Particle & Effect System
**Match burst:** 12-16 gem-colored particles per gem destroyed. Each particle is a tiny version of the gem shape (or just a bright dot). They arc outward with gravity, with a bright flash at origin. Some particles have a brief sparkle (bright → dim → gone) rather than just fading.

**Chain multiplier effect:** For chains 2x+, a ring of the gem color expands outward from the entire board center at high speed (like a shockwave). The combo text scales in from 150% to 100% with a bounce.

**Board refill:** New gems drop in from the top with a brief squish animation (tall → normal height over 6 frames).

**Timer bar:** When under 10 seconds, the bar pulses red and a subtle screen vignette darkens the edges of the canvas.

### UI Polish
The score display floats in a jeweled panel above the board. Chain multiplier text uses large, jewel-colored text with a drop shadow. The timer bar at the bottom becomes a decorative gem-encrusted bar — the filled portion cycles slowly through gem colors. "RESHUFFLE!" text appears with a dramatic full-board flash. Game over: gems fall away from the board with gravity physics before the overlay appears.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Gem select | Bell tone | 880Hz sine, fast attack, 0.8s decay | 0.3s | Crystal ping |
| Invalid swap | Buzzer | 200Hz sawtooth, short | 0.15s | Negative feedback |
| Match-3 | Chime chord | 523+659+784Hz sines together | 0.4s | C-E-G major chord |
| Match-4 | Higher chord | 659+784+988Hz | 0.5s | Brighter chord |
| Match-5+ | Fanfare | 784+988+1175Hz + glissando upward | 0.8s | Sparkle fanfare |
| Chain x2 | Rising note | Previous chord + 1 octave up | 0.5s | Ascending arpeggio |
| Chain x3+ | Full arpeggio | Rapid 4-note ascending run | 0.6s | Excitement escalation |
| Gem drop | Soft thud | 120Hz sine, fast attack/decay | 0.1s | Gentle land sound |
| Timer warning | Heartbeat | 80Hz sine, double-pulse pattern | repeating | Tension building |
| Game over | Descend | 523→392→294Hz sine, slow | 1.5s | Sad descending triad |
| Reshuffle | Whoosh | White noise sweep 200→2000Hz | 0.4s | Board reshuffle whoosh |

### Music/Ambience
A gentle looping ambient track: soft pad chords built from sine waves. Root chord: `C major` — 130, 164, 196Hz at 0.04 amplitude each. Chord changes every 8 seconds through I-IV-V-I progression (C-F-G-C). The ambience is barely audible, sitting well below gameplay sounds. When a chain multiplier is active, the ambient pitch subtly rises a half-step to create excitement.

## Implementation Priority
- High: Multi-layer gem rendering with facets and specular highlights, match burst particles, chain shockwave ring
- Medium: Board frame with corner decorations, gem select bob animation, selected gem expanding halo ring
- Low: Gem fall squish animation, board gem-dust background particles, timer bar color cycling
