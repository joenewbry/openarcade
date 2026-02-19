# Joust — Visual & Sound Design

## Current Aesthetic

Classic arcade platform flapper with a dark background containing pre-computed static star dots (`#334`), blue-grey platforms (`#0f3460` fill, `#1a5a90` highlight), animated lava at the bottom (`#ff3c00cc` base, `#fa0` bright highlights), and player/enemy knight riders on various mount colors. Player is salmon/coral `#f86` body with `#a64` mount. Enemies are red, yellow, and purple knights. Wings animate with flap/rest angles. Eggs bounce and cycle colors toward hatching. Lance is a white line with tip circle. The aesthetic has solid arcade bones but lacks environmental depth and visual drama.

## Aesthetic Assessment

**Score: 3/5**

The lava animation is the game's visual highlight — it conveys danger effectively with wave motion and bright highlights. The platform highlight stripe is a smart bevel touch. Egg color cycling is readable. However the background is extremely minimal (random dark dots), the knight silhouettes are simple (no wing detail, no feathers, no mount personality), and the platforms lack the grand stone architecture of the arcade original. Explosions/defeats are not detailed. The game deserves a dramatic lava-arena visual identity.

## Visual Redesign Plan

### Background & Environment

Transform the background into a volcanic arena:

- **Sky:** Deep red-black gradient, top `#080408` → mid `#150808` → bottom `#220810` — a sky lit from below by lava. This gives the whole arena an infernal atmosphere.
- **Distant architecture:** Faint silhouettes of stone arches or columns `rgba(50,20,20,0.15)` at far background, parallaxing slightly during play
- **Stars:** 30 dull red-orange dots `rgba(200,100,80,0.4)` — stars in a volcanic sky, scattered in upper third
- **Smoke wisps:** 6 slow-moving grey-brown wisps `rgba(80,40,20,0.08)` drifting upward from off-screen, suggesting volcanic activity

**Platforms:** Transform from flat blue-grey to carved stone:
- Fill: `#1a1a2a` (dark stone, almost black)
- Top surface: `#2a3060` (slightly blue-tinged stone top, where the knights land)
- Top edge highlight: `#4466aa` 2px bright line (moonlit stone edge)
- Side face: `#0f0f1a` (stone shadow side)
- Texture suggestion: faint `rgba(40,50,80,0.08)` vertical lines at 4px intervals (stone grain)
- Bottom lip: `#0a0a10` darkest, suggesting the hanging underside

**Lava:** The lava is already the best element — elevate it:
- Base fill: `#1a0500` (dark char below surface)
- Lava surface: animated sine wave, fill gradient `#cc2200` → `#ff4400` → `#ff8800` (hotter toward peaks)
- Bright crest highlights: `#ffcc00` top 1px of each wave crest, glow
- Lava glow: `rgba(255,80,0,0.2)` upward gradient from lava surface, fading over 40px — casts orange light on everything above it
- Lava bubbles: occasional dark circle rises and pops `#cc2200`, 4–8 per second at random positions
- Glow cast on platform undersides: the lowest platforms have an orange-tinted underside `rgba(255,100,0,0.15)` from lava light

### Color Palette

- Background top: `#080408`
- Background bottom: `#220810`
- Platform stone top: `#2a3060`
- Platform highlight: `#4466aa`
- Lava base: `#cc2200`
- Lava bright: `#ff8800`
- Lava crest: `#ffcc00`
- Lava glow: `rgba(255,80,0,0.25)`
- Player body: `#ff8866`
- Player mount: `#bb5533`
- Player lance: `#ffffff`
- Enemy red: `#ff3333`
- Enemy yellow: `#ffee00`
- Enemy purple: `#bb44ff`
- Egg white: `#eeeeee`
- Egg yellow: `#ffee44`
- Egg orange: `#ff8833`
- Wings: `rgba(200,160,100,0.7)`

### Entity Redesigns

**Player Knight:**
- Body: `#ff8866` polygon (slightly more complex shape — rectangular torso, round helm outline)
- Helm: darker `#cc5533` with a bright `#ffaa88` visor slit
- Mount (ostrich): `#bb5533` body, `#994422` legs, bright eye dot `#ffcc88`
- Wing pair: Two oval shapes `#ccaa66` fanning outward on flap, folding on rest. Feather detail: 3 short lines on wing surface in `rgba(150,120,60,0.5)`
- Lance: White `#ffffff` line extending forward from knight's hand, bright tip dot with 4px glow
- On lance attack: brief bright flash at lance tip, directional spark

**Enemy Knights:**
- Red knight: `#ff3333` body, `#992222` mount, `#ff8888` visor — aggressive and bright
- Yellow knight: `#ffee00` body, `#998800` mount, `#ffffaa` visor — fast and flickering
- Purple knight: `#bb44ff` body, `#662288` mount, `#dd88ff` visor — mystical and large
- Each enemy has a distinct wing silhouette: red = pointed, yellow = small/fast, purple = wide/grand

**Eggs:**
- Draw as true oval (not circle) `#eeeeee` with subtle highlight dot
- Color cycle: white `#eeeeee` → pale yellow `#ffffaa` → gold `#ffee44` → orange `#ff8833` → bright orange just before hatch
- Near-hatch shake: position oscillates ±2px at 8Hz
- Hatch explosion: shell fragments (4 oval shards) fly outward, new enemy knight phases in

**Lance collision:**
- On successful joust: victorious lance flashes `#ffff88`, loser knight bursts into particles

### Particle & Effect System

- **Knight death burst:** 8 body-color particles + 4 wing-feather particles (pale tan), life 0.5s, spin outward + rise
- **Lava death:** Knight falls into lava → 6 lava splash particles `#ff6600`, brief screen shake 3px
- **Egg hatch explosion:** 4 egg-shell shard particles, spin + fade
- **Lance impact sparks:** 3 white sparks at collision point, life 0.2s
- **Wing flap dust:** On each wing flap at low altitude, 2 tiny dust particles `rgba(200,200,200,0.2)` at wingtips
- **Lava bubble pop:** When bubble surface pops, 3 tiny orange droplets spray briefly
- **Lava light flicker:** Every 2–4 seconds, brief brightness oscillation of the lava glow (random ±20%) simulating real lava dynamics
- **Score popup:** "500" floating text in bright white, rises from defeat point and fades
- **Platform landing dust:** 2 small grey puffs on heavy landing

### UI Polish

- Lives counter: Joust-knight silhouette icons at top-left, player color, each with small glow
- Score: Large white numerals top-center with subtle gold glow `rgba(255,200,100,0.3)`
- Wave indicator: "WAVE N" in stone-texture-style text top-right, bronze-gold color `#cc9944`
- Game over: Dark volcanic overlay `rgba(8,4,8,0.9)`, "GAME OVER" in lava-red `#ff4400` with ember particles rising behind the text
- Wave start banner: "WAVE N BEGINS" sweeps in from left in gold text on dark panel

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Wing flap | White noise burst, highpass | cutoff 2000Hz, gain 0.25 | 0.1s | Feather swish |
| Flap rhythm | Trigger flap per wing cycle | Per animation frame cycle | Per flap | Tied to animation |
| Lance hit (win) | High metallic ring | 1200Hz triangle, gain 0.5 | 0.3s | Victory clang |
| Lance hit (lose) | Low thud | 200Hz sine, gain 0.6 | 0.25s | Defeat impact |
| Knight death | Pop burst | White noise, bandpass 600Hz, gain 0.6 | 0.4s | Body dissolve |
| Egg bounce | Soft boing | 300Hz sine, gain 0.3 | 0.12s | Rubber tap |
| Egg hatch | Crack + blip | White noise burst 0.1s + 440Hz ascending | 0.5s | Shell break |
| Lava splash | Low sizzle | White noise, lowpass 300Hz, gain 0.8 | 0.8s | Lava death |
| Lava bubble | Low blop | 100Hz → 60Hz sine, gain 0.3 | 0.2s | Periodic bubbles |
| Platform land | Solid thud | 150Hz sine, gain 0.4 | 0.15s | Stone landing |
| Wave start | Horn fanfare | 330Hz → 440Hz → 554Hz square, gain 0.4 | 0.5s | Medieval feel |
| Score bonus | Ascending chime | 440-554-660Hz, triangle, gain 0.4 | 0.4s | Bonus earned |
| Game over | Descending horn | 440Hz → 220Hz square, gain 0.5 | 1.0s | Defeat |
| Lava roar (ambient) | Low rumble | 40Hz triangle, gain 0.12 | Looped | Background lava |

### Music/Ambience

Medieval-dark orchestral feel synthesized with Web Audio:
- Bass drum: White noise burst (lowpass 150Hz, gain 0.4) on beats 1 and 3 at 96BPM
- War drum accent: White noise (lowpass 300Hz, gain 0.25) on beat 3 with slight reverb (delay node 0.1s, feedback 0.2)
- Low horn drone: Sawtooth 110Hz + 115Hz (slight detune for thickness), gain 0.1, slow 2s attack — constant dark drone
- String-like pad: Triangle 220Hz/277Hz/330Hz minor chord, gain 0.08, slow vibrato LFO (3Hz, ±4Hz)
- High tension string: Triangle 880Hz, very low gain 0.03, staccato pattern (on 0.1s, off 0.2s) — adds urgency
- Lava roar underpinning: Very low 40Hz triangle, gain 0.12 — felt more than heard, adds physicality
- Wave N difficulty: Each wave raises drum tempo by 2BPM and string tension gain by 0.005

## Implementation Priority

- High: Volcanic sky gradient, lava wave + crest highlights + upward glow cast, knight feather detail wings, lance impact spark, knight death burst, all combat sounds
- Medium: Platform stone multi-face rendering, lava bubble pops, lava light flicker, egg true-oval + hatch explosion, distant architecture silhouette, drum+drone music loop
- Low: Score popup floating text, smoke wisps background, wave start banner sweep, platform landing dust, wing flap dust particles, per-wave tempo increase
