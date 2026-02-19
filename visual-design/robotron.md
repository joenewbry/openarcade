# Robotron 2084 — Visual & Sound Design

## Current Aesthetic

Black background with a faint dark blue grid (`#16213e` lines). Arena border is a very dim pink line. Player is a magenta circle with a white core. Bullets are white 4×4 squares. Grunts are red squares, Hulks are dark green double-nested squares, Brains are magenta circles with a line through them, Spheroids are pulsing octagonal outlines, Enforcers are yellow diamonds, Enforcer bullets are small yellow circles, Progs are orange pentagons. Humans are stick figures with glowing colored heads (pink Mom, teal Dad, yellow Kid). Electrodes are rotating cyan X shapes. Particles are colored squares. Lives are small magenta circles at the bottom.

## Aesthetic Assessment
**Score: 3/5**

Captures the original Robotron neon-arcade spirit with glows and saturated colors. The Spheroid octagon is genuinely clever. But the arena is static and featureless, enemies lack animation variety, and the overall composition feels sparse. The wave intro is just an overlay box.

## Visual Redesign Plan

### Background & Environment

Replace the static grid with a **scanline CRT grid** effect: horizontal slightly-lighter lines every 2px (1px fill, 1px gap) at 3% opacity, combined with the existing vertical blue grid, creating a phosphor screen illusion. Add a subtle corner vignette (dark radial gradient around the edges). The arena border becomes a bright neon pink double-line with a bloom glow, pulsing slightly on wave transitions. Add an ambient floor pattern: a subtle diagonal cross-hatch at very low opacity inside the arena only.

### Color Palette
- Primary (player): `#ff44ff`
- Background: `#000008`
- Grid lines: `#0a1020`
- Arena border: `#ff44ff`
- Glow/bloom: `#ff44ff`
- Grunt: `#ff2222`
- Hulk: `#22aa22`
- Brain: `#ee00ee`
- Spheroid: `#2266ff`
- Enforcer: `#ffdd00`
- Human accent: color per type

### Entity Redesigns

**Player:** Replace solid circle with a vector-art figure. Inner white core becomes a bright diamond shape. Draw 4 directional "wing" fins extending from the core (thin triangles pointing in cardinal directions). The fire direction indicator becomes a glowing arrow extending from the center. Movement leaves a brief afterimage trail (3 fading copies of the player shape).

**Grunt:** Instead of a plain red square, draw a menacing robot head: rectangle with two bright red "eye" rectangles and a mouth slit. Animate a walking oscillation (the body bobs up and down ±1px). On death, the square shatters into 8 spinning corner fragments.

**Hulk:** Large green robot with shoulder extensions — the outer square gets two small rect protrusions on left/right sides. The inner square is the "chest core" which pulses green. When deflecting bullets, spawn green sparks at the impact point. Shake the Hulk slightly when hit.

**Brain:** Pulsing magenta jellyfish shape — draw 3 concentric circles of decreasing size stacked vertically with slight oscillation. The "brain line" becomes 3–4 horizontal wavy lines. When converting a human, draw a pink beam connecting Brain to target human.

**Spheroid:** Improve the octagon outline with a second inner rotating octagon offset by 22.5°. Add 4 "port" dots at cardinal points that glow when about to spawn an Enforcer. Make the pulse flicker randomly between 0.4 and 1.0 alpha for an energy shield look.

**Enforcer:** Yellow diamond becomes a sleek angular fighter shape — draw additional swept-back fins (small triangles on the rear points of the diamond). Add engine exhaust sparkles trailing behind movement direction.

**Prog:** Orange pentagonal mutant human. Draw a crude stick-figure head on top of the pentagon, distinguishing it visually from regular enemies. Animate stumbling movement (irregular rotation of ±5° each frame).

**Humans:** Improve stick figures: add a colored shirt rectangle (their type color) between arms and legs. Make the head circle slightly larger. On rescue, the human emits an expanding ring of stars that matches their color before disappearing.

**Electrodes:** The rotating X becomes a proper rotating hazard sign — draw the X with bright cyan, add 4 small diamond sparks at each arm tip rotating with it. Add a warning pulse (electrode flashes brighter every 30 frames when close to player).

### Particle & Effect System

- **Enemy death:** Type-colored burst (8 fragments flying outward, each a small rotated square fading over 20 frames). Add a brief bright white flash circle (radius 20, 3 frames).
- **Human rescue:** 12 stars in the human's type color, plus a "+BONUS" score popup floating up in that color.
- **Bullet deflect (Hulk):** Small grey sparks at impact point, no damage indicator.
- **Wave start:** Arena border pulses bright 3×, then dims to normal. Wave number appears in large neon text center-screen for 60 frames.
- **Player death:** Magenta explosion with 20 fragments, the player shape spins and expands as it fades.
- **Brain beam:** Thin magenta dashed line connecting Brain to target human, pulsing.

### UI Polish

- Lives indicator: instead of circles, draw tiny player ship silhouettes (the wing-fin design) at the bottom left.
- Wave display: neon-bordered badge top-right with the wave number, pulsing on change.
- Score: large white monospace font with a faint magenta drop shadow, briefly flashes on score gain.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | OscillatorNode, square | 880 Hz, instant decay | 0.05s | Sharp zap |
| Bullet wall expire | No sound | — | — | Silent |
| Grunt death | OscillatorNode, sawtooth | 300→100 Hz sweep | 0.15s | Robotic crunch |
| Hulk deflect | White noise burst | Lowpass 600 Hz, 0.08s | 0.08s | Metal clang |
| Brain death | OscillatorNode, square | 220→440→220 Hz | 0.25s | Alien blip |
| Spheroid death | OscillatorNode, sine chord | 440+554+659 Hz | 0.3s | Energy dissipate |
| Enforcer death | OscillatorNode, triangle | 660→220 Hz | 0.2s | Zap crash |
| Electrode destroy | OscillatorNode, sine | 1047→523 Hz | 0.2s | Power down |
| Human rescue | Arpeggio up | 523→659→784 Hz, 60ms each | 0.2s | Happy chime |
| Human killed | OscillatorNode, sine | 330→165 Hz | 0.3s | Sad descend |
| Brain converts human | White noise lowpass 300 Hz | Slow fade 0.5s | 0.5s | Sinister pulse |
| Hulk pushes player | White noise 100 Hz burst | 0.2s | Thud |
| Player death | White noise all-band + 60 Hz sine | 0.6s fade | 0.6s | Explosion |
| Wave start | Three-tone fanfare | 440+660+880 Hz simultaneously | 0.5s | Alert sting |
| Score popup | OscillatorNode, sine | 880 Hz, 0.08s | 0.08s | Ping |

### Music/Ambience

A relentless minimal synthpulse: bass drone (square wave, 55 Hz, steady at low gain), overlaid with a rapidly cycling arpeggio (square wave, cycling through 5 notes of a minor pentatonic at 16th note intervals, 160 BPM). Add a hi-hat layer (filtered white noise, 8kHz, 30ms, every 8th note). On wave 5+, add a second arpeggio an octave up in counterpoint. Tempo ramps up by 5 BPM per wave, capped at 200 BPM. Mute all music on player death, resume on respawn.

## Implementation Priority
- High: Grunt robot-head design with eye rects; scanline/phosphor background; human rescue star burst; player afterimage trail; electrode warning pulse; score popup text particles
- Medium: Brain jellyfish shape with wavy lines; Spheroid double-rotating octagon; Brain→human conversion beam; wave-start arena border pulse; Enforcer fin design
- Low: Prog stumbling animation; Hulk shoulder extensions; corner vignette; synthpulse background music; enemy silhouette variety
