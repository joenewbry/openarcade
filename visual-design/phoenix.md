# Phoenix — Visual & Sound Design

## Current Aesthetic

Classic shooter setup: a scrolling starfield background with 100 twinkling stars, a player ship at the bottom (orange-red triangle with a golden cockpit and flame exhaust), and enemies drawn as birds/phoenix creatures with animated wings. The boss is a purple UFO with a rotating shield ring of colored arc segments. Player bullets are orange rectangles with glow. Enemy bullets are red circles. Particles are colored squares from explosions. The HUD shows score, lives, shields, and wave number.

## Aesthetic Assessment
**Score: 3.5/5**

Probably the most visually complete shooter in the collection. The phoenix bird designs are genuinely interesting and the boss shield mechanic is well-visualized. However, the starfield is sparse and uniform, the player ship is very simple, the color palette is almost entirely warm reds and oranges which makes enemies and player visually similar, and explosion particles are just colored rectangles. The game has solid bones but needs richer visuals to feel premium.

## Visual Redesign Plan

### Background & Environment

Replace the uniform star field with a layered parallax starfield: 3 layers of stars at different speeds and sizes — large close stars (size 2–3, move at full speed), medium mid-stars (size 1–2, move at 0.6x), tiny distant stars (size 1, move at 0.3x). A sweeping nebula band crosses the background — a wide diagonal gradient in deep purple/magenta at ~15% opacity. Occasionally, a distant planet or moon silhouette drifts across at very low speed, adding scale.

Planet surfaces provide the enemy context — the birds emerge from a strange alien world below. A subtle atmospheric glow hugs the bottom of the screen in warm orange, suggesting the planet surface just off-screen.

### Color Palette
- Player ship: `#cc4400`, `#ff6600`, `#ffaa00`
- Player bullet: `#ff9900`
- Small bird: `#ff8833`
- Large bird: `#ff4444`
- Phoenix bird: `#ff2200`, `#ff6600`, `#ffaa00`
- Boss body: `#5522aa`
- Boss shield (full): `#ff8800`
- Boss shield (damaged): `#aa4400`
- Background: `#020408`, `#0a051a`
- Nebula: `#2a0a5a`
- Glow/bloom: `#ff6600`

### Entity Redesigns

**Player ship:** The ship becomes a sleek retrofuture interceptor — wider delta wing shape with two engine pods at the rear, a raised cockpit canopy in the center, and a nose that tapers to a sharp point. Color: deep red hull with gold cockpit and bright orange engine glow. The engine flame becomes two parallel exhausts with particle trails — orange to yellow to transparent.

**Small birds:** Cleaner wing silhouette with visible feather detail lines. Body becomes a more aerodynamic teardrop. Eyes are larger relative to body and glow amber. Wing flap creates visible motion blur smear on extreme positions.

**Large birds:** Add a visible beak (sharp downward-pointing triangle) and tail fan feathers at the rear. Body shows damage as feathers becoming sparse and discolored — use the hpRatio color shift more dramatically.

**Phoenix birds:** These should be stunning — a proper phoenix with an elaborate tail plume that trails sparks. The existing flame body animation is great; enhance it with particle emissions from the tail during movement. The crest should be taller. Add a faint heat shimmer effect (shimmering glow ring) when their regen triggers.

**Boss:** The mothership body should be more detailed — a layered saucer with visible panel lines, antennae, and multiple light rings. The dome becomes a dark semi-sphere with an eerie interior glow. The rotating shield segments glow more intensely and have visible bolt/rivet endpoints. When a shield segment breaks, it explodes in a shower of sparks.

### Particle & Effect System

- **Small explosion:** 8 particles, circular burst, enemy color, 20-frame life, slight gravity
- **Large explosion (phoenix/boss):** 20 particles + 3 secondary ring waves, fire colors, 35-frame life
- **Boss shield segment break:** 6 arc-shaped sparks spray outward along the shield ring tangent
- **Player bullet trail:** 2 ghost positions in 50%/20% opacity orange behind each bullet
- **Enemy bullet:** Becomes an elongated teardrop shape (taller than wide) with a glowing core
- **Engine exhaust:** Continuous particle stream from player ship, orange→yellow→transparent, very light
- **Shield deflection:** White spark burst + brief ring flash centered on player
- **Wave transition:** Background briefly brightens to suggest entering a new zone, then dims

### UI Polish

Lives shown as small ship silhouettes. Shield count shown as golden gem icons. Wave name displayed during intro with a scan-line wipe animation. Boss HP bar at top center with red fill and gold border — dramatic and visible. Score pulses gold on increment during active play.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Sharp zap | Sawtooth 800→400Hz decay | 100ms | Classic laser sound |
| Enemy explosion (small) | Short burst | Noise + 200Hz sine | 150ms | Clean pop |
| Enemy explosion (large) | Deeper burst | Noise + 100Hz sine, slower decay | 300ms | Weight of large birds |
| Phoenix kill | Dramatic burst | Noise + 150Hz + flame hiss overtone | 500ms | Satisfying and epic |
| Boss shield hit | Metal clang | FM synth 400Hz + ring mod | 200ms | Resonant metallic sound |
| Boss shield break | Shattering | Descending noise sweep 2kHz→200Hz | 400ms | Destruction sound |
| Boss explode | Epic detonation | Multiple noise layers + bass drop | 1.5s | Climactic end |
| Player hit | Impact | Noise burst + 300Hz hit | 200ms | Visceral but not jarring |
| Shield active | Energy hum | Sine 220Hz + tremolo 8Hz | Looping | While shield active |
| Regen (phoenix/large bird) | Healing tone | Rising sine 300→600Hz | 300ms | Audible warning |
| Wave intro | Fanfare | 3-note ascending chord | 600ms | Builds excitement |

### Music/Ambience

A driving space-shooter soundtrack: a pulsing bass line (square wave, 55Hz, 4/4 pattern), mid synthesizer lead melody (sawtooth, 8-bar loop), and high hat rhythm (noise bursts at 8th notes). Tempo 140 BPM. Boss wave uses a darker, slower variant with a heavy low drone added. Volume is ~25% of sound effects.

## Implementation Priority
- High: Layered starfield, engine particle trail, phoenix bird spark emissions, explosion particle variety
- Medium: Player ship redesign, large bird beak/feathers, boss shield shard explosions, shield hum sound
- Low: Nebula background, planet silhouette, boss detail panels, wave transition flash, background music
