# Gladiator Pit — Visual & Sound Design

## Current Aesthetic
A 500×500 canvas with a circular arena (`ARENA_R=220`) rendered on a dark `#1a1210` background. The arena floor is concentric circles in sandy `#c8a060` through `#8b6a32` browns with scattered grain dots and a patterned outer ring. Walls are a thick dark border with a highlight line. Four gladiators are colored circles: the player in `#44aaff` (blue), and three AI gladiators in red, green, and magenta. Each gladiator has a small colored indicator of their weapon type. Attack arcs are drawn as pie-slice polygons. Damage numbers float upward from hit targets. HP bars and stamina bars appear above each gladiator. Weapon names and icons are drawn as text/shapes above each fighter. Blood particles exist as red squares, spark squares for weapon hits, and dust circles for movement. The kill order and score display in the HUD.

## Aesthetic Assessment
**Score: 3/5**

The arena concept is compelling and the functional elements (HP bars, attack arcs, weapon icons, particles) are all in place. The gladiators as featureless circles, the flat sandy arena floor, and the plain dark background leave much to be desired. A full visual pass should make this feel like a colosseum spectacle — dramatic lighting, a proper arena environment, and gladiators with visual identity.

## Visual Redesign Plan

### Background & Environment
**Ancient colosseum at dusk** setting. The full 500×500 canvas beyond the arena circle shows the exterior environment:

- *Outer environment*: A warm dusk sky gradient (deep amber `#3a1a00` at top edges, darkening toward the arena center). At the edges, blurred dark stone archway silhouettes (rough rectangle groupings, `#0a0804`) suggest the colosseum's tiered exterior.

- *Crowd suggestion*: Between the stone arches, 3–4 rows of tiny 2px dots in muted warm colors (`#443322`, `#554433`) at 40% alpha represent the crowd — arranged in curved rows following the arena's circular boundary. These occasionally shift (random dot recolor once per 60 frames) to suggest crowd movement.

- *Arena floor*: The existing concentric circle floor is upgraded with additional detail:
  - Central combat zone: lightest sand color (`#d4a860`) with 6–8 darker circular arc scuff marks suggesting past battles.
  - Mid zone: medium sand with a radial grid of faint lines (like a sundial pattern, 12 radial lines at 15% alpha) and grain dots.
  - Outer ring: darker sand (`#8b6a32`) with a decorative mosaic-band polygon strip of alternating dark and light triangular notches around the circumference.
  - Blood stains: semi-permanent dark red ellipses (`#4a0808` at 50% alpha) that accumulate on the floor as fighters bleed, slowly fading over 300 frames.

- *Arena lighting*: Two large soft overhead light pools (radial gradient ellipses, `#fff8e0` at 8% alpha, 150×100px) on left and right-center of the arena, slightly off-center, casting warm highlights on the floor beneath.

- *Colosseum walls*: The thick border ring gets a stone texture: the border fill alternates between darker `#2a1808` and slightly lighter `#382010` in 20px arc segments, suggesting stone blocks. A bright highlight arc on the inner edge in warm amber `#ffcc66` at 30% alpha catches the light.

### Color Palette
- Sky outer: `#3a1a00`
- Stone silhouette: `#0a0804`
- Crowd dots: `#443322`
- Arena floor center: `#d4a860`
- Arena floor mid: `#b8924a`
- Arena floor outer: `#8b6a32`
- Blood stain: `#4a0808`
- Arena wall dark: `#2a1808`
- Arena wall light: `#382010`
- Wall highlight: `#ffcc66`
- Light pool: `#fff8e0`
- Player gladiator: `#44aaff`
- AI red gladiator: `#ff4444`
- AI green gladiator: `#44cc44`
- AI magenta gladiator: `#ff44ff`
- HP bar full: `#44cc22`
- HP bar mid: `#ddaa00`
- HP bar low: `#ff2222`
- Stamina bar: `#4488ff`
- Attack arc: per-gladiator color at 30% alpha
- Blood particle: `#cc1111`
- Spark particle: `#ffee44`
- Dust particle: `#c8a060`

### Entity Redesigns

**Gladiators** — Each fighter is upgraded from a plain circle to a top-view fighter silhouette:
- *Body*: An oval slightly wider than tall (suggested top-down torso) in the gladiator's assigned color. The oval has a 2px darker border.
- *Helmet*: A small semicircle cap at the "forward" facing direction (determined by current movement angle or last attack direction), in a slightly darker shade of the body color with a thin highlight arc.
- *Weapon hand*: A small circle (5px) positioned at arm's length in the direction of the weapon, colored by weapon type:
  - Fists: bare knuckle tan `#d4a060`
  - Sword: grey `#cccccc` with a point indicator
  - Spear: brown `#8a5a20` with a longer reach indicator line
  - Hammer: dark grey `#666666`, larger (7px)
  - Knife: silver `#aaaaaa`, small (4px)
- *Direction indicator*: A small bright crescent on the leading edge of the oval body.
- *Glow*: Each gladiator has a subtle `setGlow(color, 0.3)` matching their color — intensifying to 0.8 during an active attack window.
- *Shield*: When the gladiator has high stamina (>66%), a semi-transparent arc polygon in matching color at 20% alpha suggests a defensive posture on the opposite side from the weapon hand.

**Attack arcs** — The pie-slice attack arc gets more dramatic treatment: the arc fill pulses from 15% to 40% alpha over the attack duration, with a bright 2px arc stroke along the outer edge in the gladiator's color at full opacity. `setGlow(color, 0.6)` during the active arc.

**Weapon icons** — Weapon type visualization above each gladiator is upgraded:
- Sword: a 12px horizontal line with a small perpendicular crossguard and a pointed tip
- Spear: a longer 18px line with a triangular tip
- Hammer: a short line with a large square head
- Knife: a short diagonal line with a narrow blade shape
- Fists: two small circle dots side by side

**Floating damage numbers** — Numbers now scale in size based on damage amount (10–20 damage = 14px text, 21–40 damage = 18px text, 41+ damage = 24px text). Critical hits (highest damage values) render in gold. Numbers drift upward over 40 frames and fade.

### Particle & Effect System
- **Blood**: Red circles (3–5px) scatter from hit position with radial velocity, subject to gravity (0.06 px/frame²), lifetime 30–50 frames. On landing at the floor, they leave a 2px permanent dark splat dot that slowly fades over 300 frames.
- **Sparks**: Metal sparks (yellow `#ffee44`) scatter from sword/spear/hammer hits — 4–6 bright lines (1×4px), radial velocity, lifetime 10 frames.
- **Dust clouds**: Movement on the sand produces a slow-expanding grey circle (20–30px diameter) that fades over 20 frames beneath each moving gladiator foot. Triggered every 15 frames of movement.
- **Death explosion**: On kill, 8 blood splash circles scatter, 4 dark ragdoll fragments (6×12px dark rects) fly outward, and a brief bright flash at the death position (3-frame white at 40% alpha).
- **Crowd reaction**: On a kill, 20 tiny crowd-dot pixels near the arena edge briefly brighten and jitter (randomize position ±2px) for 15 frames — the crowd goes wild.
- **Weapon pickup/equip**: Small ring of 6 color-coded particles bursts from the gladiator when a new weapon is acquired.
- **Stamina break (blocking fails)**: 3 dark-grey shield-fragment polygons scatter from the gladiator when stamina hits zero.

### UI Polish
- HP bars are wider (30px wide, 6px tall) with a polished metal-looking border. The fill color transitions green → yellow → red by percentage. At <20% HP, the bar pulses (brightness cycles at 4 Hz).
- Stamina bars use a cool blue fill with a slight gradient highlight.
- Kill order display in the top corner: gladiator color indicators show who is winning.
- Score/round text at top center in a bold warm-gold font with a dark shadow.
- When the match ends, a golden crown icon appears above the winner's head and pulses; "VICTOR" text appears in large golden glow letters centered on the arena.
- Spectator mode: a small "SPECTATING" badge appears in the top-left after the player dies.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Sword swing | Sharp whoosh | White noise HPF 1500 Hz, fast decay | 80 ms | Blade air-cut |
| Spear thrust | Longer whoosh | White noise HPF 800 Hz, 100 ms decay | 120 ms | Heavier weapon |
| Hammer slam | Heavy thud | 60 Hz sine, 200 ms + noise burst | 250 ms | Mass impact |
| Knife slash | Quick snick | White noise HPF 2000 Hz, 40 ms | 50 ms | Fast blade |
| Fist punch | Muffled thud | 150 Hz sine, 80 ms decay + BPF noise | 100 ms | Body blow |
| Hit landed | Flesh impact | 200 Hz sine punch + BPF noise 400 Hz | 80 ms | Damage confirmed |
| Shield block | Clang | 800 Hz square, fast attack, 150 ms decay | 200 ms | Defense ring |
| Stamina break | Crack | White noise burst, 300 Hz, 50 ms | 80 ms | Guard shattered |
| Death | Collapse thud | 50 Hz sine, 400 ms + descending noise | 500 ms | Fighter down |
| Player death | Lower collapse | 40 Hz sine, 600 ms decay | 600 ms | Dramatic end |
| Crowd roar (kill) | Wide noise swell | Pink noise, LPF 800 Hz, 2 s attack, 3 s decay | 4 s | Spectator reaction |
| Match end | Fanfare | G4–B4–D5–G5 sawtooth arpeggio + reverb | 800 ms | Victor declared |
| Dodge | Air whoosh | White noise swept 1000→500 Hz | 100 ms | Quick evade |

### Music/Ambience
Epic gladiatorial ambient: a slow 80 BPM rhythm built from:
- Taiko drum hit: low 50 Hz sine with fast attack and 300 ms decay, every 2 beats.
- Snare accent: white noise BPF 800 Hz, 60 ms, on beats 2 and 4.
- Strings suggestion: two detuned triangle oscillators (±4 cents) playing a sustained minor chord with 500 ms reverb tail (simulated via short white noise convolution), swelling at 60% gain every 4 bars.
- A solo horn-like melody (square wave, LPF 600 Hz, 0.2 gain) plays a 4-note heroic phrase every 8 bars.
The music intensifies when only 2 fighters remain: tempo increases to 120 BPM, drums double in gain, and the string chord shifts to a more dissonant augmented voicing. Overall gain: 0.1.

## Implementation Priority
- High: Blood scatter and floor-splat particles, death explosion fragments, attack arc glow pulse, crowd reaction animation, all sound events
- Medium: Gladiator body/helmet/weapon-hand visual redesign, colosseum wall stone texture, arena floor scuff marks + blood stain accumulation, HP/stamina bar upgrade with color transitions
- Low: Sky dusk gradient + stone arch silhouettes, crowd dot rows at perimeter, arena floor light pools, ambient gladiatorial music, stamina break shield fragments
