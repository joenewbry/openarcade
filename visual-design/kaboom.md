# Kaboom — Visual & Sound Design

## Current Aesthetic

Arcade catching game where a bomber on a scaffold drops bombs and the player catches/deflects them with buckets. Bomber character: white face `#e0e0e0`, dark hat `#333`, red eyes and grin `#f06`. Bombs are dark circles `#333` with a fuse line and animated glowing spark `#fa0`. Buckets are trapezoid shapes in graduated reds `#f06`, `#d05`, `#b04`. Explosions are simple expanding circles with glow. Background is minimal — a ground line in `#0f3460`, otherwise the dark engine default. The aesthetic is minimal to the point of feeling unfinished.

## Aesthetic Assessment

**Score: 1.5/5**

The bomber design is memorable (sinister clown face with red eyes and grin) but the rest of the visual environment is nearly empty. There is no background, no stage decoration, no sense of place. Buckets are flat trapezoids. The explosion is a basic circle. The game has enormous potential for a chaotic carnival/street danger aesthetic that isn't being used at all.

## Visual Redesign Plan

### Background & Environment

Transform the empty background into a bombed-out city-street or carnival scaffold scene:

- **Sky:** Dark night sky gradient `#080818` → `#0f0f28`. Stars `rgba(200,180,255,0.4)` scattered — a late-night city.
- **Building silhouettes:** 3–4 dark rectangular building outlines `#0a0a16` with a few lit windows `rgba(255,220,100,0.2)` — simple block shapes, decorative only, lower third of screen behind game action
- **Scaffold structure:** The bomber stands on a wooden scaffold. Draw this: two vertical poles `#443322` at left edge and slightly right, horizontal crossbeam at top, rope or chain detail `#332211`. This grounds the bomber visually rather than leaving him floating.
- **Ground plane:** Instead of a simple line, draw a rough street surface — `#0d0d18` fill, `#1a1a30` border line, with 2–3 crack lines suggesting worn pavement
- **Stage number decoration:** Large faded number on the ground (the current wave/stage) in `rgba(255,255,255,0.04)` — purely decorative

### Color Palette

- Background sky: `#080818`
- Background buildings: `#0a0a16`
- Window glow: `rgba(255,220,100,0.2)`
- Ground: `#0d0d18`
- Scaffold wood: `#443322`
- Bomber face: `#e8e8e8`
- Bomber hat: `#222222`
- Bomber eyes/grin: `#ff0044`
- Bomb body: `#222222`
- Bomb fuse: `#886655`
- Bomb spark: `#ffaa00`
- Bucket tier 1: `#ff0044`
- Bucket tier 2: `#cc0033`
- Bucket tier 3: `#990022`
- Explosion core: `#ffffff`
- Explosion mid: `#ff6600`
- Explosion outer: `#ff2200`
- Score text: `#ffffff`

### Entity Redesigns

**Bomber:**
- Face: `#e8e8e8` circle, but more detailed — draw a proper round hat with brim, not just a flat rectangle. Hat fill `#222222`, hatband `#111111`, brim wider than crown.
- Eyes: Bright red `#ff0044` with white pupil — menacing. Eyes widen as wave number increases.
- Grin: Wide arc `#ff0044` with 4–5 white tooth marks `#ffffff` inside it
- Body: Simple dark coat `#1a1a2a` beneath face, with collar detail `#333344`
- Arm motion: Bomber's arm swings forward as each bomb is thrown
- Laugh animation: On each bomb drop, face briefly stretches (scale 1.0 → 1.05 → 1.0) in a "ha!" expression

**Bombs:**
- Body: Dark circle `#1a1a1a` with slight dark grey `#2a2a2a` highlight on upper-left (3D sphere suggestion)
- Fuse: Short curved line `#886655`, 3–4px wide, slightly wavy
- Spark: Bright yellow `#ffaa00` dot at fuse tip with 8px glow, animates (size oscillates 4–8px, color cycles `#ffaa00` → `#ffff44` → `#ff8800`)
- Fuse burn trail: As bomb falls, fuse leaves a faint `rgba(200,150,50,0.15)` dotted trail in the air
- On landing (missed catch): see explosion
- On catch: white flash at bucket + satisfying visual

**Buckets:**
- Shape: More refined trapezoid with a curved inner bottom (like real buckets)
- Tier 1 (lowest): `#ff0044` bright red with darker `#cc0033` sides and `#ff4466` rim highlight
- Tier 2: `#cc0033` mid-red
- Tier 3: `#990022` deep red with `#cc0033` rim
- Bucket set moves as a unit — when moving left/right, slight lean animation (tilt ±5°)
- On successful catch: bucket flashes bright white for 2 frames
- Metal handle detail: thin `#cc8844` arc at top of each bucket

**Explosions:**
- Layer 1 (core): white `#ffffff` expanding circle, radius 0–12px, fades over 0.2s
- Layer 2 (mid): orange `#ff6600` expanding circle, radius 0–28px, fades over 0.4s
- Layer 3 (outer): red `#ff2200` ring, 30–45px, fades over 0.5s
- Smoke cloud: 4–6 grey-brown particles `rgba(80,60,40,0.5)` drift upward from explosion, life 0.8s
- Shockwave ring: transparent ring `rgba(255,150,50,0.4)` expands outward from 0–60px, fades over 0.3s
- Screen flash: brief `rgba(255,100,50,0.2)` flash for 0.15s on large explosion (missed bucket)

### Particle & Effect System

- **Bomb fuse spark:** Animated glow at fuse tip (already exists, enhance — add 2 tiny particle trails drifting upward from spark)
- **Bomb trail:** Faint smoke dots `rgba(100,80,60,0.2)` every 4px of bomb fall distance
- **Catch flash:** Bucket flashes white 2 frames + 4 bright gold particles `#ffcc00` appear
- **Explosion:** Multi-layer + smoke + shockwave as described above
- **Missed bomb:** Screen edge pulses red `rgba(255,0,0,0.15)` briefly
- **Bucket loss:** When a bucket is destroyed, it shatters — 4 metal fragment particles `#cc4422` fly outward
- **Wave start:** Brief cascade of small white confetti `rgba(255,255,255,0.4)` particles falls from top
- **High score:** Gold particles rain down on achievement

### UI Polish

- Lives (buckets remaining): Bucket icons displayed bottom corners, team red color
- Score: Top-center, large white `#ffffff` numerals, subtle gold glow at high scores
- Wave number: "WAVE N" top-right, white text with red `#ff0044` border/shadow
- Speed indicator: Subtle text "SPEED: FAST/INSANE" below wave number as game accelerates
- Bomber laugh: Periodic animation where bomber's grin widens and a "HA HA HA" speech bubble appears briefly `rgba(255,255,255,0.8)` — purely decorative flavor
- Game over screen: Red overlay, "KABOOM!" in large letters with explosion particle animation

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Bomb drop | Short whoosh | White noise, highpass 1500Hz, gain 0.3 | 0.15s | Release sound |
| Bomb fall whistle | Descending sine | 600Hz → 200Hz, gain 0.2 | Duration of fall | Falling bomb |
| Bomb catch | Metallic clang | 800Hz triangle, gain 0.5, fast decay | 0.15s | Bucket catch |
| Bomb catch (streak) | Pitch increment | +100Hz per catch in row, max 1400Hz | 0.15s | Hot streak |
| Explosion (small) | White noise burst | lowpass 500Hz, gain 0.7 | 0.4s | Pop |
| Explosion (big) | White noise + low | lowpass 200Hz, gain 1.0 | 0.6s | Boom |
| Bucket destroyed | Metal crash | White noise, bandpass 1000Hz, gain 0.6 | 0.3s | Bucket gone |
| Wave start | Dramatic sting | 300Hz → 600Hz sawtooth, gain 0.4 | 0.5s | Wave begins |
| Score milestone | Cash chime | 880Hz + 1108Hz triangle, gain 0.5 | 0.25s | Points reward |
| Bomber laugh | Pitched noise | White noise, bandpass 500Hz, 3 quick bursts | 0.6s | Maniacal ha |
| Game over | Descending doom | 220Hz → 55Hz sine, gain 0.5 | 1.2s | Defeat sound |
| High score | Fanfare | C4-E4-G4-C5 arpeggio, sine, gain 0.5 | 0.8s | New record |

### Music/Ambience

Chaotic carnival-danger loop:
- Calliope-like lead: Triangle wave cycling through C4-E4-G4-F4-E4-D4-C4, each note 0.25s at 120BPM, gain 0.12 — faintly circus-like
- Bass: Square wave 65Hz (C2), eighth note pulse, gain 0.18
- Snare: White noise bandpass 400Hz, gain 0.3, beats 2 and 4
- Tension pad: Triangle chord cluster 110Hz/130Hz (minor 2nd interval for dissonance), gain 0.06, constant — unsettling undertone
- As wave number increases: calliope tempo increases by 5BPM per wave (to a max of 160BPM), creating escalating carnival madness
- After a bucket loss: brief dissonant chord stab (100Hz + 147Hz + 200Hz simultaneously, gain 0.3, 0.4s) — punishment sting

## Implementation Priority

- High: Multi-layer explosion system (core/mid/outer rings + smoke + screen flash), scaffold + building silhouette background, bomb fall whistle sound, catch/explosion sounds
- Medium: Bomber arm throw animation, bomber laugh animation + speech bubble, bucket lean-on-move animation, catch flash + particles, bucket destruction shard effect, calliope music loop
- Low: Fuse smoke trail, bomb 3D sphere shading, wave confetti cascade, high score gold particle rain, per-wave tempo escalation, street crack details
