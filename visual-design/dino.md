# Dino — Visual & Sound Design

## Current Aesthetic
A minimalist endless runner homage to Chrome's offline dinosaur game. The 600x300 canvas uses a deep purple theme (`#a4f`) against a near-black background. The dino is rendered entirely from `fillRect` blocks — a head block, body block, alternating leg blocks, and a duck pose variant. The ground is a dim purple horizontal line at y=260 with slowly scrolling grey dashes suggesting texture. Obstacles are cactus shapes (solid green `#2a8` rectangles with short arm extrusions) or pterodactyls (red `#e66` wing-up/wing-down rectangles). Star field scrolls at half speed. The score uses `fillRect`-drawn digit segments. Speed ramps from 4 to 9 over time. The aesthetic is honest and readable but visually sparse — everything is flat rectangles, the color range is just purple/green/red/grey, and there's no sense of a living world rushing past.

## Aesthetic Assessment
**Score: 2/5**

Captures the spirit of the Chrome dino in a tiny canvas, but the execution is minimal even by pixel-art standards. The purple theming is distinctive but underused — it never transforms into a real environment. The obstacles lack personality, the sky is just dots, and the dino has no expressiveness during its leap or death. The endless runner tension could be dramatically amplified.

## Visual Redesign Plan

### Background & Environment
Transform the flat run into a journey through a vibrant prehistoric twilight world:

**Sky**: A vertical gradient from deep violet `#1a0a2e` at top to warm amber-purple `#5a1a4a` at the horizon. Three layers of scrolling clouds at different speeds: far clouds at 10% scroll in pale lavender, mid clouds at 30% in warm mauve, near clouds at 60% as darker silhouettes. As speed increases, the sky darkens toward near-black — the dino is running faster than daylight.

**Ground plane**: The ground gains depth — a bright foreground strip at the bottom 8px (`#7a5aaa`) with a slightly darker mid-ground band (`#4a2a7a`) behind the run path. The running surface has fine horizontal scratch marks scrolling past at full speed. At max speed (9+), the ground streaks become motion blur — long thin lines.

**Background terrain**: Two silhouette layers scroll at 20% and 40%: distant mesas in deep purple-grey `#2a1a3a`, nearer rock formations in `#3a2a4a`. Occasionally a giant fossil half-embedded in a cliff face scrolls past in the distance.

**Star field**: Existing stars get a makeover — varying sizes (1px and 2px), slight twinkle animation (alpha oscillation at different phases per star), and a few larger stars that leave short comet trails when speed is high.

### Color Palette
- Sky top: `#1a0a2e`
- Sky horizon: `#5a1a4a`
- Cloud far: `#3a2a5a`
- Cloud near: `#5a3a6a`
- Ground surface: `#7a5aaa`
- Ground deep: `#4a2a7a`
- Dino body: `#c088ff`
- Dino shadow: `#6a3a9a`
- Cactus: `#44cc66`
- Cactus dark: `#228844`
- Pterodactyl: `#ff6688`
- Pterodactyl dark: `#cc3355`
- Score/UI: `#e0c0ff`
- Speed streak: `#ffffff` at low alpha
- Star bright: `#e8d0ff`

### Entity Redesigns
**Dino**: Upgraded from flat rectangles to a proper pixel-art silhouette. The body retains the chunky block aesthetic but gets rounded corners and a visible spinal ridge (a 2px darker line along the back). The head has a clear snout protrusion and a small white eye dot with a pixel pupil. Running animation: 4-frame leg cycle where the legs clearly alternate with forward/back positions rather than just toggling. Jumping: the dino tucks slightly at the apex — legs draw in, body contracts 2px — giving a sense of effort. Ducking: the head elongates forward, back spines flatten. Landing impact: a brief 1-frame squash (body 2px wider, 2px shorter). Death pose: the dino splays — head tilts back, legs splay outward, a small star effect bursts from the impact point.

**Cactus**: No longer flat green rectangles. Cactus gets a dark-edge outline (1px darker green on left/bottom) suggesting 3D roundness. The arms have proper joint bends — they splay outward at mid-height then point upward. Multiple cactus cluster variants: single tall, double short, triple mixed, giant with outstretched arms. At night-mode speeds, cactus gets subtle backlight glow from the purple sky.

**Pterodactyl**: More threatening wing shape — the body narrows to a beak point, wings curve in a proper wing-membrane arc rather than flat rectangles. Wing-up pose: tips curve upward. Wing-down: tips curve downward. Added a small reptilian head detail with an open beak silhouette. At high speed, afterimage ghost wings trail behind.

**Score**: The `fillRect` digit segments become glowing neon digits — each segment has a bright core color `#e0c0ff` with a soft purple glow halo.

### Particle & Effect System
- **Jump launch**: 4 small dust puffs (pale purple rectangles, 3x2px) scatter from the dino's feet as it leaves the ground.
- **Landing impact**: 6 dust particles scatter left/right from feet. At high speed, the landing spawns a brief horizontal shockwave line.
- **Cactus death**: Dino explodes into 8 purple rectangle shards that scatter radially and fade over 20 frames. A bright white flash fills the dino's outline for 2 frames.
- **Pterodactyl death**: Feather shards (elongated polygons in pterodactyl red) scatter. The dino tumbles backward.
- **Speed milestone**: Every 500 points, a brief golden ring expands from the score counter, and the sky flashes subtly lighter.
- **Night mode transition**: At 700+ points, a slow darkening overlay dims the sky further, stars intensify, and a moon crescent appears on the horizon. The cactus and pterodactyl gain edge glows.
- **Running streaks**: At speed 7+, thin horizontal white lines at 20% alpha scroll past at double ground speed, implying extreme velocity.

### UI Polish
- Score counter: large neon-segment digits top-center with a faint purple glow halo. "HI" prefix in smaller dimmer text.
- "GAME OVER" text: large chunky letters in bright `#e0c0ff` with a red-purple shadow offset, appearing with a brief downward drop animation.
- Speed indicator: a subtle thin bar at the very bottom of the screen that fills left-to-right as speed increases, color-shifting from teal to red.
- Start prompt: "PRESS SPACE" pulses with a breathing alpha effect.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jump | Triangle wave, fast attack, exponential decay | 280 Hz → 180 Hz sweep | 120ms | Light prehistoric boing |
| Land | Low thud: sine 80 Hz, hard attack + brief noise burst | 80ms | Footfall impact |
| Running step | Alternating sine blips: 200 Hz and 180 Hz | 20ms each, per stride | Subtle rhythmic footstep |
| Duck | Quick descending sine 300 → 180 Hz | 60ms | Compact whoosh |
| Cactus collision death | Crunch: noise burst 4 kHz lowpass + sine 120 Hz | 300ms | Bone-crunching hit |
| Pterodactyl collision death | Sharp squawk: triangle 600 → 200 Hz with noise | 250ms | Reptilian shriek |
| Score tick | Sine 1200 Hz, 15ms, very quiet | 15ms | Almost subliminal |
| Speed milestone | Ascending two-note: sine 660 Hz then 880 Hz | 100ms each | Achievement ding |
| Night mode begin | Eerie low tone: triangle 110 Hz, slow fade in | 600ms | Atmosphere shift |
| Game over | Descending minor: sine 440 → 330 → 220 Hz, slow | 800ms | Sad trombone shape |

### Music/Ambience
The ambience builds procedurally with speed:

1. **Base heartbeat**: Two sine pulses (55 Hz, 80ms) at 1.5-second intervals from the start — a slow prehistoric pulse.
2. **Running rhythm**: Each step triggers a barely-audible triangle blip at 200 Hz (alternating 180 Hz). These accumulate into a rhythmic texture during fast runs.
3. **Wind rise**: At speed 6+, a bandpass noise oscillator (center 800 Hz, Q=2) fades in at very low gain — the sound of rushing air. As speed increases to 9, gain doubles and pitch center shifts to 1200 Hz.
4. **Night ambient**: At night mode, a slow triangle wave drone at 82 Hz begins — deep, ominous, barely audible. Cricket-like narrow noise bursts at 4 kHz fire at random 1–2 second intervals.
5. **Tension ramp**: As the score climbs, the heartbeat interval decreases from 1.5s to 0.8s, adding urgency without becoming intrusive.

No looping music — the procedural texture from running sounds and environmental elements is enough.

## Implementation Priority
- High: Dino jump/land animation refinement (tuck at apex, squash on landing), speed streak horizontal lines, dust puff particles on jump/land, sky gradient
- Medium: Cactus 3D outline + arm bend variants, pterodactyl wing curve animation, score neon segment glow, night mode sky darkening
- Low: Background silhouette terrain scrolling, fossil cameos, moon crescent at night, comet star trails at high speed
