# Helicopter — Visual & Sound Design

## Current Aesthetic

One-button helicopter survival game with a hot-pink theme (`#f4a`, `#a36`), dark navy cave walls (`#16213e`), and obstacles in deep purple (`#3a1528`/`#5a2540`) with pointed stalactite/stalagmite tips. The helicopter is a pink ellipse body with a white cockpit window and a tail boom. Thrust particles are pink. The cave edges glow pink. The aesthetic is committed to a specific neon-pink identity that is unusual and eye-catching, but the cave walls are monotone and the obstacles lack visual variation.

## Aesthetic Assessment

**Score: 3/5**

The hot-pink-on-dark-navy combination is a genuinely bold and memorable choice. The cave glow creates atmosphere. However the cave interior is flat and dark with no depth layers, the helicopter model is very simple (just an ellipse), and the obstacles are plain dark triangles. The game could look dramatically more polished with layered cave depth, a more detailed helicopter sprite, animated cave elements, and particle-rich thrust effects.

## Visual Redesign Plan

### Background & Environment

The cave system should feel like flying through a bioluminescent alien cavern. Build it in three depth layers:

- **Far background:** Very dark `#060610` with faint bioluminescent spots — small circles in `rgba(255,40,170,0.04)` scattered randomly, drifting slowly downward (parallax 5% speed)
- **Mid cave wall texture:** `#16213e` base with `rgba(90,30,80,0.4)` streaks suggesting rock strata, drawn as slightly irregular horizontal bands
- **Near obstacles:** Deep purple `#2a0a20` with brighter purple trim `#5a1a50` on the leading edges (the tips the player must avoid)

Cave ceiling and floor edges: Bright neon pink `#ff44aa` line with 8px bloom. The glow should pulse very slightly (oscillate ±20% brightness at 0.5Hz) as if the cave walls are alive.

Add a slow left-to-right parallax scroll on the mid background layer (2px/frame) to reinforce sense of speed.

### Color Palette

- Primary (theme): `#ff44aa`
- Primary dim: `#aa2266`
- Background deep: `#060610`
- Cave wall fill: `#16213e`
- Cave wall accent: `#2a0a30`
- Obstacle fill: `#2a0a20`
- Obstacle edge: `#661144`
- Obstacle tip glow: `#ff2288`
- Helicopter body: `#ff44aa`
- Helicopter cockpit: `#aaddff`
- Helicopter dark: `#882255`
- Thrust particle: `#ff6622`
- Score text: `#ffffff`
- Distance text: `#ff44aa`

### Entity Redesigns

**Helicopter:** Build a more detailed silhouette:
- Fuselage: elongated rounded hexagon in `#ff44aa`, with a darker underside gradient `#aa2266`
- Cockpit bubble: ellipse `#aaddff` (light blue, like a real cockpit glass) with a small white `#ffffff` specular dot
- Tail boom: thin rectangle `#882255` extending right, narrowing to a point
- Tail rotor: small 3-blade propeller spinning fast at tail end, `#ff44aa`
- Main rotor: 2-blade or 3-blade, `#cc3388` on upper side, `#661144` on lower. Rotor tip glow dots `#ff44aa`
- Skids: two thin dark lines `#661144` beneath fuselage
- When thrusting: engine glow halo beneath rotor hub `rgba(255,100,40,0.5)`

**Obstacles (stalactites/stalagmites):**
- Body: `#2a0a20` fill, `#661144` outline
- Tip: bright neon pink dot `#ff2288` with 6px glow — the danger point players must avoid
- Side edges: subtle gradient lighter `#3a1030` on faces to suggest 3D depth
- Each obstacle subtly different shade (randomize ±10% lightness) to avoid uniform look

**Cave walls (top/bottom):** Jagged edge silhouette instead of flat — randomly displace the cave boundary by ±3px at 10px intervals to give a rough cave feel.

### Particle & Effect System

- **Thrust:** 6 particles per frame from rotor area, orange-red `#ff6622` → `#ff2200` → transparent, upward velocity + slight spread, life 0.25s. Size 3px → 1px.
- **Hover drift:** When not thrusting, 2 small white dust particles `rgba(255,255,255,0.3)` drift downward from skids
- **Cave scrape death:** On collision, 16 rock fragment particles in `#661144` and `#2a0a20`, spray outward + screen flash `rgba(255,40,100,0.5)` for 0.15s
- **Bioluminescent wisps:** 8 ambient particles slowly drifting in mid-background, `rgba(255,40,170,0.15)`, large (8px), very slow
- **Score milestone:** At 1000/5000/10000m distance, pink flash overlay `rgba(255,68,170,0.2)` + floating score text animation
- **Near-miss spark:** When helicopter passes within 8px of obstacle, 2 spark particles `#ff44aa` with glow

### UI Polish

- Distance meter: Top-center, large pink numeral `#ff44aa` with soft glow, label "m" in smaller `#aa6688`
- Best distance: Smaller below current, `#aa4488`
- "HOLD TO FLY" prompt: Centered on start screen, pulsing pink text with glow
- Game over screen: Dark overlay `rgba(6,6,16,0.85)`, "CRASHED" in large `#ff44aa` block letters with glow, score + best below, restart prompt pulsing
- Speed indicator: Subtle horizontal bar at bottom, fill pink, grows as distance increases (cave gets faster)

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Triangle wave, steady | 80Hz, gain 0.15 | Looped | Low helicopter hum |
| Thrust | Add sawtooth layer | 120Hz sawtooth mixed in, gain 0.08 | While holding | Layered rotor buzz |
| Engine pitch up | Pitch LFO increase | 80Hz → 100Hz over 0.3s while holding | Continuous | Acceleration feel |
| Engine pitch down | Pitch decrease | 100Hz → 80Hz over 0.5s on release | Continuous | Deceleration |
| Rotor chop | White noise burst, bandpass | center 2000Hz, Q 3, gain 0.1, rhythmic 12Hz | Looped | Chopper chop |
| Wall collision | White noise + lowpass | cutoff 200Hz, gain 0.9 | 0.6s | Crash impact |
| Obstacle graze | Short noise burst | cutoff 800Hz, gain 0.4 | 0.1s | Scrape |
| Distance milestone | Rising chime | 660Hz → 880Hz sine, gain 0.3 | 0.3s | Achievement ping |
| Game start | Ascending drone | 60Hz → 80Hz triangle, 0.5s fade in | 0.8s | Engine startup |
| High score | Arpeggio | A4-C5-E5-A5, sine, gain 0.4 | 0.6s | New record |

### Music/Ambience

Pulsing dark synthwave undertone matching the cave atmosphere:
- Deep bass drone: sine at 55Hz (A1), gain 0.12, constant — gives a physical rumble feel
- Slow arpeggio: triangle wave cycling through A2-C3-E3-G3 (minor feel), each note 0.8s, gain 0.08
- Tension riser: as distance increases past 5000m, slowly raise gain of a noise-based pad (white noise through a lowpass at 200Hz) from 0 → 0.1 over 30 seconds — subconsciously increases tension
- Pink pulse: very faint high sine at 880Hz, gain 0.02, LFO on gain at 1Hz — gives a heartbeat-like pulse
- No melody — keep it atmospheric and tense

## Implementation Priority

- High: Detailed helicopter model (rotor, cockpit, tail), thrust particle system, cave edge neon glow pulse, crash effect (flash + particles)
- Medium: Three-layer parallax cave background, obstacle tip glow dots, bioluminescent wisps, engine sound loop with pitch variation, distance milestone sounds
- Low: Jagged cave edge silhouette, hover-drift dust particles, near-miss spark, speed indicator bar, tension riser music effect
