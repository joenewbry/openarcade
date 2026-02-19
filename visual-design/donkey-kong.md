# Donkey Kong — Visual & Sound Design

## Current Aesthetic
A classic single-screen platformer on a 480x560 canvas. The background is deep black. Six sloped platforms are drawn in brown-orange (`#e82` theme) as thick horizontal polygons with visible slope angles. Ladders are drawn as two vertical lines with horizontal rungs in a lighter orange. The player (Mario) is rendered as a stack of `fillRect` blocks: red hat, skin-toned face, red shirt, blue overalls — small but recognizable. Donkey Kong sits at the top drawn from large brown ellipses and rectangles. Barrels are brown circles rolling down the slopes. The princess stands at top-right as a small colored figure. UI shows score, high score, lives in plain text. The aesthetic captures the original structure but feels flat and monochromatic — everything is variations on orange/brown/red, the environment has no background character, and the sprites lack the chunky expressiveness of the original arcade.

## Aesthetic Assessment
**Score: 2.5/5**

Structurally faithful — the slope platforms, ladders, barrel mechanics, and sprite positions all read correctly. But the palette is narrow (mainly orange-brown-red against black), backgrounds are featureless, and sprites are boxy blocks without personality. Donkey Kong himself should be a commanding presence, not a cluster of ellipses. The construction site atmosphere of the original needs to be evoked.

## Visual Redesign Plan

### Background & Environment
Transform the black void into a dramatic construction site atmosphere:

**Background sky**: A predawn industrial sky — gradient from dark charcoal `#0d0d0d` at the very top to a warm amber-tinged dark `#1a0e08` at the horizon. Distant city silhouette: a jagged skyline of dark rectangles at different heights across the back plane, barely visible, lit from below with warm amber glows suggesting streetlights.

**Scaffold structure**: The platforms are steel construction girders — the existing sloped beams get a metalwork treatment. Each platform segment has a bolted-steel look: dark steel-blue base color `#2a3040` with lighter edge highlights `#4a5060` along the top face and a dark shadow `#1a2030` on the underside. Rivets: small bright dots at regular intervals along beams.

**Ladders**: Repainted as proper steel ladders — silver-grey `#888` side rails with brighter `#aaa` rungs. A subtle metallic sheen: the rungs have a 1px brighter top edge.

**Background girder grid**: Behind the main platforms, faint diagonal and horizontal girder lines in very dark `#1a1a1a` suggest the full construction scaffolding extending beyond the screen. This gives depth without cluttering.

**Fire barrels at bottom**: The fire hazards at the bottom level get orange glow treatment — a persistent bloom of `#ff6600` at low alpha radiates from each fire barrel.

### Color Palette
- Sky top: `#0d0d0d`
- Sky warm: `#1a0e08`
- City silhouette: `#0a0808`
- Girder base: `#2a3040`
- Girder top highlight: `#5a6070`
- Girder shadow: `#1a2030`
- Girder rivet: `#8898aa`
- Ladder rail: `#888899`
- Ladder rung: `#aabbcc`
- Mario hat/shirt: `#dd2222`
- Mario overalls: `#4444cc`
- Mario skin: `#ffcc88`
- Donkey Kong: `#8a5520`
- DK highlight: `#c08840`
- Barrel body: `#7a4a1a`
- Barrel highlight: `#c08040`
- Princess: `#ff88cc`
- Fire: `#ff6600`
- Fire glow: `#ff4400`
- Hammer: `#aa6622`

### Entity Redesigns
**Donkey Kong**: Dramatically enlarged and expressive. The body uses large rounded polygon shapes rather than simple ellipses — a proper gorilla silhouette with broad shoulders, barrel chest, and knuckle-dragging arms. Dark brown `#6a3a10` base with lighter `#9a5a20` face, hands, and belly patch. When throwing a barrel, the arm extends forward in a distinct throwing pose with the barrel visible at the tip. Between throws, DK pounds his chest with both fists (alternating fist-pound animation, 4 frames). Face has a fierce scowl — two small white eye dots with dark pupils, a wide flat nose shape, and a thin grin line. At the start of each stage, DK roars — mouth opens wide, a brief orange "ROAR!" text puff appears.

**Mario (Player)**: Upgraded proportions. Hat is a proper semicircle with brim, not just a rectangle. Face has two white dot eyes and a small moustache (3x1px dark bar below the nose). Overalls have a bib strap visible. Walking animation: 4-frame leg cycle. Climbing animation: alternating arm-grab frames. Jumping: a clear arc pose with arms up. Hammer mode: Mario holds a large hammer overhead that swings in a 180° arc — bright flash effect when it hits a barrel.

**Barrels**: Round and woody — a brown circle with two thin horizontal band lines and a curved highlight arc on the upper-left quadrant. When rolling, the barrel rotates (the band lines rotate with it). Lit barrels (fire barrels) glow orange from within, with a small flame sprite on top.

**Princess**: More expressive — a simple but clear feminine silhouette with pink dress, blonde hair blob, and arms that wave distress when DK grabs her. At rescue, she jumps and spins.

**Flames (Fireballs)**: The moving fire enemies at higher difficulty get a proper flame shape — a teardrop polygon in yellow-orange that flickers (alternating between two slightly different polygon outlines each frame).

### Particle & Effect System
- **Barrel roll sparks**: As each barrel rolls down the slope, 2–3 small orange sparks scatter behind it, fading in 6 frames.
- **Barrel break on Mario impact**: Barrel shatters into 6 wood-fragment polygons in brown, scattering radially, plus a brief bright white flash.
- **Hammer hit**: When Mario's hammer connects with a barrel: a bright orange starburst (8 lines radiating from impact), a "BONK!" text that floats upward and fades.
- **Bonus item collection**: Stars or score tokens — a golden ring flash expanding from the item, then 5 gold dots scatter upward.
- **Player death**: Mario spincycles — rapidly alternates through all 4 walking frames while shrinking from full size to 0 over 30 frames, then vanishes with a small star pop.
- **Stage complete**: Mario reaches the princess — hearts (simple 2-lobe polygon) float upward from their position. The screen flashes briefly warm gold.
- **Fire barrel ignition**: The floor fire barrels occasionally spit a small flame jet upward — 3 frames of increasing flame height, then retract.

### UI Polish
- Score and high score rendered as segmented LED-style digits — bright orange `#ff8800` with dark backing panels.
- Lives display: small Mario-head icons (red semicircle hat + tiny face).
- Stage counter: "STAGE X" with bold segmented digits.
- "HOW HIGH CAN YOU GET?" banner on the opening screen with an animated bouncing arrow.
- Level intro: platforms drop into place from above one at a time in sequence before DK and Mario appear.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Walk step | Short square pulse 200 Hz | 20ms per step | Chippy footstep |
| Jump | Sine sweep 260 → 440 Hz, fast attack | 150ms | Classic arcade hop |
| Land | Low square 120 Hz, hard attack | 40ms | Firm landing |
| Ladder climb | Alternating triangle 300 / 340 Hz | 30ms per rung | Ringing metal |
| Barrel roll | Low rumble: sine LFO 40 Hz + noise 200 Hz | Continuous, looped | Barrel approaching |
| Hammer swing | Square 600 Hz, short attack | 80ms | Whoosh |
| Hammer hit barrel | Crack: noise burst + square 400 Hz | 100ms | Satisfying crunch |
| Barrel break | Short noise burst 500 Hz + triangle 200 Hz | 150ms | Wood splitting |
| DK throw barrel | Low grunt: noise 300 Hz lowpass, quick | 200ms | Gorilla effort |
| DK chest pound | Deep thud: sine 60 Hz, pair of hits | 120ms x2 | Menacing |
| Fire enemy | Crackling: noise 800 Hz with tremolo 8 Hz | Looping | Fire hiss |
| Player death | Descending chromatic: sine 880→440→220 Hz | 600ms | Classic Donkey Kong death |
| Stage clear | Ascending arpeggio: C5 E5 G5 C6 | 80ms each | Joyful |
| Score collect | Bright ping: sine 1318 Hz, short decay | 60ms | Reward |

### Music/Ambience
The original Donkey Kong has iconic construction site music, recreated via synthesis:

1. **Walking bassline**: A repeating pattern using square oscillators — four-note descending line (C3 B2 A2 G2) at 160 BPM, each note 150ms. This gives the game's characteristic rhythm.
2. **Melody layer**: Above the bassline, a triangle wave plays the main Donkey Kong theme motif — approximated as an 8-note repeating phrase in C major. Volume is modest to avoid competing with sound effects.
3. **Climbing music variant**: When Mario is on a ladder, the tempo increases by 20% — both bassline and melody speed up, adding urgency.
4. **Intro fanfare**: Before the stage begins, a 4-note rising trumpet-like phrase (sawtooth oscillator C4 E4 G4 C5) plays once.
5. **Death music**: All ambience cuts; the descending death melody plays alone, then a 2-second silence before respawn.

## Implementation Priority
- High: Girder metalwork texture (highlight/shadow edges + rivets), DK chest-pound animation, barrel rotation sprite, Mario proper hat + moustache detail
- Medium: City skyline silhouette background, barrel roll spark trail, hammer hit starburst, player death spin-shrink
- Low: DK roar animation + text puff, princess distress wave, fire barrel glow bloom, stage-intro platform drop animation
