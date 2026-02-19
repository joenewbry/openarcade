# Pong — Visual & Sound Design

## Current Aesthetic

Dark navy background (`#1a1a2e`) with two identical purple-glowing paddles (`#88f`) and a white ball. A dashed center line divides the court. Large dim score digits sit behind the play area. No particle effects, no animations beyond ball and paddle movement.

## Aesthetic Assessment
**Score: 2/5**

Minimal and functional but visually flat. The paddles are identical and textureless. The ball has no trail or sense of speed. The background is a plain fill. The scoring area feels unintegrated.

## Visual Redesign Plan

### Background & Environment

Replace the flat fill with a deep tennis-court-meets-hologram aesthetic. Add two parallel scan lines (subtle horizontal bands sweeping downward at 0.1px/frame) and a faint vignette darkening the four corners. The center dashed line should pulse very gently in opacity (0.4 → 0.7 → 0.4 over ~2 seconds), as if the court is alive. Behind the score digits, render faint oversized halftone dot-grid circles that slowly rotate (one on each side), giving depth without clutter.

### Color Palette
- Primary: `#9988ff` (paddle & ball core)
- Secondary: `#ccbbff` (ball highlight, glow peaks)
- Background: `#08091a`, `#0d0e28`
- Glow/bloom: `#6655ee`
- Accent danger: `#ff4488` (match-point flash)

### Entity Redesigns

**Paddles:** Each paddle gets a gradient—brighter at its center, fading to a darker edge. Add 3–4 tiny horizontal "grip lines" across the face (thin rect fills at 20% alpha). At contact, the paddle briefly flares white (`#fff` at 0.8 glow strength, decaying over 6 frames). Player paddle is blue-violet, CPU paddle is a cooler cyan-violet (`#88ccff`) to distinguish sides clearly.

**Ball:** Replace the white circle with a layered orb: outer glow ring (`#9988ff` at 0.6), solid core (`#fff`), small specular highlight at top-left. The ball leaves a 6-frame motion trail: 6 ghost circles at decreasing radius (×0.9 each) and decreasing alpha (0.5 → 0.05). Trail color interpolates from white to the paddle color of last contact.

**Center line:** Replace plain dashes with diamond shapes (2px × 2px rotated squares) evenly spaced, pulsing in sync.

### Particle & Effect System

- **Paddle hit:** 8 particles burst perpendicular to the ball's new trajectory. Velocity 1.5–3.5 px/frame, lifetime 18 frames, color = paddle glow color, size 2×2.
- **Wall bounce:** 4 smaller particles in ball travel direction, lifetime 12 frames.
- **Score event:** 20-particle explosion at the scoring side's goal. Color = scoring player's paddle color. Particles drift inward from the edge.
- **Match point:** Red-to-orange glow pulse radiates from both score displays every second.

### UI Polish

- Score digits: use a large outlined font style (stroke behind fill). Animate scale: winning-side digit scales up to 1.15× over 8 frames on score then eases back.
- "MATCH POINT" banner: slide in from top with a glow and drop shadow. Flash every 40 frames.
- Ball speed indicator: a subtle horizontal bar at the very bottom of the canvas (2px tall), filling left-to-right as rally speed increases, colored from green → yellow → red.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Paddle hit | OscillatorNode (square wave) + short gain envelope | 220 Hz → 440 Hz sweep | 60 ms | Pitch scales +20 Hz per rally count, capped at 660 Hz |
| Wall bounce | OscillatorNode (triangle) | 330 Hz, flat | 40 ms | Slightly quieter than paddle hit |
| Score point | BiquadFilter (lowpass) noise burst + sine drop | White noise filtered at 400 Hz + 110 Hz sine | 400 ms | Descending pitch on score = defeat feel |
| Player scores | Same as score point but brighter | 880 Hz brief sting | 200 ms | Envelope: fast attack, fast release |
| Game start | Ascending arpeggio | 220 → 330 → 440 Hz, OscNode sawtooth | 300 ms total | Three quick notes |
| Match point | Low pulse | 55 Hz sine, repeating | 80 ms on / 80 ms off | Subtly tense |

### Music/Ambience

A minimal electronic "heartbeat" loop: a 60 BPM two-note bass pulse (`55 Hz` and `82.5 Hz`) with a `BiquadFilter` lowpass at 200 Hz. Volume at 0.08 (barely audible). The pulse tempo increases linearly with rally count (up to 120 BPM at 15 rally hits), creating subliminal urgency without intrusion.

## Implementation Priority
- High: Ball motion trail, paddle hit flash particles, score digit scale animation
- Medium: Background scan lines, ball layered orb, sound events
- Low: Halftone dot background, match-point banner animation, music loop
