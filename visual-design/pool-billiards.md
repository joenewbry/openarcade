# Pool Billiards — Visual & Sound Design

## Current Aesthetic

A top-down 8-ball pool table with dark green felt (`#0c8855`), brown wood rail (`#4a2808` frame), dark navy background (`#1a1a2e`). Balls have basic color fills with number circles and a small gloss highlight. The cue stick renders in two segments (shaft + butt). Diamond sights are gold polygons. Pockets are dark circles with a rim. Aim guide uses dashed lines. Power meter is a side-bar rectangle. Reasonably detailed for a canvas game but lacking depth, reflections, and felt texture.

## Aesthetic Assessment
**Score: 3/5**

The core table layout is solid and readable. However, the felt is a flat color, ball shading is minimal, the wood grain is non-existent, and the overall vibe is "functional placeholder" rather than atmospheric. The pockets lack depth, and there's no ambient lighting.

## Visual Redesign Plan

### Background & Environment

Replace the flat navy background with a very dark charcoal room (`#0a0a10`) with a subtle radial vignette (darker at corners). Add faint overhead light bloom: a soft elliptical gradient centered above the table that bleeds slightly warm white onto the felt surface (simulate a hanging lamp). The table should feel like it lives in a dim billiard hall.

**Felt texture:** Draw the felt as a solid base then overlay a very fine crosshatch of slightly lighter lines (`#0d9560` at 8% opacity) in a 3px grid, rotated 45 degrees relative to the table edges, creating a nap/grain effect.

**Wood rail:** Use a four-layer approach—base dark brown, medium brown with subtle horizontal streaks (drawn as 1px rects every 3px at 15% alpha), a lighter top edge highlight, and a subtle inner shadow on the cushion side.

### Color Palette
- Primary: `#12a86a` (felt surface)
- Secondary: `#7a4a1a` (wood rail mid-tone)
- Background: `#0a0a10`, `#111118`
- Glow/bloom: `#00cc88` (cue ball selection, power meter)
- Overhead lamp: `#fffff0` (warm white bloom)

### Entity Redesigns

**Balls:** Each ball needs a convincing 3D illusion:
- Paint the ball with a radial highlight offset to upper-left (30% of radius), white at 0.35 alpha, fading to zero.
- Add a secondary specular micro-dot at upper-left (10% of radius, white at 0.6 alpha).
- A shadow ellipse below each ball on the felt (dark oval, 40% alpha, width = 2×radius, height = radius × 0.4, offset 3px down-right).
- Stripe balls: clip the colored band more cleanly using two white caps drawn as circles at top and bottom poles.
- The 8-ball gets a deeper, almost metallic black (`#050505`) with a subtle blue-tinted highlight (`#2233aa` at 0.15 alpha).

**Cue stick:** Add a third segment—the handle/wrap zone with a slightly reddish-brown tint and subtle diagonal band marks (4px-spaced thin lines at 10% alpha) to simulate leather wrapping. The ferrule (white section near tip) should have a slight ivory gradient.

**Pockets:** Render as deep concave circles. Draw the main pocket hole in near-black, then a slightly lighter inner ring (concentric smaller circle at 20% brighter). Add a very faint glow for pocketed balls: when a ball goes in, briefly emit a ring-wave animation from the pocket.

**Aim guide:** The aim dashed line gets replaced with a series of dots of decreasing size and alpha (start at 3px, end at 1px over 60 steps). The ghost-ball outline becomes a filled circle at 12% alpha in the cue ball's color. The predicted-path arrow for the object ball uses a glowing gradient dot-trail rather than plain dash.

### Particle & Effect System

- **Ball potted:** 8–12 particles radiate from the pocket entry point in the ball's color, lifetime 25 frames, size 3→1px.
- **Cue strike:** A brief "chalk puff" at the cue tip—6 blue-grey particles drifting upward and fading, lifetime 20 frames.
- **Collision:** On ball-ball contact, 4 white spark particles appear at the contact point, lifetime 8 frames.
- **Foul/scratch flash:** The entire table briefly tints red (`rgba(255,0,0,0.06)`) for 20 frames.

### UI Polish

- Ball rack sidebar: each indicator gets a subtle drop shadow and a thin colored border in the ball's color rather than just a background.
- Power meter: add tick marks at 25%, 50%, 75%. The bar face should have a fine horizontal line texture. At max power (100%), the bar shakes slightly (±1px horizontal).
- "CPU thinking" indicator: replace plain text with an animated three-dot loader with a red glow.
- Player type labels ("YOU: SOLIDS"): render in a slightly embossed style with a thin outline.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cue strike (soft) | OscNode (triangle) + noise | 180 Hz + white noise at 0.15 vol | 80 ms | Clicky-woody feel |
| Cue strike (max power) | OscNode (square) + noise | 120 Hz + filtered noise | 120 ms | Lower, more impactful |
| Ball-ball collision | OscNode (sine) pair | 600 Hz + 800 Hz | 60 ms | Two high pings |
| Ball-rail bounce | OscNode (triangle) | 320 Hz | 50 ms | Duller than ball-ball |
| Ball pocketed | OscNode (sine) descend + thud | 400→200 Hz sweep + 60 Hz noise | 250 ms | Satisfying "plunk" |
| Scratch/foul | Descending warble | 300→150 Hz, triangle | 400 ms | Disappointed feel |
| Shot power charge | Continuous sine (rising pitch) | 110→330 Hz while aiming pulled back | continuous | Plays while mouse held, stops on release |
| Win | Ascending arpeggio | 262, 330, 392, 523 Hz (C major) | 600 ms | Four quick bright notes |
| Loss | Descending minor | 523, 440, 349, 262 Hz | 600 ms | Mirror of win |

### Music/Ambience

Soft atmospheric billiards hall: a 3-second loop of very quiet low-frequency rumble (`55 Hz` sine at 0.04 volume, run through a `BiquadFilter` lowpass at 80 Hz) with occasional faint high-hat noise bursts (filtered white noise, 3kHz bandpass, 30ms, volume 0.03) every 2–4 seconds at random. Creates the illusion of a distant, busy bar without distraction.

## Implementation Priority
- High: Ball 3D shading with highlights + shadow ellipses, felt crosshatch texture, ball-collision sounds
- Medium: Improved pockets with depth ring, chalk puff particles, power charge audio
- Low: Overhead lamp bloom, wood grain streaks, billiards hall ambience loop
