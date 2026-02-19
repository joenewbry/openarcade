# Space Invaders — Visual & Sound Design

## Current Aesthetic

480x560 Space Invaders with 10 alien types (grunt, zigzagger, diver, tank, splitter, mini, phaser, bomber, speedster, mothership). Background is near-black with 60 twinkling white dots. Player ship is a solid green triangle polygon. Alien types have distinct shapes — zigzaggers are yellow diamonds, divers are orange wing shapes, tanks are colored rectangles, splitters are circles that divide. Bullets are colored rectangles. Basic glow on most entities. The mothership boss has a pulsing saucer silhouette. Overall readable but visually primitive.

## Aesthetic Assessment
**Score: 3/5**

The alien type diversity is the game's real strength — there are genuinely interesting creature designs here. The weakness is the visual treatment: all enemies share the same flat fill style with no depth or animation. The player ship is utterly featureless. No background depth. No wave intro drama. The mothership deserves far more visual presence for a boss.

## Visual Redesign Plan

### Background & Environment

**Starfield:** Upgrade to a 3-layer parallax field. The formation scroll movement (formX offset) provides automatic parallax if stars are stored in 3 groups with different x-scroll multipliers. Add star color variety — 70% cool white, 20% pale blue, 10% warm amber.

**Planet backdrop:** A large, very faint gas giant disc in the lower-right background corner at 8% opacity — rings visible as thin elliptical arcs. As waves progress, the planet slowly "approaches" (increases in size slightly) creating a sense of danger.

**Atmospheric glow:** Near the bottom of the screen, a subtle ground-level glow in dark green (matching the player ship) suggests a planetary surface to defend.

**Wave intro effect:** When a new wave begins, draw the wave title with a scanline animation — text "beams in" from left to right like a radar sweep.

### Color Palette
- Player ship: `#00ff44`
- Player bullet: `#44ff88`
- Background: `#020209`
- Alien accent: type-specific (see below)
- Mothership: `#ffcc00`
- Ground glow: `#003322`
- Explosion: `#ff6600`, `#ffcc00`, `#ffffff`
- Glow/bloom: `#00ff44`, per-alien colors

### Entity Redesigns

**Player ship:** Completely rework from a plain triangle. Create a proper 8-vertex ship silhouette:
- Swept delta wings with engine nacelles (small rects) at the wingtips
- A raised cockpit dome at the front
- Engine exhaust glow at the rear: a soft green glowing rectangle that flickers slightly
- When moving left/right, the ship tilts slightly (lean 3° toward direction)

**Grunt (basic):** Classic Space Invaders crab design — two wide horizontal segments, 4 "legs," and two white eye pixels. Green with bright core glow.

**Zigzagger:** Diamond shape is good; add two trailing "fins" on the sides that flutter as it moves. Yellow with motion blur streak.

**Diver:** Give it a proper dive-bomber wing silhouette — swept V-shape with a cockpit dome at top. Orange with fire trail when diving.

**Tank:** Armored block with visible rivets/bolts and a thick perimeter outline. Blue-teal, with an armor integrity meter displayed as colored edge segments that darken as HP drops.

**Splitter:** Pulsing purple circle; add a visible "split seam" running down the middle (a darker dividing line) that vibrates as HP drops. When it splits, emit a brief shockwave ring.

**Phaser:** Ghost silhouette that phases with additive blending — when phasing out, it should dissolve with pixel-scatter particles rather than just dimming. When phasing in, reforms from scattered particles.

**Bomber:** Heavy, wide shape — a proper blockade-runner silhouette. Red with glowing bomb-bay doors that open before a spread shot.

**Speedster:** White diamond with strong motion-blur lines trailing behind; when it dashes, leave an afterimage ghost for 4 frames.

**Mothership (boss):** Complete rework. The saucer should be large (~96×48 px), with:
- Multiple dome layers (bright center dome, flat wide body, narrow underbelly)
- Rotating energy ring below the body
- Scanning beam: a sweeping line of light from the underside
- Blinking navigation lights (red/green alternating)
- On low HP, sparks and smoke particles trail from damaged hull sections

### Particle & Effect System

- **Player fires:** Small green muzzle flash at gun barrel (2-frame flash)
- **Alien destroyed:** Color-matched 12-particle burst; screen briefly flashes the alien's color at edges
- **Tank hit (not killed):** Metallic spark burst + armor panel darkens
- **Splitter splits:** Shockwave ring + 6 debris particles
- **Phaser phases in:** Particle convergence animation (dots collapse to center)
- **Bomber fires spread:** Three distinct colored bullet trails that fan outward
- **Mothership hit:** Hull damage sparks (orange/white), then a smoke trail from the hit point
- **Mothership killed:** Epic multi-stage explosion — 5 sequential blasts across the hull before final detonation
- **Player destroyed:** Player ship fragments into 6 triangular shards that tumble downward

### UI Polish

- Lives display: tiny player ships with color matching current ship design
- Wave banner: full-width text beam-in animation with enemy type preview icons
- Score multiplier pop-up on multi-kill chains
- HP display for tank: visible above the tank entity as segmented block

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player fires | Sharp zip | Sine 1600→800 Hz | 60ms | Classic arcade laser feel |
| Alien hit (survives) | Metal clank | 440 Hz square, decay | 80ms | |
| Alien destroyed | Invader classic boop | Square 220→110 Hz descend | 150ms | Nod to original |
| Player destroyed | Explosion cascade | Brown noise + 80 Hz sine, 4 sequential bursts | 800ms | |
| Mothership hit | Heavy thud | 100 Hz sine + noise | 200ms | |
| Mothership destroyed | Epic explosion | Multi-layered noise + 3 sequential booms | 2.0s | |
| Formation march | Classic 4-note pattern | Square wave, 80/90/60/75 Hz cycling | Loop | Speeds up as aliens die |
| Diver approaches | Alert tone | 880 Hz sine, 4Hz pulse rate | While diving | Warning beep |
| Phaser appears | Ghost shimmer | Sine 2000 Hz, ring-mod at 8 Hz | 300ms | Eerie effect |
| Wave intro | Descending sweep | White noise swept 4000→400 Hz | 800ms | Dramatic wave reveal |
| Splitter splits | Fork sound | Two tones split: 440→330 and 440→550 Hz | 300ms | |
| Player bullet hits top | Soft miss | 200 Hz sine blip | 30ms | |

### Music/Ambience

The classic Space Invaders march is iconic — reinterpret it as a synthesized 4-note bass pattern. Use a square wave oscillator cycling through F1, A1, G1, E1 at a tempo that speeds up as fewer aliens remain alive. At maximum speed (last 5 aliens), add a high-pitched tremolo overlay at 800 Hz. During boss (mothership) wave, replace the march with a long drone pad: sawtooth at 55 Hz with a slow LFO tremolo at 0.5 Hz.

## Implementation Priority
- High: Formation march sound (speed-scaling), alien destruction particle burst, player ship redesign, mothership visual rework
- Medium: Tank armor integrity display, diver fire trail, phaser particle-dissolve effect, wave banner beam-in animation
- Low: Planet backdrop, 3-layer parallax stars, player ship tilt on movement, mothership scanning beam, bomber door-open animation
