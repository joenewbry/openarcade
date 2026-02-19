# Mappy — Visual & Sound Design

## Current Aesthetic

A 480x560 canvas with a 6-floor mansion platformer. Background `#16213e` (dark navy), floors `#0f3460` (dark blue). Mappy (a police mouse) is drawn with a blue uniform `#4488ff` and peach head `#ffcc88`. Cats are pink `#ff88aa` (normal) and red `#ff4444` (boss Goro at 1.3x scale). Items include TV `#0ff`, Computer `#0f0`, Painting `#f80`, Radio `#f0f`, Safe `#88f`. Trampolines are red `#f44`. The microwave weapon blasts `#ffee44`. The game reads well structurally but feels like a placeholder — the mansion has no character, the cats lack menace, and Mappy lacks charm. The original arcade game had bright, cheerful colors and a cartoonish energy this version doesn't capture.

## Aesthetic Assessment

**Score: 2/5**

The layout is correct and gameplay mechanics are visible, but the visual personality is absent. Mappy should be adorably cheerful, the mansion should feel like a bustling heist target, and the cats should have cartoon villainy. The dark navy palette works against the bright, playful spirit of the original Mappy arcade game. There's also no parallax, no floor texture, and no environmental storytelling.

## Visual Redesign Plan

### Background & Environment

Replace the dark naval aesthetic with a warm, cartoonish mansion interior that celebrates the original's bright style. The background wall color should be a warm off-white `#f5f0e0` with a subtle vintage wallpaper pattern — tiny repeating diamond shapes in `#e8e0cc` (barely visible). Each floor platform should be a rich dark wood plank color `#5a3010` with visible wood grain lines (horizontal stripes at `#4a2808` every 3px) and a bright floor surface `#c8924a` on top (the actual walking surface).

Add interior details visible through windows: night sky `#0a0a28` with stars, suggesting this is a nighttime heist. Curtains at window positions: red velvet `#883322`.

Floor number indicators: small number plates `#c8a040` on the left wall of each floor. The mansion should feel opulent and slightly absurd.

Door frames: rich `#7a4a18` wood color with a golden knob `#ffc030`.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary (Mappy) | Police blue | `#3388ff` |
| Mappy badge | Gold | `#ffcc22` |
| Mappy face | Peach | `#ffcc88` |
| Normal cat | Bubblegum pink | `#ff77bb` |
| Boss Goro | Bold crimson | `#ee2222` |
| Floor plank surface | Warm wood tan | `#c8924a` |
| Floor plank shadow | Rich mahogany | `#5a3010` |
| Wall | Cream ivory | `#f5f0e0` |
| Wallpaper pattern | Warm tan | `#e8dfc8` |
| Trampoline | Cherry red | `#ff2244` |
| Trampoline glow | Red bloom | `#ff4466` |
| TV item | Cyan glow | `#00eeff` |
| Computer item | Lime green | `#44ff88` |
| Painting item | Warm orange | `#ff8833` |
| Radio item | Vivid purple | `#cc44ff` |
| Safe item | Steel blue | `#6688ff` |
| Microwave blast | Searing yellow | `#ffee22` |
| Door frame | Dark walnut | `#7a4a18` |
| Background void | Night sky | `#080828` |
| Glow/bloom | Trampoline red | `#ff2244` |

### Entity Redesigns

**Mappy (player)** — Give him genuine cartoon charm. Render in layers: round head (light peach `#ffcc88`), tall police hat (blue `#3388ff` with tiny gold badge `#ffcc22`), blue uniform body with white collar band, stubby arms and legs with white gloves at extremities. His expression: dot eyes, small smile. When bouncing on a trampoline, add a "boing" squash-stretch: horizontal compression on downstrike, vertical stretch on launch. When sliding on a door, he tilts sideways with a comical expression.

**Cats (normal)** — Pink cats with almond eyes and whiskers. Render as: oval pink body `#ff77bb`, round head with two pointed ears, white whiskers (2 lines each side), large oval eyes with pupils. Their walk cycle: bodies bob up-down slightly. When chasing Mappy, their pupils dilate (larger black fill). When stunned by microwave, they spiral and shrink over 0.5s.

**Boss Goro** — 1.5x scale, crimson `#ee2222`, angrier expression (angled angry eyebrows), slightly darker cheeks. Crown or bowtie detail to suggest he's the ringleader. More aggressive movement pattern reflected in faster, more direct paths.

**Items** — Each item should be a recognizable mini-icon:
- TV: grey rectangle with antenna, cyan screen glow `#00eeff`, `setGlow('#00eeff', 0.8)`
- Computer: monitor + keyboard shape in lime `#44ff88`
- Painting: ornate frame `#aa6622` with colorful art within
- Radio: boxy with speaker grille circles in purple `#cc44ff`
- Safe: steel-grey with dial, blue `#6688ff` highlight on dial

**Trampolines** — Give them spring coil renders: two small coil zigzags visible on either side of the trampoline platform. The surface bounces visually (compresses -3px when Mappy lands, springs +5px as he launches). Color `#ff2244` with `setGlow('#ff4466', 1.0)`.

**Microwave Blast** — A wide arc of electric yellow lines radiating horizontally from the door Mappy is near. The blast should fan out like a cone, with bright `#ffee22` central lines fading to `#ffaa00` at edges. Cats in the blast zone should briefly white-flash before being stunned.

### Particle & Effect System

- **Trampoline boing**: 4 spring particles (small dash shapes) shoot out to the sides when Mappy bounces, `#ff4466`, lifetime 0.2s.
- **Item collect**: 8 star sparks in the item's color burst outward. Score "+500" floats up in `#ffcc22`, lifetime 0.8s.
- **Microwave blast hit**: Cat turns white for 0.15s, then emits 4 small star particles in `#ffee22` and stumbles.
- **Cat catch Mappy**: Mappy flashes white, then explodes into 8 pink particles (cat color). Screen shakes 2px for 3 frames.
- **Door slam/open**: Brief flash of white at the door edge, small dust puff `#c8924a`.
- **Goro arrival**: When Goro appears, a dramatic entrance: screen flashes briefly, larger red particles `#ee2222` burst from his spawn position.
- **Level complete**: Shower of gold coins `#ffcc22` falls from top of screen, 15 particles, gravity-affected.

### UI Polish

Score at top center: large bright numerals in `#ffcc22` with a drop shadow. Floor indicator: small house icon with an arrow pointing to current floor. Lives: tiny Mappy icons (small police hat shapes) in `#3388ff`.

Between-level score screen: items collected shown as a checklist with icons, scores tallied up with a "+X" counter animation. Cartoonish font style (bold, rounded).

The cat alert meter (if Goro is approaching): a small thermometer-style red gauge that fills as danger increases.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Trampoline bounce | Boing spring | Sine 200→600 Hz fast sweep | 0.25s | Classic cartoon boing — pitch rises sharply |
| Walk footstep | Light tap | Triangle 400 Hz, short | 0.04s | Mouse paw tapping on wood |
| Door open/close | Creak | Noise 200–600 Hz, slow ramp | 0.2s | Wooden door creak |
| Door slide (Mappy hangs) | Mechanical grind | Band-pass noise 300–800 Hz | 0.1s | Smooth slide sound |
| Item collect | Bright chime | Sine 880+1760 Hz | 0.2s | Cheerful double-ping |
| Microwave fire | Electric buzz | Sawtooth 120 Hz + noise | 0.4s | Electric crackle |
| Cat stunned | Wobble | Sine 440→220 Hz tremolo | 0.5s | Cartoon dizzy sound |
| Cat catch Mappy | Cartoon bonk | Low thud + high squeak | 0.3s | 80Hz sine + 1200Hz sine together |
| Goro appears | Dramatic chord | Minor chord: 165+196+247 Hz | 0.6s | Tense, villain arrival |
| Score 1000 bonus | Ascending jingle | 4-note C-E-G-C6 | 0.4s | Standard reward jingle |
| Round complete | Fanfare | 6-note ascending major | 0.8s | Cheerful C-D-E-F-G-C |
| Life lost | Descending wah | Sine 440→110 Hz slow | 0.6s | Sad trombone style |
| Danger (Goro close) | Tension pulse | Square 220 Hz, rhythmic 3/s | loop | Increases to 5/s when very close |

### Music/Ambience

Mappy's spirit is playful and cartoonish. Generate a cheerful, bouncy chip-tune style theme using Web Audio:
- Base rhythm: square wave bass at 55 Hz, gated at 150 BPM with a walking bass pattern (root-fifth alternation)
- Melody: triangle oscillator playing the classic Mappy-inspired melody in C major, 150 BPM
- Countermelody: a second triangle an octave up, playing on off-beats

The theme should be high-energy and fun — think classic arcade game music energy. When Goro is active, shift the melody into minor and increase tempo to 170 BPM. When all cats are stunned, add a brief triumphant fill.

Between levels: a gentle version of the main theme at half tempo while scoring plays.

## Implementation Priority

**High**
- Warm wood floor texture (plank color + grain stripes)
- Trampoline spring boing sound (classic cartoonish pitch sweep)
- Mappy police hat + badge detail
- Cat whiskers + almond eye render
- Item recognize-at-a-glance icons (TV with antenna, etc.)
- Item collect chime + score float
- Trampoline bounce spring particles

**Medium**
- Trampoline visual compress/stretch animation
- Wallpaper pattern on walls
- Microwave blast arc visual (cone of electric lines)
- Cat stunned wobble sound
- Goro dramatic appearance + minor chord sound
- Level complete coin shower particles
- Danger tension pulse audio

**Low**
- Cat expression change when chasing (dilated pupils)
- Goro crown/bowtie detail
- Window view (night sky + stars)
- Floor number plates
- Curtain decorations
- Full chip-tune background music loop
- Goro-proximity music shift to minor key
