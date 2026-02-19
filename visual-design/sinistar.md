# Sinistar — Visual & Sound Design

## Current Aesthetic

500×500 viewport on a 3000×3000 wrapping world. Deep space black background with scattered white star dots. Player ship is an orange-red vector shape (triangle + wing polygons). Sinistar is rendered as a skull: a circle outline, triangular eye sockets, jagged mouth polygon — drawn in sections that assemble as pieces are added. Workers are cyan diamond shapes. Warriors are red arrow polygons. Crystals are cyan diamonds. Sinibombs are small yellow circles. HUD: minimap (70×70) top-right, build meter bottom-right, crystal counter bottom-left. Enemy bullets are small colored circles. The overall look has good retro vector game bones but lacks visual richness.

## Aesthetic Assessment
**Score: 3/5**

The vector aesthetic is intentional and mostly works. The Sinistar skull is genuinely menacing. The world-wrap and scale give good scope. But the background is plain black with static stars, the player ship shape is too simple, the distinction between Workers and Warriors is too subtle in motion, and the HUD elements feel tacked on rather than integrated. The crystal/bomb collecting loop lacks visual feedback richness.

## Visual Redesign Plan

### Background & Environment

Transform the background into a **deep space nebula scene**. Replace uniform star dots with a multi-layer starfield: 150 tiny white dots (distant stars, 1px), 40 slightly larger white/blue-tinted dots (mid-field), and 15 bright white dots with a subtle glow (foreground stars). Behind all of this, draw a faint nebula — two overlapping large ellipses in deep purple (`#1a0030`) and dark teal (`#001020`) at very low opacity (~8%), creating a sense of cosmic depth. The nebula shapes slowly drift slightly (translate at 0.05px per frame) to feel alive.

Add **asteroid field zones** — scattered throughout the world are clusters of inert grey polygon debris (4–8 sided irregular shapes, various sizes 10–30px) that the player navigates around. These are purely decorative and add depth/scale reference.

Crystal clusters glow cyan, creating local ambient light: when the camera is near a crystal deposit area, the background subtly brightens in that region (a faint radial glow at the crystal position).

### Color Palette
- Player ship: `#ff6622`
- Player glow: `#ff4400`
- Sinistar: `#dd44ff` / skull detail `#ffffff`
- Worker: `#00ddff`
- Warrior: `#ff3333`
- Crystal: `#44ffee`
- Sinibomb: `#ffdd00`
- Nebula purple: `#1a0030`
- Nebula teal: `#001828`
- Background: `#000008`

### Entity Redesigns

**Player ship:** Expand from a basic triangle-wing shape to a proper retro vector fighter. Draw a sharper nose cone (thin isoceles triangle). Add swept delta wings (large triangles angled back). Two engine pods at the rear (small rectangles with an orange glow circle at the exhaust end). A cockpit bulge (small circle at the nose). Ship color is orange-red with a bright white edge highlight on the leading edges. When boosting/thrusting, both engine pods emit a flickering flame trail (orange-yellow cone shapes).

**Sinistar skull:** Make the skull dramatically larger and more detailed as it assembles. Start with an outline that has visible "gap" sections where missing pieces would go (draw the full skull outline in dim grey as a guide, then draw the assembled pieces in bright white/purple on top). The eyes become glowing red triangles with inner yellow pupils. The mouth jagged teeth are individually drawn triangular spikes with gaps between. Add a pulsing purple halo around the completed skull. When Sinistar is nearly complete (18+ pieces), the halo turns red and pulses faster. Sinistar's movement leaves a faint purple afterimage trail.

**Workers:** Redesign from simple diamonds to proper mining bots. Draw a hexagonal body with 4 thin arm-lines extending from the sides (suggesting a spider-like mining machine). The center glows cyan. Small cyan sparkles emit from the front as they mine. When a Worker is actively mining a crystal, draw a thin cyan laser line from Worker to crystal.

**Warriors:** Make visually distinct from Workers. Instead of simple arrows, draw an aggressive fighter silhouette: a pointed nose, angled wing cuts, and two small engine glow spots at the rear in red-orange. The color is a deep red with a brighter red hot core. When chasing the player, add a brief afterimage trail in red.

**Crystals:** Large, irregularly faceted gem shapes — instead of a diamond, draw 6–8 sided irregular polygons with multiple facet lines drawn inside. The crystal glows cyan with a pulsing glow (alpha oscillating between 0.6 and 1.0 at 1.5Hz). When a Worker mines it, the crystal shrinks progressively. When depleted, a brief crystal shatter animation (4 small diamond shards fly outward then fade).

**Sinibombs:** Change from plain yellow circles to proper bomb shapes — a small dark grey circle body with a lit fuse (a short jagged line at the top, with a tiny yellow spark at the tip). When thrown, rotate in flight. On impact, a bright white flash followed by an expanding ring.

**Enemy bullets:** Colored streaks instead of circles — draw as short (8px) bright lines oriented in the movement direction, with a glowing core and fading tail.

### Particle & Effect System

- **Thrust exhaust:** 6–8 orange particles per frame streaming from the engine pods, each a small triangle that shrinks over 10 frames.
- **Crystal mined:** Small cyan sparkle burst from the crystal as Worker chips away. Crystal piece animated flying from crystal toward Sinistar construction zone.
- **Sinibomb explosion:** Bright white flash (radius 40, 3 frames), then expanding blue-white ring, then 8 smoke puffs that drift outward and fade over 40 frames.
- **Worker destroyed:** Cyan explosion burst — 6 small hexagonal fragments fly outward spinning.
- **Warrior destroyed:** Red burst — 5 angular shard fragments.
- **Sinistar piece added:** The piece flies from the destroyed worker toward Sinistar with a glowing trail, then clicks into place with a purple flash.
- **Player hit:** Orange flash across the ship, ship blinks for 120 frames (invincibility period). Camera shakes ±6px for 20 frames.
- **Player death:** Orange-red explosion burst — 20 fragments fly outward, the ship shape expands and fades simultaneously.
- **Sinistar destroyed:** Massive white flash filling a 200px radius. Purple skull fragments (8 large chunks) fly outward spinning. Camera shakes violently for 60 frames.
- **Sinistar fully assembled:** Screen flashes red once, then Sinistar screams and the text "BEWARE I LIVE!" appears briefly.

### UI Polish

- Minimap: Redesign from a plain box to a proper tactical display — dark panel with a subtle teal border, a faint scan-line sweep animation (a brighter line rotating from center outward). Player is a bright orange blip, enemies are color-coded dots, crystals are small cyan dots. Map border has a corner bracket decoration.
- Build meter: Replace text percentage with a segmented circular gauge — a ring that fills in 20 segments (one per Sinistar piece). Each segment is a small arc, unfilled=dark, filled=glowing purple. Label "SINISTAR" in small text below.
- Crystal/bomb counters: Redesign as proper HUD icons — a small crystal icon next to the crystal count (drawn as a mini faceted gem), a bomb icon (mini circle with fuse) next to the bomb count. Both in bright white with subtle glow.
- Screen border: A subtle faint sci-fi frame — thin lines at the canvas corners forming bracket shapes (L-shapes at each corner) in dark teal, suggesting a heads-up display frame.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ship thrust | White noise + OscillatorNode sawtooth 80 Hz | Highpass 200 Hz, loop | Loop | Continuous thrust rumble |
| Ship fire | OscillatorNode, square | 880→440 Hz sweep | 0.08s | Sharp zap |
| Sinibomb throw | OscillatorNode, triangle | 300→600 Hz sweep | 0.1s | Launch whoosh |
| Sinibomb explode | White noise all-band + square 60 Hz | 0.5s decay | 0.5s | Boom |
| Crystal found | OscillatorNode, sine | 1047 Hz, 40ms | 0.04s | High ping |
| Crystal mined | OscillatorNode, sine | 784→523 Hz | 0.1s | Chip sound |
| Worker destroyed | OscillatorNode, sawtooth | 440→200 Hz | 0.15s | Enemy death |
| Warrior destroyed | OscillatorNode, sawtooth | 660→220 Hz | 0.2s | Fighter down |
| Sinistar piece added | OscillatorNode, square | 200 Hz pulse | 0.1s | Ominous click |
| Sinistar assembled | OscillatorNode, sawtooth chord | 110+165+220 Hz | 0.8s | Menacing drone sting |
| Sinistar destroyed | White noise burst + sine 880→200 Hz | 1.0s total | 1.0s | Victory explosion |
| Player hit | White noise 400 Hz lowpass | 0.2s | 0.2s | Impact thud |
| Player death | White noise all-band + 60 Hz sine | 0.7s fade | 0.7s | Explosion |
| Enemy bullet | OscillatorNode, sine | 600 Hz, 30ms | 0.03s | Tiny zap |
| Level/wave advance | Three-tone sting | 440+660+880 Hz simultaneous | 0.4s | Alert fanfare |

### Music/Ambience

A relentless space terror ambient: a deep bass drone (square wave, 27.5 Hz — lowest A), constant at very low gain 0.03, providing a subsonic menace. Overlaid with a slowly cycling atonal arpeggio (square wave, cycling through 5 dissonant notes: 220, 233, 247, 261, 220 Hz — a tight chromatic cluster — at irregular intervals of 1.2 seconds each). This creates a sense of dread and alienness. A hi-hat layer (filtered noise, 10kHz, 20ms bursts) at every quarter beat, 140 BPM. When Sinistar is partially assembled (10+ pieces), add a second bass drone one semitone up (29.1 Hz) creating a dissonant beating interference pattern. When Sinistar is fully assembled (20 pieces), switch the arpeggio to all 5 notes playing simultaneously as a chord cluster — maximum tension. Music cuts to silence on Sinistar destruction, then restarts after 2 seconds. On player death, music cuts immediately.

## Implementation Priority
- High: Multi-layer parallax starfield with nebula tints; player ship delta-wing design with engine pod glows; thrust exhaust particle stream; crystal faceted gem shape with mining laser; Sinistar skull piece-by-piece assembly with dim guide outline; sinibomb explosion blast ring
- Medium: Worker spider-mining-bot redesign; Warrior fighter silhouette; Sinistar purple halo pulsing faster at completion; minimap scan-line sweep animation; segmented circular build meter; crystal shatter particles on depletion
- Low: Asteroid field decorative debris; background nebula drift; enemy bullet streak trails; screen bracket frame HUD; space terror ambient music; Sinistar "BEWARE I LIVE!" text event
