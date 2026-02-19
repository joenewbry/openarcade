# Wrestling Physics — Visual & Sound Design

## Current Aesthetic

Two ragdoll wrestlers in a physics ring. Player is blue (`#4af`), CPU is red (`#f55`). The ring has orange ropes (`#f82`, `#e72`, `#d62`), grey posts, orange turnbuckle pads, and a brown mat surface (`#6a4430`). Audience is represented by rows of dark circle+rectangle silhouettes. A subtle spotlight glow covers the arena. Screen shakes on pinfall/ring-out. Wrestlers have simple limb lines with joint circles, a skin-tone face, and a mask upper half.

## Aesthetic Assessment
**Score: 3/5**

The ragdoll physics are the star — they're genuinely fun and the visual reads adequately. But the overall presentation is flat: no crowd energy, the mat is a plain dark brown, the screen space above the ring is empty, and the wrestlers themselves lack personality. The "audience" dots are laughably minimal. Needs spectacle — this is pro wrestling!

## Visual Redesign Plan

### Background & Environment

**Arena atmosphere:** The arena should feel like a massive darkened stadium. Beyond the ring, draw the crowd as multi-row sections: 4 rows of audience silhouettes in a semi-arc above the ring. Each silhouette gets a slightly varied circular head and rectangular body, placed with slight height variation. Randomize their Y positions slightly for organic feel. A few rows: row 0 closest and lightest, rear rows progressively darker — giving depth.

**Jumbo-tron display:** A large rectangle above the ring (top quarter of canvas). Inside: the word "WRESTLING" in all-caps block letters on a dark background. When a pin happens, display animated text ("PIN FALL!" or "RING OUT!") on the jumbo-tron as a secondary dramatic callout.

**Arena lighting:** Replace the single faint spotlight with a proper multi-light setup (simulated):
- Main ring spotlight: large white/warm circle radiating from above-center, very low alpha fill, strong center-bright
- Two corner spotlights: angled cones (triangle polygons) from upper corners pointing down toward the wrestlers, very faint blue-white
- Audience backlighting: a thin bright strip along the audience row baseline in deep blue-purple

**Ring mat:** Replace the plain brown with a proper squared-circle canvas look. The mat surface rect gets a light grey-white inner border inset by 30px (the "canvas" interior). The outer ring apron is a contrasting dark red-brown. Draw the center logo: a simple star or diamond polygon in the mat's lighter color. Add a subtle grid texture to suggest canvas fabric (very light cross-hatch lines at low alpha).

**Ropes:** Enhance rope visual weight — each rope segment gains an outer glow matching its color. Add small shadow lines below each rope.

### Color Palette
- Primary (player): `#44ccff` (electric teal)
- Primary (CPU): `#ff4433` (hot red)
- Background: `#080810`
- Mat canvas: `#e8d8c8` (light cream canvas)
- Mat apron: `#6a1010` (dark red apron)
- Crowd: `#1a1a2a`, `#12121e`, `#0e0e18`
- Spotlight: `#fffaf0` (warm white)
- Rope primary: `#ff4400` (vivid orange)
- Glow/bloom: `#ff8833`, `#44ccff`

### Entity Redesigns

**Wrestler bodies:** The current limb-line approach is decent — make it more visually impactful:
- Increase limb line thickness: outline at 8px, inner color at 6px (currently 6/4)
- Torso fill: instead of a semi-transparent quad, draw a more solid filled shape with the wrestler's color at 0.85 alpha
- Boots: increase radius+2 to radius+3, add a horizontal lace line across each boot
- **Trunks (shorts):** Make them more prominent — increase the polygon size, add a thin waistband line at the top, and a center stripe (vertical line) down the trunks
- **Belt championship detail:** If score ≥ 1 (winning), draw a small gold rectangle at the waist area of that wrestler
- **Head/mask:** The mask upper half already covers the forehead — add a chin detail: a small arc or chin guard at the mask's lower edge

**Player (blue) costume theme:** Electric blue body, white trunks with blue side stripes, silver boots
**CPU (red) costume theme:** Vivid red body, black trunks with red trim, dark boots

**Grab effect:** Currently a yellow circle stroke around hands. Enhance: the grab shows an electric spark animation — 6 short random line segments radiating from each grabbing hand, changing each frame. Color alternates gold/white.

**Pin visualization:** The flat dark rectangle above the pinned wrestler becomes a large dramatic overlay: a pulsing dark background banner with the text "PIN!" in massive white letters. The 3-count numbers (1, 2, 3) should each scale-up with a distinct pop (large → shrink to normal) when they tick.

### Particle & Effect System

**Impact sparks:** When wrestlers collide (grabbing is active), spawn impact sparks — 4–6 white/gold tiny particles burst outward. Currently only grab sparks appear — extend this to any high-velocity collision.

**PINFALL! / RING OUT! text:** Currently large floating text. Enhance to use multiple layers:
1. Shadow text (offset dark version)
2. Main text (bright version in ring color)
3. Strobing: alternates bright↔slightly-dim over 4-frame period
4. Expanding ring around text: circle stroke that expands and fades

**Mat impact:** When a wrestler lands heavily (hip point near MAT_Y with high vy), spawn 6 dust particles from feet: grey-white circles that expand and fade upward.

**Screen shake:** Keep existing shake. Add a brief camera-lens-style vignette on impact: dark corners pulse slightly brighter (overlay corner polygons in `#00000030` flashing).

**Crowd reaction:** On pinfall/ring-out, the audience dots pulse — briefly turn brighter for 15 frames and then return. Some dots could flash between their dark color and a bright wave-flash.

### UI Polish

**HUD boxes:** Replace the plain semi-transparent rectangles with championship-belt-style display panels. Use a dark background with metallic gold borders (two-line borders: thin outer gold, small gap, thin inner gold). Corner bracket designs (L-shapes at each corner).

**Round/score display:** Larger, more prominent. Each point scored: the score briefly scales up and glows in the scorer's color.

**Control guide:** The key layout guide uses distinct colored boxes per key. Active keys highlight (the column shows which keys are currently depressed in a brighter color).

**Timer bar / countdown:** Add a visual clock element — a pie-chart style circle in the corner that empties over round time (if a round time limit existed). At minimum, a round-number banner drops from the top at round start.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Body impact / grab | Low thud: sine 80 Hz, sharp attack | Gain 0→1→0 over 80ms, 80 Hz | 100ms | Meaty impact |
| Hard slam (high velocity) | Sub-bass thud: sine 50 Hz + mid crack: noise burst 300-1000 Hz | Simultaneous, 50 Hz gain 0.8, noise 0.3 | 200ms | Slam sound |
| Pin count 1 / 2 / 3 | Referee voice approximation: sawtooth 200 Hz + formant filter 800 Hz | Short emphasized tone, 100ms | 120ms | Count-out tick |
| Pinfall victory | Dramatic sting: chord stab (major) + noise swell | C3+E3+G3+C4 sine, simultaneous, + noise swell | 800ms | Championship victory |
| Ring out | Crowd roar: filtered white noise 200-800 Hz, gain 0→0.5→0.3 over 800ms | Band-pass noise | 1000ms | Arena reaction |
| Rope bounce | Quick spring-like: sine 300→150 Hz glide over 80ms | Downward glide | 100ms | Boing effect |
| Player key press (limb active) | Very short click: triangle 1500 Hz, 20ms | Gain 0→0.3→0 | 25ms | Input feedback |
| Match start | Bell sound: sine 600 Hz, long decay, slight LFO 4 Hz | Gain 0.9→0 over 1500ms | 1500ms | Boxing bell |
| Match end (winner) | Triumphant fanfare: ascending arpeggio sawtooth + lowpass | C3→E3→G3→C4→E4, 80ms each | 400ms | Win jingle |
| Match end (loser) | Sad descending: triangle G3→E3→C3→G2 | 196→165→131→98 Hz, 100ms each | 400ms | Loss sting |
| Crowd cheer (burst) | Pink noise swell: bandpass 200-1200 Hz | Gain 0→0.25→0.1 over 600ms | 800ms | Crowd ambient swell |

### Music/Ambience

Wrestling needs crowd atmosphere. A base ambience: band-pass filtered pink noise (100–2000 Hz) at very low gain (0.06) creates constant crowd murmur. Every 25–45 seconds, a crowd swell plays: gain ramps to 0.2 over 2 seconds, holds for 1 second, ramps back — simulating the crowd reacting to an exciting move. During pinfall countdown (when pinTimer > 0), a tension drone adds: sine 60 Hz at gain 0.04 with slow LFO 0.3 Hz amplitude modulation.

Match entry music (when game starts): a brief 2-second power metal-style riff simulation — sawtooth oscillators with a repeating 4-note pattern: E2→E2→G2→A2 (82→82→98→110 Hz), 120ms per note, 2x, with a distortion node.

## Implementation Priority
- High: Ring mat canvas texture (light inner canvas with dark apron), crowd silhouette rows with more depth, wrestler trunks and boots enhancement, PINFALL text dramatic treatment
- Medium: Jumbo-tron display rectangle, grab electric sparks, mat impact dust particles, crowd cheer ambient audio, sound effects for impacts/pins/match start
- Low: Championship belt detail on winning wrestler, camera vignette on shake, arena spotlight cones, full ambient murmur loop
