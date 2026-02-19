# Elevator Action — Visual & Sound Design

## Current Aesthetic
A scrolling multi-floor spy building rendered in dark navy (`#0d1525`, `#16213e`). Floors are flat `#0f3460` platforms. Window panels are dim `#162240` rectangles with faint purple glow. Elevator shafts are black columns with dark rail lines. The spy player is drawn as a purple rectangle cluster (`#d6f`) with a fedora hat. Enemies are red rectangles (`#a44` or `#f44` when alerted) with yellow eyes. Red doors glow red with a pulse animation and gold "TOP SECRET" text. Player and enemy bullets are colored rects. Particles are 4x4 squares. The minimap sits in the top-right. Camera scrolls smoothly following the player.

## Aesthetic Assessment
**Score: 2.5/5**

The concept (neon spy thriller in a dark building) is strong but the pixel art is very rudimentary — character shapes are indistinct, floors are barren, and the building interior feels empty. A full art pass could make this genuinely cinematic.

## Visual Redesign Plan

### Background & Environment
The building exterior: a rain-slicked cyberpunk city skyline visible through the building's glass curtain wall, implied by a looping dark-blue background with dim window-lights of adjacent skyscrapers. The sky transitions from deep navy at top to a low orange smog glow at the horizon. Inside, each floor gets mood lighting: light cast from the windows creates small bright rectangles on the floor, and the center corridor has glowing overhead strip-lights (thin white horizontal lines with a white glow).

### Color Palette
- Primary agent: `#cc66ff` (electric violet)
- Enemy active: `#ff3344` (alert red)
- Enemy patrol: `#aa3355` (muted danger)
- Building interior: `#0a0f1e`
- Floor platform: `#0f3060`
- Floor surface highlight: `#1e4480`
- Window ambient: `#1a2a50`
- Neon trim: `#6644ff`
- Door glow: `#ff1111`
- Background city: `#050a14`
- Glow/bloom: `#cc44ff`, `#ff2244`

### Entity Redesigns

**Player (spy)** — More articulated stick-figure silhouette: trapezoidal body, distinct fedora brim (wide horizontal bar), trench-coat hem at knees (slightly wider than legs), white shirt front rectangle. Eyes are white dots; tie is a dark triangle. Running animation: two-frame leg alternation (left/right rect offset by 4px). Crouch: body compresses vertically, hat tilts. Shooting arm extends to side with a small muzzle-flash quad on fire.

**Enemies** — Distinct from player: uniform jacket (squared shoulders, no coat flare), caps instead of fedoras, red tie. Alert state: body outline flashes red with a spiky danger halo (4 short diagonal lines radiating from body center). Shooting pose: arm extended with barrel flash. Dead enemy becomes a dark heap silhouette lying horizontal.

**Elevators** — Render the elevator cage with vertical side-rails (two thin lines) and horizontal crossbar ropes. The platform itself is a slightly raised rectangle with a directional arrow rendered as a bright chevron that pulses. When the player rides, a faint cable-motion blur trails upward/downward.

**Red Doors** — More dramatic: inset door frame with a glowing seal ring around the perimeter. "TOP SECRET" renders in a stencil-style font effect (blocky, spaced letters). Opened doors become dark voids with a green "CLEARED" badge and a faint X crossing the frame.

**Elevator Shafts** — Dark with faint blue banding to suggest depth. Two vertical rail lines per shaft with small pulley circles at the shaft top.

### Particle & Effect System
- **Enemy death**: 12 red debris squares + 4 white spark lines, lifetime 20 frames, gravity 0.12.
- **Player hurt flash**: 8 magenta sparks radiate outward, player rect blinks at 3-frame interval (existing invuln timer).
- **Bullet trail**: Each player bullet leaves a 3-frame afterglow of 2px white dot.
- **Door collect**: Golden star-burst of 10 particles radiating from door, each a small 3px diamond, lifetime 30 frames.
- **Elevator whoosh**: Vertical motion-blur streaks (3 fading copies at 0.2 alpha each, offset by 8px in direction of travel).
- **Muzzle flash**: 4-frame bright white/yellow quad at gun barrel, then disappears.

### UI Polish
- Minimap redesigned: dark glass panel with a subtle blue border, floor lines as cyan dashes, player dot pulses, enemies as red dots that blink when alerted.
- HUD lives shown as small spy-silhouette icons instead of raw rectangles.
- Doc counter: each collected doc animates briefly as a small glowing card flying from door to HUD.
- Escape zone when unlocked: animated green shimmer with "ESCAPE" in pulsing stencil text, surrounding glow ring expanding and contracting.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Square wave click + noise snap | 800 Hz square, 2 kHz noise burst | 90 ms | Quick, crisp gunshot |
| Enemy shoot | Same but lower/dirtier | 500 Hz square, high-pass noise | 100 ms | Slightly different timbre |
| Bullet hit wall | Short filtered noise | White noise, LPF 600 Hz | 60 ms | Muted thud |
| Enemy killed | Noise burst + descending pitch | White noise + 400→180 Hz sweep | 300 ms | Satisfying takedown |
| Player hurt | Mid-frequency buzz | 200 Hz sawtooth, gain spike | 200 ms | Stinging impact |
| Door collect | Rising chime | C5–E5–G5 bell tones, 60 ms each | 300 ms | Triumphant micro-arpeggio |
| Elevator move | Mechanical hum | 120 Hz triangle wave, subtle LFO | Looped | Stop at floor; pitch dip on stop |
| Elevator arrive | Short ping | 880 Hz sine, fast decay | 80 ms | Arrival chime |
| Level complete | Fanfare arpeggio | F4–A4–C5–F5 sawtooth + reverb | 1 s | Spy-theme flavored |
| Game over | Falling pitch | 440→110 Hz sine over 1 s | 1000 ms | Slow downer glide |
| Alert (enemy spots player) | Staccato beeps | 1000 Hz sine, 3× repeating 100ms | 300 ms | Alarm pulse |

### Music/Ambience
A looping spy jazz-electronica ambient: bass synth ostinato (two alternating minor 7th notes, 100 BPM), over which a muted electric piano pad plays sustained chord stabs every 2 beats using triangle oscillators with slight overdrive and a 400 ms reverb tail. Volume ducks slightly when enemies are alert.

## Implementation Priority
- High: Player and enemy visual redesign (more distinct silhouettes), red door glow upgrade, enemy kill particles, bullet trail glow, all core sound events
- Medium: Background city skyline layer, floor mood lighting, elevator cage visual, muzzle flash quad, minimap redesign
- Low: Door collect card animation, elevator motion blur, ambient spy music, doc counter HUD animation
