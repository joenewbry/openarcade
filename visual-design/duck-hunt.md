# Duck Hunt — Visual & Sound Design

## Current Aesthetic
A mouse-aim shooting gallery on a 500x500 canvas. The sky is near-black `#0a0a1e` (very dark, not the classic blue). The ground is a strip of dark green with simple semicircle bush shapes at regular intervals. Ducks are drawn with a body ellipse, wing ellipses (up or down based on `Math.sin` timer), a small colored head, and an eye dot. Four duck flight patterns: diagonal, wavy, swoop, zigzag. A crosshair cursor in coral red `#f66` tracks the mouse. On a successful shot, the duck tumbles with rotation and falls. "BANG!" text appears briefly. A combo multiplier rewards rapid shooting. The aesthetic is functional but dark and sparse — the sky has no color, the environment lacks the sunny day feeling of the original, and the dog (a beloved character!) is absent entirely.

## Aesthetic Assessment
**Score: 2/5**

The core shooting mechanic is clear and the duck flight patterns create interesting variety. However, the visual atmosphere misses everything that made Duck Hunt charming — the bright blue sky, the tall grass, the laughing dog, the orange-vested hunter. The dark near-black sky makes the game feel like a night hunt rather than a sunny afternoon. Ducks lack feather detail and the missed-duck reaction is absent entirely.

## Visual Redesign Plan

### Background & Environment
Restore and amplify the classic Duck Hunt sunny afternoon aesthetic:

**Sky**: A proper daytime sky — gradient from warm cornflower blue `#4488cc` at zenith fading to lighter pale blue `#88bbee` near the horizon. Three or four fluffy cumulus cloud shapes (rounded polygon clusters) drift slowly from right to left at 10% scroll speed. The clouds are bright white `#f8f8ff` with very slightly darker undersides `#dde8f0`.

**Horizon trees**: The background has a band of dark pine tree silhouettes — irregular triangular peaks in deep forest green `#1a4a1a` along the horizon line at around y=380. Two layers: far trees slightly lighter `#1e4e1e`, near trees darker `#124412`.

**Ground**: The bottom strip (y=400–500) is a rich emerald meadow. The grass base is `#2d6e2d` with a slightly lighter `#3a8a3a` top edge. Tall grass tufts (small vertical spikes, 3–5px wide, 6–10px tall) grow at irregular intervals along the top edge of the ground strip, gently swaying with a sine oscillation.

**Bushes**: The existing semicircle bushes become fuller multi-circle clusters — 3 overlapping circles of slightly different greens creating a naturalistic bush silhouette. Each bush has a darker shadow at the base.

**The Dog**: The hunting dog is restored as a static/animated character in the lower-left grass. Between rounds, the dog is seen nosing through the tall grass (head bobs in and out). When a duck is hit, the dog leaps up to retrieve it — a brief pop-up animation (dog head + paws rise above the grass line with the duck, then descend). When all ducks escape (missed), the famous laughing dog pose: dog rises above the grass holding its sides, shaking with laughter. Face: simple but expressive — floppy ears, white snout, black nose.

### Color Palette
- Sky top: `#4488cc`
- Sky horizon: `#88bbee`
- Cloud: `#f8f8ff`
- Cloud shadow: `#dde8f0`
- Horizon trees far: `#1e4e1e`
- Horizon trees near: `#124412`
- Grass base: `#2d6e2d`
- Grass bright: `#3a8a3a`
- Tall grass: `#44aa44`
- Bush body: `#2a6a2a`
- Bush highlight: `#3a8a3a`
- Duck body (wild): `#8a6a22`
- Duck head: `#224422`
- Duck wing: `#aa8a44`
- Duck red: `#dd4422`
- Dog fur: `#d4a060`
- Dog ear: `#b07030`
- Crosshair: `#ff4444`
- BANG text: `#ffee00`
- Score panel: `#1a3a1a`

### Entity Redesigns
**Ducks**: Proper duck silhouettes rather than ellipses:
- **Body**: An oval but with a distinct head bump at the front and a tail taper at the rear. Not a perfect ellipse — more like a fat teardrop.
- **Head**: A rounded polygon shape distinct from the body, connected by a neck narrowing.
- **Bill**: A flat orange trapezoid extending from the front of the head.
- **Wing**: A larger, more realistic wing shape — an asymmetric polygon that looks like a proper bird wing when up or down. Wing positions create a clear flap animation.
- **Color variants**: Different duck color schemes appear at higher levels — the classic mallard (green head, brown body), a bright red speed duck (rare, worth double), a black silhouette night duck (hard to see against the sky).
- **Tumbling death**: When hit, the duck tumbles with a spin — the entire sprite rotates while falling, and feathers (3–5 small brown polygons) detach and drift downward separately.

**Crosshair**: Upgraded from a simple colored cross to a proper gun-sight reticle:
- Outer ring circle with 4 short line gaps at cardinal points
- Inner dot (center)
- Four thin lines extending outward from center to ring
- Color: bright red `#ff4444` with a slight glow bloom
- On successful hit: the crosshair briefly flashes white and expands slightly before contracting.

**BANG! Text**: More dramatic — "BANG!" in large bold yellow letters with a black shadow outline, appearing at the hit location. The text briefly scales up (pop-in effect) before fading. High combos show "COMBO x2!" etc. in orange above.

**Score Panel**: Bottom strip styled as a wooden scoreboard — dark wood brown `#4a2a0a` background with brass-colored score numbers. Duck silhouettes at the bottom show how many remain in the current round.

### Particle & Effect System
- **Duck hit**: At the hit point, a burst of feathers — 6–8 small brown/white polygon fragments scatter radially and drift with gravity downward. Two or three larger feathers flutter separately with a gentle rotation.
- **Duck miss (escapes top)**: Duck grows a small speech bubble with "..." as it exits. If all ducks in the round escape, the dog pops up laughing (animated: shake side-to-side 3 times).
- **Round complete (all hit)**: Gold star burst from the score panel. "ROUND CLEAR!" text appears in bright yellow.
- **Gunshot flash**: A brief bright white circular flash appears at the crosshair position on click, then vanishes in 3 frames — muzzle flash feel.
- **Combo streak**: Hitting ducks in rapid succession without missing shows increasing combo text scaling upward: "x2" → "x3" → "x4" — each one larger and brighter.
- **Dog retrieve animation**: Dog's head, ears, and paw with the duck briefly appear above the grass line, held aloft for 1 second, then disappears — the classic retrieval.
- **Dog laugh animation**: Dog rises from grass with a full body visible — belly-laughing pose: hunched, sides-held, mouth open with teeth visible, shaking left and right 3 times before disappearing.

### UI Polish
- Round indicator: duck silhouette icons at the bottom border — grey for remaining, bright colored for already hit, darker crossed-out for missed.
- Score: large numbers on the wooden panel, styled in cream-colored paint.
- High score: a glowing golden number at top, briefly pulsing when beaten.
- Round number: "ROUND X" displayed in a rustic wooden banner style at the start of each round, dropping in from above and settling for 2 seconds.
- "GAME OVER" screen: the dog is prominent — sitting in the center, shaking its head sadly. A wooden frame border surrounds the final score.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Gunshot | White noise burst, highpass 2 kHz, sharp attack | 80ms | Crisp crack |
| Duck hit | Soft impact: noise 1 kHz + descending sine 400→200 Hz | 150ms | Satisfying thud |
| Duck flapping | Low flutter: rapid sine 300 Hz amplitude modulation 12 Hz | Continuous per duck | Wing-beat rhythm |
| Duck falling | Descending whistle: sine 600→100 Hz | 400ms | Comic fall |
| Dog laugh | Staccato square bursts: 400 Hz × 6, 80ms each | 500ms total | Taunting bark-laugh |
| Dog retrieve | Happy bark: square 600 Hz then 800 Hz | 100ms + 100ms | Retrieval yelp |
| BANG flash | Sharp click: sine 1200 Hz, 15ms | 15ms | Gun click |
| Round clear | Ascending arpeggio: sine C5 E5 G5 C6 | 300ms | Victory chime |
| Duck escape | Descending trombone: sine 440→220 Hz, sad | 400ms | Disappointment |
| Combo increment | Rising ping: sine 660 Hz + 100 Hz per combo | 60ms | Getting higher |
| Game over | Slow minor: sine A4 F4 D4, sustained | 1200ms | Defeated mood |
| Round announce | Drum roll: rapid noise bursts 30/sec | 600ms | Anticipation |

### Music/Ambience
Recreating the Duck Hunt atmosphere through ambient sound design:

1. **Outdoor ambience**: Bird songs simulated as brief triangle oscillator chirps — two alternating pitches (880 Hz and 1046 Hz) firing at random 2–5 second intervals, 50ms each. This establishes the outdoor sunny day feel.
2. **Wind**: Very low gain bandpass noise at 400 Hz with slow LFO volume modulation (0.1 Hz) — barely audible rustling.
3. **Duck Hunt theme**: A short repeating melody in C major (the classic "Duck Hunt" tune approximated) using triangle waves at 160 BPM. Plays quietly in the background. When a duck appears, volume rises slightly. Between rounds, fades to silence.
4. **Round tension**: As ducks near the escape boundary (top of screen), the ambient bird chirps stop and a slow ticking pulse begins: triangle 200 Hz at 1.5 Hz. Tension mounts.
5. **Dog laugh fanfare**: When the dog appears laughing, the background music stops entirely — all attention on the dog's taunting sound effect.
6. **Combo sustain**: Hitting 3+ ducks in rapid succession causes the background melody to temporarily increase in tempo by 20% — the music shares the excitement.

## Implementation Priority
- High: Sky blue gradient with clouds, dog character (retrieve animation + laugh animation), duck feather burst on hit, proper duck silhouette shape
- Medium: Horizon pine tree silhouette, tall grass tuft sway, crosshair reticle design, gunshot muzzle flash, round wooden scoreboard panel
- Low: Duck color variants (mallard, speed duck), cloud drift parallax, outdoor bird chirp ambience, game-over dog-sad screen
