# Smash Arena — Visual & Sound Design

## Current Aesthetic

600×400 canvas with a hot pink (`#f48`) theme. Four characters: Blaze (red `#f44`), Frost (blue `#48f`), Terra (green `#4a4`), Volt (yellow `#ff4`). Characters are filled polygon shapes with a circle head. A main central platform and 3 floating platforms form the stage. Items spawn mid-match: Beam Sword, Hammer, Bomb. Character HUD at the bottom shows damage percentage, stocks remaining (as colored circles), and character name. Screen shakes on big hits. A countdown timer runs at the top. Gravity is 0.55, blast zones eject characters off-screen.

## Aesthetic Assessment
**Score: 3/5**

The Smash Bros mechanics are well-implemented. The character distinction by color works. Screen shake on big hits conveys weight. However, the characters are simple polygon blobs with no personality, the stage is plain grey rectangles, the background is flat, and the hit effects are minimal. This should feel like a bombastic fighting game with dynamic visual feedback — but it's currently understated.

## Visual Redesign Plan

### Background & Environment

Create a **dramatic arena atmosphere** with a proper stage background. Behind the main platforms, draw a stylized arena backdrop: a dark gradient sky from near-black (`#060610`) at top to a deep purple-blue (`#0a0820`) at the horizon. Add a row of bright spotlight beams (tall thin triangles of slightly lighter color) rising from behind the main platform, simulating arena lighting. Far-background crowd silhouettes: a row of tiny dark human shapes along the bottom edge of the backdrop suggesting spectators.

The stage floor gets a proper surface — the main platform is a thick slab with a neon-bordered top edge (bright white top line with a glow). The platform sides show depth with a darker shade. Floating platforms are styled the same way. Under the main platform, draw faint shadow geometry.

Add stage hazard flavor: periodic environmental effects based on stage variant. Screen edges have faint directional arrows (pointing inward) near the blast zone boundaries to visually warn players they're near the edge.

### Color Palette
- Blaze: `#ff3322` (hotter red)
- Frost: `#2255ff` (electric blue)
- Terra: `#33bb33` (vivid green)
- Volt: `#ffdd00` (bright yellow)
- Stage surface: `#222236`
- Stage top edge: `#ffffff`
- Background sky: `#06060e`
- Spotlight beams: `#1a1a30`
- UI panel: `#0a0a1a`
- Theme accent: `#ff44aa`

### Entity Redesigns

**All characters:** Give each fighter a distinct recognizable silhouette beyond just color:

**Blaze:** Fire warrior aesthetic. The body polygon gets jagged flame-like edge points (add 2–3 spike protrusions at the top of the torso). The head has spiky hair drawn as triangle points. The arms are slightly larger. When standing, small flame particles drift upward from the head spikes. When attacking, fire trails trace the strike path.

**Frost:** Ice knight. Angular, crystalline body shape with sharp corner points. The head has a small crown/helmet shape drawn above it (a flat rect with 3 point protrusions). The body has a slight blue-white sheen gradient. When attacking, ice shard particles fly from strikes. Movement leaves faint ice crystal marks on the platform.

**Terra:** Earth giant. A bulky, wider body polygon — more mass suggested by horizontal width. Short, strong-looking. Round boulderish head (slightly larger circle). Dark earthy brown-green coloring. Ground attacks cause dirt puff particles. Heavy landing creates a small shockwave ring.

**Volt:** Electric speedster. A slim, tall body polygon — suggesting speed over mass. The head has a lightning bolt crest (small triangle on top). Yellow with bright electric-white highlight edges. Continuous small electric spark arcs dance around the body when idle. Dashes and attacks leave yellow lightning trail traces.

**Platforms:** Main platform gets a proper edge lip: the top surface is slightly lighter than the body, with a 2px bright top edge stroke. The sides show the slab thickness as a darker shade. Add a subtle metallic texture pattern across the face — thin diagonal hatch lines at very low opacity. Floating platforms are thinner slabs styled identically.

**Items:**
- **Beam Sword:** A proper glowing laser sword — thin bright line handle with a bright colored energy blade extending upward (the blade color alternating based on who holds it). Blade flickers in length.
- **Hammer:** Exaggerated cartoon hammer — oversized dark hammerhead with star impact marks on it, a short handle. When swung, a bright star burst emits from impact.
- **Bomb:** Classic cartoon bomb — round dark sphere with a lit fuse (jagged yellow line + spark). Fuse shortens as it approaches explosion. On explosion: white flash expanding ring + 8 fragment particles.

**Damage meter:** Each character's % display at the bottom gets a proper impact feel — at low % (0–50) it's white and calm. At medium % (50–99) it pulses amber with a subtle heartbeat animation. At high % (100+) it pulses red rapidly with a more intense shake. At 150%+ it flares bright with a constant fast pulse, visually screaming "this character is in mortal danger."

### Particle & Effect System

- **Hit (light):** Small yellow star burst at impact point. Target character briefly flashes white.
- **Hit (strong):** Larger explosion flash at impact — a bright ring expanding circle + 4–6 colored particles matching the attacker's color flying outward.
- **Critical hit (KO likely):** Full bright white flash covering the entire hit character. Camera zoom-in snap for 2 frames then quick zoom back. Slow-motion effect (half speed) for 8 frames. "SMASH!" text briefly appears in large letters.
- **KO blast:** Character tumbles off-screen tumbling and shrinking. At the blast zone edge, a bright star shape flashes (white star polygon for 10 frames). Stock circle at the bottom dims out with a flash.
- **Stock lost:** Brief portrait-size flash of the character's color at the bottom HUD position.
- **Respawn:** Character materializes with an expanding ring of their color + brief invincibility blink (character flickers for 120 frames).
- **Item spawn:** A bright glowing capsule drops from above trailing a shimmer. On landing, a ring flash.
- **Blaze fire aura:** Flame particles drift continuously upward from Blaze's head.
- **Frost ice trail:** Small blue crystal shards appear and fade on the platform where Frost stands/walks.
- **Volt electricity:** Small yellow arcs (jagged short lines) animate around Volt's body continuously.
- **Terra ground slam:** Shockwave ring radiates outward from the impact point on heavy landing.
- **Screen shake:** Already implemented — ensure it scales with hit strength (light attack = 2px for 5 frames, smash hit = 8px for 20 frames, KO = 12px for 35 frames).

### UI Polish

- Character nameplates: At the bottom, each character gets a styled panel — dark background with a 2px border in their color, their name in bold, large damage % in the center (styled and color-coded by danger level), and stock circles as small glowing dots of their color.
- Damage %: The percentage number uses a monospace bold font. At 100%+, add a "%" glyph that glows red.
- Timer: Large centered countdown at top in a white monospace font. At 30 seconds remaining, it turns amber. At 10 seconds, it turns red and pulses.
- KO feed: Brief toast notification at the top: "[Blaze] KO'd [Frost]!" slides in from the right and fades after 2 seconds, in the attacker's color.
- Win screen: A victory podium — winner character stands on a raised platform in the center. The background fills with confetti in all 4 character colors raining down. "WINNER!" in massive bright letters with the character's color glow.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Light attack hit | OscillatorNode, square | 660 Hz, 0.06s | 0.06s | Sharp punch |
| Strong attack hit | White noise + square 300 Hz | Lowpass 600 Hz, 0.15s | 0.15s | Smash impact |
| KO hit | White noise all-band + 60 Hz | 0.5s decay | 0.5s | KO explosion |
| Block/shield | OscillatorNode, sine | 880 Hz, 0.04s | 0.04s | Shield ping |
| Jump | OscillatorNode, triangle | 300→500 Hz | 0.08s | Spring up |
| Landing | White noise lowpass 400 Hz | 0.06s | 0.06s | Land thud |
| Hard landing (Terra) | White noise lowpass 200 Hz | 0.15s | 0.15s | Heavier thud |
| Dash/speed | White noise highpass 3kHz | 0.05s | 0.05s | Quick whoosh |
| Blast KO | White noise burst | Wideband, 0.3s | 0.3s | Star KO boom |
| Item spawn | OscillatorNode, sine | 1047→1319 Hz | 0.1s | Item chime |
| Beam sword swing | OscillatorNode, sine | 300 Hz continuous, 0.2s | 0.2s | Hum swing |
| Hammer swing | White noise + 80 Hz | Lowpass 300 Hz, 0.3s | 0.3s | Heavy whomp |
| Bomb explosion | White noise + square 60 Hz | 0.4s decay | 0.4s | Boom |
| Blaze flame aura | White noise highpass 2kHz | Very low gain 0.01, loop | Loop | Fire crackle |
| Volt electric spark | OscillatorNode, square | 1200 Hz, 20ms random | 0.02s | Zap crackle |
| Frost ice crack | White noise highpass 3kHz | 0.04s | 0.04s | Ice shatter |
| Stock lost | OscillatorNode, sawtooth | 220→110 Hz | 0.4s | Defeat descend |
| Game start | OscillatorNode, sine | 523→659→784→880 Hz 60ms each | 0.3s | Fight sting |
| Match win | Ascending fanfare | 523→659→784→1047→1319 Hz | 0.6s | Victory sting |
| Timer warning (10s) | OscillatorNode, sine | 440 Hz pulse | 0.1s per second | Countdown beeps |

### Music/Ambience

An intense arena battle anthem at 160 BPM. Kick: filtered noise, 55Hz lowpass, 30ms, beats 1+3. Snare: white noise 250Hz bandpass, 25ms, beats 2+4. Hi-hat: 8kHz, 15ms, every 16th note. Bass: sawtooth, 55 Hz, driving 8th-note pattern on root and fifth. Main riff: square wave oscillator playing an aggressive 4-bar rock-influenced melody (E4→G4→A4→G4→E4→D4→E4) at quarter notes. Countermelody: triangle wave at 2× the frequency playing off-beat punctuations. On critical hit moment (smash), music volume ducks for the slow-motion frames then comes back louder. Final 30 seconds: tempo ramps to 175 BPM. Final 10 seconds: add a second sawtooth bass an octave up for maximum intensity. Victory/defeat stings replace the music loop on match end.

## Implementation Priority
- High: Character element auras (Blaze flame particles, Volt sparks, Frost ice, Terra shockwave); strong hit white flash + ring burst; damage % danger coloring with pulsing; KO blast star flash; win screen confetti
- Medium: Character silhouette distinction (Blaze spikes, Frost crown, Terra bulk, Volt lightning crest); platform slab depth with lit top edge; item redesigns (beam sword glow, bomb fuse shorten); KO toast feed; slow-motion frames on critical hit
- Low: Backdrop arena spotlight beams; crowd silhouette row; blast zone edge warning arrows; timer warning beeps; battle anthem music loop with final tempo ramp
