# Snow Bros — Visual & Sound Design

## Current Aesthetic

480x560 arcade platformer. Background is black with a tiny scatter of near-invisible white snowflake squares. Platforms are dark `#16213e` slabs with a faint cyan snow dusting on top. The player is a cute snowman (two white circles with hat and carrot nose). Enemies are color-coded blobs (basic=red, fast=yellow, tough=orange) with simple circle/polygon shapes and cartoon eyes. Snowballs project as white circles with trails. Rolling balls have a turning arc texture. Explosion particles are colored squares. This is one of the better-looking games but still quite sparse.

## Aesthetic Assessment
**Score: 3.5/5**

The character designs are genuinely charming and the enemy type differentiation is clear. The main weakness is the background — pitch black is boring and cold in the wrong way. Platform presentation is stark. The snow-encased enemy snowball and cracking effect are a great idea that deserves more visual life.

## Visual Redesign Plan

### Background & Environment

Change the background from pure black to a rich deep-blue winter night sky with visible snowfall. Use two layers of falling snow:
1. Background layer: ~60 small white dots at 6-8% opacity drifting slowly
2. Foreground layer: ~20 slightly larger flakes at 15% opacity drifting faster

Add a subtle layered backdrop: at the very top, a suggestion of a dark winter cityscape silhouette (simple flat rectangles) at 8% opacity. The whole background should shift very slightly in hue as levels progress — level 1 is deep blue, later levels shift cooler/more purple.

Between platform tiers, add faint horizontal light gradients — as if moonlight filters in from a high window.

### Color Palette
- Primary: `#66ffee` (player hat, snow glow, UI accents)
- Secondary: `#ffffff` (snow, player body)
- Background: `#050c1a`, `#081228`
- Platform top edge: `#1a3a5a`
- Platform body: `#0d1f3a`
- Snow sparkle: `#aaffee`
- Enemy-basic glow: `#ff4455`
- Enemy-fast glow: `#ffee00`
- Enemy-tough glow: `#ff8833`
- Glow/bloom: `#66ffee`, `#ffffff`

### Entity Redesigns

**Player (snowman):** Keep the two-circle body design; add more detail. The bottom sphere should have subtle shading arcs to sell the 3D roundness. The hat brim casts a tiny shadow. Eyes and carrot nose get warm orange highlights. Add a scarf — a thin orange or red stripe across the neck. When shooting, the snowman leans forward and a tiny puff of breath is visible.

**Snowball projectile:** A spinning disc of ice with a sparkling center — draw as a bright white circle surrounded by 4-6 tiny rotating blue-white particles. The trail should be a faint arc of ice crystals.

**Encased enemies:** The snowball that encases them should look like real packed snow — not uniform white, but slightly blue-tinted with subtle highlight bumps. The cracking effect near the end should have more dramatic cracks (3-5 crack lines radiating from center) that glow the enemy's underlying color.

**Rolling snowball:** Much larger version of the projectile design. Add a rumbling dust cloud at the contact point with the floor as it rolls. The chain-kill multiplier display should pulse and scale.

**Enemy types:**
- Basic (red blob): rounder, more jelly-like body with a slightly reflective highlight blob on top
- Fast (yellow): sharper, angular spiky silhouette befitting its speed; speed lines trail behind
- Tough (orange): square with visible "armor plate" detail lines and rivets

### Particle & Effect System

- **Enemy capture (snow hit):** Small burst of 4 ice-crystal particles around impact point
- **Snowball kick:** A satisfying "whomp" burst — 6 white particles + camera shake suggestion (brief glow flash)
- **Enemy killed by rolling ball:** Shower of color-matched particles + a small star flash
- **Player hit:** Screen flashes red at edges; player briefly turns red and bounces
- **Level clear:** Cascade of golden star particles from top of screen; score bonus text scales in with glow
- **Platform landing:** Tiny puff of snow dust at feet

### UI Polish

- Lives display: the mini snowman icons should have the same detail as the player character
- Level number displayed in large faint text as a watermark behind the action
- Combo multiplier on rolling kills displayed as a growing number with color shift from white → yellow → orange → red

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Shoot snowball | Soft whoosh + ice click | White noise hi-pass 3000 Hz + 1200 Hz sine click | 100ms | Light and airy |
| Snowball hits enemy | Ice crunch | Noise burst, 500 Hz bandpass, Q=4 | 80ms | Satisfying crunch |
| Enemy fully encased | Bell chime | 880 Hz sine, fast attack, slow decay | 400ms | Success tone |
| Kick snowball | Heavy thud | 80 Hz sine punch + brown noise | 150ms | Weight and momentum |
| Rolling ball rumble | Low continuous rumble | 40 Hz triangle, sustained while rolling | Continuous | Volume scales with speed |
| Enemy eliminated by ball | Pop + sparkle | 440 Hz square pop + 1600 Hz sine ping | 200ms | |
| Chain kill bonus | Ascending arpeggio | 440, 554, 659, 880 Hz — one note per chain | Per kill | Gets higher with chain count |
| Player hit | Low crunch + sad tone | 150 Hz sawtooth descend | 300ms | |
| Level clear | Ascending fanfare | 440→880 Hz major arpeggio + reverb | 600ms | |
| Jump | Spring boing | 400→800 Hz sine, fast | 80ms | Light bounce |

### Music/Ambience

A bright, bouncy chiptune-style melody synthesized entirely with oscillators. Use two voices: a square wave lead playing a simple 8-bar melody in a major key (around C4-C5), and a triangle wave bass following the root notes. Tempo: ~140 BPM. Every 4 bars, add a brief counter-melody run on a second square oscillator. Between levels, drop to a single ambient chime tone. The melody should loop seamlessly.

## Implementation Priority
- High: Falling snow layers, encased enemy enhanced cracking, kick particle burst, chain-kill sound arpeggio
- Medium: Player snowman detail (scarf, breath puff), rolling ball floor dust, level-clear particle cascade, chiptune music synthesis
- Low: Background city silhouette, enemy type visual redesigns, moonlight gradients, level-number watermark
