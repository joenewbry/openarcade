# Slither — Visual & Sound Design

## Current Aesthetic

600×600 viewport on a 3000×3000 circular arena. Player snake is teal (`#6ea`), 8 AI snakes each with distinct colors from an AI_COLORS array. Snake segments are circles drawn tail-to-head. The head has two white eye circles with black pupils. Food items are 200 colored circles arranged around the arena with 20 different rainbow colors, each with a pulsing size. When boosting, the snake drops food trail. A minimap (100×100) sits bottom-right, and a boost bar sits bottom-left. Arena boundary is a simple circle stroke. The background is a plain dark grey grid.

## Aesthetic Assessment
**Score: 3/5**

The core snake visual is clean and the food rainbow creates a joyful color burst. The arena feel is there but the background grid is flat, the snake skin is just uniformly colored circles, the head design is minimal, and the death/consumption effects are nearly absent. Food could feel much more alive. The minimap and boost bar work but are unpolished.

## Visual Redesign Plan

### Background & Environment

Replace the flat dark grey grid with a **living arena floor** aesthetic. Background is a deep dark green-black (`#060e08`). Draw the hex tile or circular dot pattern across the arena — a subtle grid of tiny circles (3px radius) at 20px intervals, at 5% opacity, giving a biotextured feel (like a cellular organism's interior). The arena boundary circle gets a thick bright neon border: a double-ring effect, inner bright teal (`#00ffaa`) at 2px, outer glow at 6px wide. Outside the boundary ring, the background transitions to near-black with a subtle vignette.

Add a faint ambient light in the center of the arena — a very large radial gradient, brighter at center (slightly lighter dark green) and fading to the edge darkness. This makes the arena feel lit from above.

### Color Palette
- Player snake: `#00ffaa` (neon teal, upgraded from `#6ea`)
- Arena floor: `#060e08`
- Arena dot grid: `#0a1a0c`
- Arena border inner: `#00ffaa`
- Arena border outer glow: `#00aa66`
- Food glow: varies per food color
- HUD panel: `#020c06`
- Boost bar: `#00ffaa`
- Background outside arena: `#020408`

### Entity Redesigns

**Player snake segments:** Instead of uniform solid circles, give the snake a proper **scaled skin** appearance. Draw each segment as a circle with an interior darker ellipse (the scale center), creating a convex dome illusion. Add a subtle highlight dot in the upper-left of each segment (a tiny white ellipse at 15% opacity) to reinforce the 3D sphere look. The segment color varies slightly along the body: the first few segments behind the head are slightly brighter, the tail segments are slightly darker, creating a gradual fade. Between segments, draw a thin connector line in a slightly darker shade to ensure no gaps are visible.

**Player snake head:** Significantly more expressive. Make the head circle 30% larger than body segments. Draw it with the same dome/highlight treatment but more pronounced. Eyes: larger white circles with properly sized pupils, plus a thin black iris ring between. Add a slight angry/determined brow — two small dark trapezoid shapes above the eyes angled inward. The tongue: a thin forked red line extending forward from the front of the head, flickering (visible for 5 frames, hidden for 5 frames).

**AI snake segments:** Each AI snake gets a distinct pattern treatment. Some get a stripe pattern (alternating darker and lighter segment rows). Some get a spot pattern (small dark circle in the center of each segment). This makes AI snakes visually distinct from each other and from the player.

**Food items:** Transform from plain colored circles into **glowing orbs** with a multi-layer glow effect. Each food item: inner bright core (small bright circle), middle ring (standard food color), outer glow halo (large semi-transparent circle, alpha ~0.3). The pulsing continues but also cycles the glow intensity. On a 6-second cycle, each food slowly rotates through a secondary color tint. When a snake is nearby, food orbs subtly lean toward the snake (shift the center dot position 1–2px toward the approaching head) — a lure effect.

**Arena boundary:** Make the boundary feel dangerous — the neon double-ring border has a secondary inner warning ring that activates when the player is within 100px of the boundary (a flashing red-orange ring appears just inside the boundary, pulsing faster as distance decreases).

**Minimap:** Full redesign — dark panel with a subtle hex texture background, a proper rounded border, and color-coded snake heads as dots rather than full snakes. The arena boundary is shown as a bright ring on the minimap. The player's position gets a special blinking dot.

**Death explosion:** When a snake dies on collision, it explodes into dozens of food orbs — all segments transform into food items that spread outward from the death point with initial velocity, then settle. Each orb glows in the dead snake's color.

### Particle & Effect System

- **Eating food:** A brief bright flash at the food position (small expanding circle, 5 frames). A soft "+X" floating text briefly appears (X = food mass). The player head briefly scales up by 5% for 3 frames.
- **Boost active:** Speed lines trail behind the player snake — 4–6 thin lines extending 20px behind the last 3 segments, fading quickly. The segment colors temporarily brighten.
- **Food dropped from boost:** Small orbs eject from the tail with a brief sparkle, then glow normally.
- **Snake death:** All segments explode outward as food orbs, each with an initial velocity radiating from the center of mass. A large bright flash circle at the death point.
- **Player death:** Camera stays on death point for 1 second showing the explosion. "YOU DIED" text materializes in the center of the viewport in large red letters.
- **Near-miss on another snake:** A brief yellow flash along the player segments that nearly collided, lasting 5 frames.
- **Growing (eating food):** New segment appears at the tail with a brief glow pulse before stabilizing.
- **Leaderboard change:** On the minimap, the rank indicator briefly flashes when player moves up a position.

### UI Polish

- Boost bar: Redesign as a segmented bar (5–10 segment rectangles) in teal with a darker empty state. A small lightning bolt icon to the left. Segments fade out as boost is used and fill back in as it recharges.
- Leaderboard: A proper transparent panel on the left side (or right) showing top 5 snakes by size, with color-coded names and size numbers. The player's entry is highlighted.
- Mass counter: Below the leaderboard, a mass display with a small snake icon. Number counts up in real-time.
- Kill feed: Brief toast notifications ("You killed Red Snake" or "Blue Snake was killed") that slide in from the right edge and fade after 3 seconds.
- Arena size indicator: A subtle text "ARENA" label at the minimap with the current visible map proportion.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Eat food | OscillatorNode, sine | 880 Hz, 30ms, soft attack | 0.03s | Tiny pip |
| Eat multiple rapid | Same but pitch+40 Hz per eat | Rapid succession | 0.03s each | Rising pitch chain |
| Boost activate | OscillatorNode, triangle | 440→660 Hz sweep | 0.15s | Whoosh |
| Boost sustain | White noise highpass 4kHz | Continuous low gain 0.02 | Loop | Speed rush |
| Boost deactivate | OscillatorNode, triangle | 660→330 Hz | 0.1s | Wind down |
| Other snake dies nearby | White noise burst | Lowpass 800 Hz, 0.2s | 0.2s | Squelch |
| Player grows large | OscillatorNode, sine | 220 Hz gentle | 0.2s | Growth hum |
| Near-miss collision | OscillatorNode, square | 440 Hz 2× pulse | 0.1s | Warning blip |
| Player death | White noise all-band + 110 Hz sine | 0.6s fade | 0.6s | Splat |
| Rank up | OscillatorNode, sine | 440→554→659 Hz, 60ms each | 0.2s | Ascending chime |
| Arena boundary warning | OscillatorNode, square | 220 Hz repeating pulse | 0.3s per pulse | While near edge |
| Game start | OscillatorNode, sine | 523→659→784 Hz | 0.3s | Ready sting |

### Music/Ambience

A hypnotic electronic loop, tribal/organic feel at 108 BPM. Bass: sawtooth oscillator, 55 Hz, playing a repeating 4-note riff (55→73→82→61 Hz, one note per beat). This is the heartbeat of the arena. Percussion: filtered noise kick (60Hz lowpass, 40ms, beats 1+3) and snare (200Hz bandpass, 30ms, beats 2+4). Hi-hat: 8kHz filtered noise, 15ms, every 8th note. Melody: a sine oscillator cycling through a pentatonic minor scale (A3, C4, D4, E4, G4) in a slowly evolving 8-note phrase, one note per 2 beats, soft attack 100ms. As the player grows larger (more mass), the bass pitch steps up by a semitone every 500 mass units — the arena music literally escalates as you dominate. When the player is in the top 3 by size, add a second arpeggiated melody layer an octave higher. On player death, all music cuts immediately with a silence punch, then fades back in softly after 3 seconds.

## Implementation Priority
- High: Snake segment dome/highlight treatment for 3D skin appearance; head expressive design with brow and tongue; food glowing multi-layer orb with nearby-lean effect; death explosion into food orbs; boost speed line trails
- Medium: AI snake distinct pattern treatments (stripes/spots per snake); arena boundary warning ring near edges; leaderboard transparent panel; eat food rising-pitch chain audio; kill feed toast notifications
- Low: Minimap hex texture background; mass-scaled music pitch escalation; food secondary color tint cycle; near-miss yellow flash; tongue flicker animation
