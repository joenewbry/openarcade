# Puzzle Bobble — Visual & Sound Design

## Current Aesthetic

A 480×560 canvas with a dark `#12122a` background. Bubbles are circles (radius 15) in six colors: red (`#f44`), green (`#4f4`), blue (`#44f`), yellow (`#ff0`), magenta (`#f0f`), orange (`#f80`). A hex-grid layout holds up to 12 columns. A launcher at the bottom aims bubbles using a dot-based aim guide. Pop animations show radial sparkles. Falling detached clusters use basic physics. A dashed red danger line marks the bottom boundary. A "push timer" bar counts down. The game is functionally clear but visually basic — flat-colored circles on a dark void.

## Aesthetic Assessment
**Score: 2/5**

The bubble game skeleton is present, but the bubbles look like colored dots rather than shiny, glass-like orbs. The background is empty darkness. The launcher has no character. Pop effects are minor. The hex grid structure is invisible (no sense of the bubbles being arranged in a honeycomb). This needs significant visual warmth and shine.

## Visual Redesign Plan

### Background & Environment

Create a warm, stained-glass arcade atmosphere. The background transitions from `#080818` at the top to `#12082a` at the bottom — dark but with a hint of deep purple warmth. Add a subtle decorative frame: on both left and right edges, draw vertical ornamental borders (10px wide) with a repeating diamond pattern in `#1a1030` at 40% alpha, suggesting a classic arcade cabinet bezel.

**Hex grid floor:** Even though the grid is implied, make it subtle-visible. For each valid hex cell position, draw a very faint hexagon outline (`#1e1640` at 25% alpha, 0.5px stroke). This ghost grid helps players predict where bubbles will land, adds geometry without competing with the bubbles.

**Overhead lighting:** A soft elliptical radial gradient centered at the top-center — `#3322aa` at 6% alpha at center, fading to transparent by mid-canvas — simulating a colored overhead lamp bathing the bubble field in a cool violet wash.

**Danger zone:** Instead of a dashed red line, render a glowing "laser tripwire" effect: a horizontal gradient line (`#ff2244` at 70% alpha at center, fading to 0 at edges) with a soft bloom (`shadowBlur = 12`) and 4 small bracket marks at ¼, ½, ¾, and full width.

### Color Palette
- Red bubble: `#ff2244`
- Green bubble: `#11ee55`
- Blue bubble: `#2255ff`
- Yellow bubble: `#ffdd00`
- Magenta bubble: `#ee22cc`
- Orange bubble: `#ff8800`
- Background: `#080818`, `#12082a`
- Glow/bloom: per-bubble color at 70% lightness
- Launcher: `#ccddff` (light steel)
- Danger line: `#ff2244`

### Entity Redesigns

**Bubbles — glass orb treatment:** The single most important upgrade. Each bubble gets four rendering layers:
1. **Base fill:** Solid fill in the bubble's color.
2. **Depth gradient:** A radial gradient from the bubble's color (center) to a 40% darker version (edge), simulating light falloff on a sphere.
3. **Primary highlight:** A radial gradient at upper-left (offset 35% of radius), white at 0.6 alpha fading to transparent over 55% of the bubble's area — the main glass shine.
4. **Specular dot:** A tiny filled ellipse (6% of radius, white at 0.85 alpha) at upper-left, the sharp specular reflection.
5. **Rim light:** A thin arc on the lower-right edge, drawn as a partial strokeArc in a lighter version of the bubble color at 0.3 alpha, simulating ambient bounce light.
6. **Shadow:** Beneath each bubble, draw a small dark oval (alpha 0.35, width 1.6×radius, height 0.35×radius, offset 3px down) on the "felt" surface.

**Matching bubbles in cluster:** When same-colored bubbles are adjacent in the hex grid, they share a very faint connecting gradient between their centers (a linear gradient from color A to color A at 0.15 alpha, drawn as a rounded rect connecting the centers) — a subtle "touching" effect.

**Launcher / Dragon:** The plain triangle launcher gets a dragon-head makeover. Draw a stylized dragon face: a rounded triangular body in green (`#225533`) with scale texture (small arc strokes in a darker green grid pattern, 8% alpha). Add two small ellipse eyes with a glint, a mouth with a small orange flame particle effect continuously emitting from the barrel (3 orange particles per frame, lifetime 8 frames, rising and fading — like the dragon is breathing fire in idle). The launcher body rotates smoothly with aim direction.

**Aim guide dots:** Replace plain dots with miniature bubble ghosts — tiny circles in the current bubble's color at decreasing alpha (0.5 → 0.05 over 20 steps), each with a tiny white specular dot at upper-left. The first 3 reflection dots at bounce points pulse in size (±1px over 30 frames).

**Next bubble preview:** The next bubble in the queue renders in a small circular alcove to the right of the launcher (or in the corner) with a label "NEXT" in `#aabbcc` above it, full glass treatment.

### Particle & Effect System

- **Bubble pop:** 3-stage effect. (1) Squish: bubble scales to 1.3× wide, 0.7× tall over 3 frames. (2) Burst: 12–16 particles radiate in the bubble's color (size 4→1px, lifetime 22 frames) plus 4 larger "shard" triangles rotating outward (lifetime 15 frames). (3) Ring: an expanding circle ring in the bubble color (radius 0 → 2.5×radius over 12 frames, alpha 0.7 → 0).
- **Cluster fall (after pop):** Each falling bubble emits a brief trail of 2 ghost circles per frame (smaller radius, bubble color, alpha 0.3→0 over 4 frames) as it falls, giving a satisfying cascade visual.
- **Bubble launch:** On fire, a brief flash at the launcher barrel (white oval, 3 frames). The launched bubble leaves a fading trail for the first 8 frames of flight (3 ghost circles at prior positions, decreasing alpha).
- **Push timer (low):** When the timer is under 25%, the push bar pulses red, and the hex grid rows shift downward slightly (1px sine oscillation at 2 Hz) — a subtle "pressure" animation.
- **New row pushed:** When a new row is added, each bubble in the new row bounces in (scale 0 → 1.2 → 1.0 over 12 frames, staggered 2 frames per bubble from left).

### UI Polish

- **Push timer bar:** Replace the plain rectangle with a thick rounded-rect bar. Fill it with a gradient that shifts from green → yellow → red as it depletes. Add tick marks at 25%, 50%, 75%. At under 20%, the bar shakes (±1px horizontal oscillation). A glow behind the bar in the current fill color at 30% alpha.
- **Pop counter / combo:** When 4+ bubbles pop at once, display a large "GREAT!" or "AMAZING!" label at center screen in a bright color, with a brief scale-up bounce animation (0.3 → 1.1 → 1.0 over 15 frames).
- **Remaining bubbles counter:** Show the count of remaining shooter bubbles in a small pill-shaped widget at bottom right, styled to match the launcher's steel aesthetic.
- **Level transition:** Between levels, all bubbles that remain fly off in random directions (each with a randomized velocity vector), and new bubbles rain down from the top in an animated drop-in.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Bubble launch | OscNode (sine) short pop | 520 Hz, fast attack, fast decay | 60 ms | Light plop |
| Bubble bounce (wall) | OscNode (triangle) | 380 Hz | 50 ms | Rubbery rebound |
| Bubble attach (grid) | OscNode (sine) dull | 280 Hz + 0.2 noise | 80 ms | Soft settle |
| Pop (1 bubble) | OscNode (sine) pop | 750 Hz, fast decay | 70 ms | Bright glass pop |
| Pop (small cluster 2–3) | Two pops staggered | 750 + 880 Hz, 20ms apart | 120 ms | Double bright |
| Pop (large cluster 4+) | Chord pop + reverb | 750 + 880 + 1047 Hz | 200 ms | Satisfying shatter |
| Cluster fall | OscNode (triangle) descend | 440→220 Hz over fall duration | 300 ms | Cascade whoosh |
| Row push | OscNode (square) low | 120 Hz, short ramp up | 150 ms | Mechanical push |
| Danger line hit | OscNode (sine) alarm | 440 Hz alternating 480 Hz at 4 Hz | 200 ms | Warning pulse |
| Level clear | Ascending arpeggio | 523, 659, 784, 1047 Hz | 400 ms | Victory |
| Game over | Descending minor | 440, 392, 330, 262 Hz | 500 ms | Defeat |

### Music/Ambience

A playful, carnival-tinged background loop. Synthesize a simple waltz rhythm at 160 BPM (3/4 time): a deep thud on beat 1 (`110 Hz` sine, 100ms, 0.06 vol) and lighter taps on beats 2 and 3 (filtered noise, 800Hz bandpass, 40ms, 0.03 vol). Over this, a glockenspiel-imitating melody: random notes from a C major pentatonic scale (`523, 659, 784, 1047, 1318 Hz`) played as short sine tones (80ms each, 0.04 vol) in a 4-bar looping pattern, with slight randomness in timing (±20ms). As the push timer depletes below 50%, add a rising tension: layer a slow `220 Hz` string-like (sawtooth through lowpass at 300 Hz, 0.04 vol) drone that rises to `440 Hz` as the timer approaches zero, then abruptly cuts when the row pushes.

## Implementation Priority
- High: Glass orb bubble shading (all 5 layers), bubble pop burst and ring effect, launcher flame idle particles
- Medium: Hex ghost grid, bubble launch trail, cluster fall ghost trail, push timer gradient bar
- Low: Dragon-face launcher artwork, level-transition ball flyout, carnival music loop, aim-guide bubble ghost dots
