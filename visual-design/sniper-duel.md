# Sniper Duel — Visual & Sound Design

## Current Aesthetic

600x400 turn-based sniper game set in a dark-green nighttime urban environment. Sky is deep navy `#0a0a1e`/`#141430`, ground is dark green, buildings are grey-dark slabs with dim window rectangles, trees are basic circles. Snipers are tiny stick-figure silhouettes that appear briefly when shooting. Bullets trail golden sparks. The zoom mechanic transforms world coordinates. Overall it is competent but flat — the aesthetic reads as "placeholder dark".

## Aesthetic Assessment
**Score: 3/5**

The world has good structural bones — terrain variation, building windows, bush clusters, bullet physics with wind. But the color palette is drab, there is no atmospheric depth, the sniper characters have no personality, and the bullet impact feels anticlimactic. The scope zoom is underused visually.

## Visual Redesign Plan

### Background & Environment

Transform the night scene into a cinematic dusk/twilight. Sky becomes a gradient from deep indigo `#0d0621` at the top to a warm dark amber `#1a0e04` near the horizon — suggesting a city at the last light of day. Add a moon disc (large pale circle at upper right). Stars dot the upper sky, with a few brighter ones near the horizon haze.

The ground should have subtle texture — thin lighter lines suggesting grass blades or gravel. Buildings get a proper "silhouette against twilight" look: very dark shapes with warm amber window glow (`#ff8800` at low alpha, pulsing subtly as if lit rooms).

Add a distant skyline silhouette layer in the far background: a simple row of tall rectangles at 15% opacity creating depth.

### Color Palette
- Primary: `#c8a040` (player crosshair / bullet trail)
- Secondary: `#ff4466` (AI crosshair)
- Background sky top: `#0d0621`
- Background sky bottom/horizon: `#1a0e04`
- Ground: `#0e1a0a`, `#182810`
- Building silhouette: `#0a0a14`
- Window glow: `#ff8822`
- Glow/bloom: `#ffcc44`, `#ff4466`

### Entity Redesigns

**Snipers:** Give each sniper a more distinct silhouette — prone shooting stance (flatter, elongated shape), with a visible rifle barrel extending forward. Player tinted green, AI tinted red. Add a small puff of smoke/muzzle flash polygon on firing. When hidden (between turns), fade to 0 alpha with a brief shimmer rather than simply vanishing.

**Bullet:** Existing golden trail is good; enhance with a brighter white-hot core `#ffffff` trailing into amber `#ffcc44` → `#ff8800`. On impact, spawn a sharp directional spark burst (6 particles in the bullet's travel direction) plus a brief ring shockwave polygon.

**Buildings:** Add a rooftop ledge line and small antenna/water-tower details on 2-3 buildings. Windows should have occasional warm flicker.

**Trees:** Give foliage multiple circle layers in dark green variants with a highlight dot at top-left suggesting moonlight.

**Move highlights:** Replace the plain green fill with a soft pulsing blue-white "ghost stance" shape, suggesting where the sniper can relocate.

### Particle & Effect System

- **Gunshot (player fires):** Muzzle flash — bright white poly for 2 frames, then a smoke puff of 6 dark grey particles drifting upward.
- **Bullet impact (hit):** 12 red/orange particles, radial burst; screen briefly flashes a desaturated red vignette at the edges.
- **Bullet impact (miss/ground):** 8 brown-grey dirt particles scatter upward.
- **Hit message:** Instead of plain text, draw it as a large glowing stamp that scales in and fades.
- **Scope zoom:** When zooming in, add a circular vignette darkening outside the scope circle to simulate an actual scope lens. Crosshair lines should have subtle mil-dot details at zoom.

### UI Polish

- Wind indicator: replace the simple arrow with an animated wave that undulates like a flag based on wind speed.
- HP bars: styled as armor plating segments that crack/dent when hit.
- Turn timer (if added): a thin countdown arc around the player icon.
- Ambient city sounds visualized as tiny waveform at edge of screen.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player fires | Sharp noise burst + low boom | White noise bandpass 200 Hz, Q=2; separate 80 Hz sine punch | 250ms | Crack + thud |
| AI fires | Same but slightly different timbre | Bandpass at 180 Hz | 200ms | Slightly thinner — less powerful feel |
| Bullet in flight | Rising pitch sine fading in | 1200 Hz → 2400 Hz | 150ms | Whine as bullet approaches viewer |
| Hit (body shot) | Wet thud + brief pain tone | Pink noise burst + 220 Hz sine, fast decay | 300ms | |
| Headshot | Same but adds a higher impact crack | Add 880 Hz click | 400ms | More dramatic |
| Miss (ground) | Dull thud | Brown noise burst, low-pass 300 Hz | 150ms | |
| Wind change | Ambient whoosh | White noise, slowly bandpass-sweep 400→1200 Hz | 800ms | Gentle, atmospheric |
| Victory | Rising major chord | 440, 554, 659 Hz sine held then fade | 1.2s | |
| Defeat | Descending minor intervals | 440, 370, 294 Hz sawtooth | 1.0s | |
| Move to cover | Soft footstep cadence | 4x pink noise clicks, 150ms apart | 600ms | |

### Music/Ambience

Atmospheric drone: low pad of filtered brown noise at ~3% volume simulating distant city hum. Add intermittent distant-wind gusts (bandpass-swept noise, ~every 8s, 400ms duration). During AI turn, add a faint tension pulse — a low frequency sine at 40 Hz gated at 2Hz rate — that stops when the bullet fires.

## Implementation Priority
- High: Bullet impact particle burst, muzzle flash, scope vignette overlay, city-silhouette background layer
- Medium: Building window flicker, sniper prone-stance redesign, wind flag animation, hit/miss sound synthesis
- Low: Moon/stars, rooftop details, armor-segment HP bars, footstep sounds
