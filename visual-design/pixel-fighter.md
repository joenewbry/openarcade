# Pixel Fighter — Visual & Sound Design

## Current Aesthetic

A 600x350 arena with a dark navy background (`#0d0d1a`), navy floor gradient (`#16213e`), and a distinct floor line at `FLOOR_Y=280`. Fighters are stick-figure style — drawn entirely with `drawLine` calls: a head circle, torso line, two arm lines, two leg lines. Player is blue (`#4488ff`), AI is red (`#ff4444`). The HUD at top shows health bars, scores, and round info in the theme color red (`#f44`). Combo text floats and fades. Screen shakes on heavy hits.

## Aesthetic Assessment
**Score: 2.5/5**

The screen shake gives impacts a visceral punch, and the combo system is mechanically interesting. But stick figures fighting in an empty box lack visual excitement. The background is a plain dark rectangle with no environmental storytelling. The fighters have zero personality — no weight, no readable body language, no art direction. Combo text is functional but not celebratory. This has the bones of a great fighting game but nothing to look at.

## Visual Redesign Plan

### Background & Environment

Transform the arena into a proper fighting stage. The background becomes a layered environment: a distant city skyline silhouette (dark shapes against a slightly lighter sky), a midground crowd silhouette (rows of dark lumpy heads), and the main arena floor. The sky gradient goes from deep midnight purple (`#0a0815`) at top to dark blue-violet (`#161030`) at the floor level.

The crowd is rendered as a dense dark mass with occasional glimpses of excited figures — when a combo lands, the crowd briefly brightens (a flash of lighter shapes) suggesting the audience reacting. The floor is a polished wooden platform — rendered with horizontal planks via subtle lighter stripe lines at 5% opacity. The stage edges have glowing neon rope borders in the theme color. Spotlights from above cast two circular pools of light on the fighter positions.

### Color Palette
- Sky top: `#0a0815`
- Sky bottom: `#161030`
- Floor: `#1a0e2a`, `#200e30`
- Floor plank highlight: `#221540`
- Stage rope: `#cc2222` (red side), `#2244cc` (blue side)
- Player (blue): `#4499ff`
- Player glow: `#88bbff`
- AI (red): `#ff4444`
- AI glow: `#ff8888`
- Health bar (full): `#22dd44`
- Health bar (low): `#ff3322`
- Crowd: `#0d0820`
- Spotlight: `#ffffff`, `#ffffee`
- Hit flash: `#ffffff`
- Combo text: `#ffdd00`, `#ff8800`
- UI frame: `#220022`, `#330033`

### Entity Redesigns

**Fighters:** Upgrade from stick figures to silhouette-style fighters with visible mass and posture. Rather than single-pixel lines, use:
- Head: filled circle with a slight highlight at upper-left for dimensionality
- Torso: filled rectangle (not a line) with width proportional to fighter stance — wider when crouching, upright when standing
- Arms: thick lines (3px) with rounded endpoints, suggesting forearms and upper arms at an elbow joint
- Legs: thick lines (3px) with a visible knee bend, feet as flat rectangles
- The stance changes body language: standing = upright torso, crouching = compressed low-center torso, jumping = legs tucked

Player colored in team blue, AI in team red. Each fighter has a subtle glow halo at low opacity matching their color. When blocking, the blocking arm gets a brief shield shimmer. When hit, the entire fighter briefly flashes white for 3 frames.

**Move animations (enhanced):**
- Jab: the arm extends quickly with a motion smear (duplicate arm position at 40% opacity slightly ahead)
- Kick: leg extends with a speed line (3 short horizontal lines extending from foot)
- Special move: a brief flare of the fighter's color before the move — a ring pulse that expands outward
- Jump kick: fighter body tilts forward; a trailing ghost image lingers for 4 frames
- Crouch punch/kick: body crouches, center of gravity visually drops

**Hit effects:** Each hit spawns a proper impact — an 8-frame comic-book style starburst at the contact point. Light hits get a small starburst (4 rays, 12px). Heavy hits get a large starburst (8 rays, 24px) plus a screen flash. Blocked hits spawn a spark shower instead of a starburst.

**Combo text:** Combo announcements become elaborate — "TRIPLE STRIKE!" in large gold letters with a brief scale-in animation (text punches in large, settles to normal size). Each combo word flickers with a hot-white glow then fades. Different combos get color-coded: Triple Strike = gold, Fury Chain = orange-red, perfect block = blue.

### Particle & Effect System

- **Hit spark:** 6 particles at impact point, bright white/yellow, radiate outward, 12-frame life, slight gravity
- **Heavy hit knockback:** 10 particles + a screen-edge white flash for 2 frames + camera shake
- **Special move activation:** Expanding ring from fighter (fighter's color, 30px radius, fades over 12 frames)
- **Blocking:** Silver spark shower — 8 small particles scatter from the blocking point, 8-frame life
- **Round win:** Confetti-like burst — 20 particles in the winner's color stream upward from the victor's position
- **Health critical:** When below 20% health, small red particles slowly drift from the low-HP fighter (1 particle per second, suggesting damage sparks)
- **Crowd reaction:** On combo, a shimmer wave passes through the crowd silhouette — the crowd briefly lightens for 8 frames
- **Spotlight shimmer:** The spotlight circles have a very slow flickering at 0.1Hz — subtle but adds life

### UI Polish

Health bars become dramatic — wide gradient bars that start green and shift to orange then red as HP drops. The bar has a visible white highlight stripe along the top edge. When a bar drops rapidly, a "lag" bar (gray) trails behind the actual HP bar for 30 frames, then catches up — showing dramatic the hit was. Fighter names displayed in bold condensed font above each bar. Round indicators (round 1, 2, 3) shown as gemstone icons that fill in when won. The center timer is a large countdown with a dramatic red pulsing border when under 10 seconds.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jab hit | Sharp smack | Noise burst + 400Hz click, fast decay | 80ms | Light, snappy impact |
| Kick hit | Heavier thud | Noise + 200Hz sine, medium decay | 120ms | More bass than jab |
| Special move hit | Power smash | Noise + 100Hz sine + reverb-style echo | 250ms | Dramatic, weighty |
| Block | Metal clang | Square 800Hz + noise, sharp | 60ms | Metallic ring |
| Miss/whiff | Whoosh | Filtered noise, bandpass 600Hz, fast decay | 100ms | Air cut, no impact |
| Jump | Light thud | Sine 150Hz, very fast decay | 50ms | Foot leaving ground |
| Land | Impact thud | Noise + 200Hz, landing weight | 100ms | Heavier than jump |
| Combo activate | Rising power chord | Sawtooth 220Hz + 330Hz + 440Hz, fast attack | 200ms | Harmonic excitement build |
| Round start | Bell ding | Sine 880Hz + 660Hz, slow decay | 800ms | Fight bell |
| Round end | Bell toll | Sine 440Hz, long decay, heavy | 1s | Heavy toll, fight over |
| KO | Dramatic crash | Noise burst + descending 400→50Hz + silence | 1.5s | Climactic knockout |
| Crowd cheer (on combo) | Filtered crowd noise | Wide noise, bandpass 300–2000Hz, swell | 600ms | Audience reacts |

### Music/Ambience

An energetic electronic fighting game soundtrack: a driving 4/4 beat at 130 BPM using synthesized drums (bass kick: sine 60Hz burst, snare: noise burst, hi-hat: high noise bursts). A primary sawtooth synth melody in a minor pentatonic scale plays over the beat — intense and aggressive. A secondary arpeggiated counter-melody adds motion. During the final round or low-health moments, the music gets a slight pitch increase (+3 semitones) and tempo bump (+10 BPM). Between rounds, the music drops to a brief bass drone. Volume at ~30% behind effects.

## Implementation Priority
- High: Fighter body mass (filled torso/thick limbs), hit starburst impact effects, health bar gradient with lag-bar, screen shake calibration
- Medium: Arena background with crowd silhouette and city skyline, spotlight circles, combo text scale-in animation, blocking spark shower
- Low: Crowd reaction shimmer on combos, health critical particle bleed, spotlight flicker, background music with tempo variation
