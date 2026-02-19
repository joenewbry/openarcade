# Boxing Ring — Visual & Sound Design

## Current Aesthetic
A boxing game viewed from the side in a simple arena. The ring is drawn as: a perspective trapezoid floor in dark maroon (`#2a1a1a`), a center ellipse ring mark, three red ropes in descending opacity using quadratic bezier curves, and black corner posts with grey turnbuckle squares. The fighters are detailed articulated stick figures: ellipse torso, circle head, headband arc, arms/legs as lines, circle gloves. Player is blue/cyan colored, AI is red. Hit flashes overlay a white ellipse over the fighter. Particles are small colored circles for blood/sweat. Combat log appears as white text in the center. HP/Stamina bars at the top. The background is plain dark navy.

## Aesthetic Assessment
The ring construction is commendably detailed — the perspective ropes, corner posts, and ellipse mat center are convincing. The fighter articulation is impressive with per-punch pose calculations. However the background (plain dark navy) and ring floor (dark maroon) feel flat and empty. The audience is absent. There's no atmosphere, lighting drama, or spectacle. The combat log as plain text is hard to read during action. The fighters need more visual punch (pun intended).
**Score: 3/5**

## Visual Redesign Plan

### Background & Environment
Transform the arena into a proper boxing venue. Behind the ring:

**Audience:** A packed crowd represented as 3-4 rows of simple silhouetted shapes (small circles for heads, rectangles for bodies) in varying dark colors (`#1a1015`, `#1e1220`, `#161020`) — hundreds of them packed tightly, creating the visual density of a crowd without expensive individual rendering. During exciting moments (KO, counter punch), the crowd "reacts" — all silhouettes briefly offset vertically by 5px for 8 frames (crowd jumps up).

**Arena lights:** Two large circular light beams emanating from top-left and top-right of the canvas, converging on the ring center. These are radial gradients (filled using circular poly approximations) from white-at-center to transparent-at-edge, at 10% opacity. They create a spotlight effect on the ring.

**Ring floor:** Instead of plain dark maroon, a wooden canvas texture: medium brown (`#6b4020`) with faint horizontal grain lines (every 4px a 1px line 10% darker). Corner areas show the red/blue corner markings. Blood stains accumulate on the canvas as the fight progresses (small dark red splats that persist).

**Ropes:** Three ropes now have proper color: top rope red (`#cc2211`), middle rope blue (`#2244cc`), bottom rope red (`#cc2211`). Each rope has a subtle highlight line (1px lighter at top) to suggest a cylindrical cord.

### Color Palette
- Player corner: `#2266ff`
- Player glove/accent: `#44aaff`
- AI corner: `#ff2222`
- AI glove/accent: `#ff6644`
- Ring canvas: `#6b4020`
- Ring grain: `#5a3515`
- Crowd: `#1a1015`, `#1e1220`
- Spotlight: `#ffffff` (10% alpha)
- Rope red: `#cc2211`
- Rope blue: `#2244cc`
- Impact flash: `#ffffff`
- Background: `#080610`

### Entity Redesigns
**Fighters:** The articulation system is excellent and stays. Enhance rendering:
- Torso: ellipse gets a slight color gradient — brighter at top (receiving spotlight), darker at bottom — achieved by drawing two overlapping ellipses
- Gloves: add a visible seam line across each glove (a thin dark arc) and a brighter specular dot at the impact face
- Skin tone: more realistic — warm tan (`#d4956a`) for player, cooler (#d48a6a) for AI
- Shoes: redesigned as proper boxing boots — a white ankle-height rectangle topped with a darker sole
- Headband: a 3px solid band with the fighter's corner color
- During uppercut/hook extension: the punching arm gets a faint motion trail (3 arm positions at decreasing alpha)

**Hit flash:** Instead of a plain white ellipse, use a full-color impact star: bright yellow flash circle at the point of impact, with 6-8 radiating lines (like a classic comic book impact). The flash lasts 4 frames and scales from 0 to full size in 2 frames (expand) then fades.

**Sweat particles:** On hard hits, 3-5 sweat drops (small white teardrop shapes — a filled circle with a 2px trailing triangle) fly outward from the point of impact, arcing with gravity.

### Particle & Effect System
**Normal hit:** 4-6 sweat/impact particles (white or skin-color) burst from the impact point, arcing with gravity.

**Counter punch (x1.3 damage):** A golden star burst: 8 radiating lines in gold/yellow from the impact, lasting 8 frames. The word "COUNTER!" appears briefly in gold above the target fighter (rising, fading, 0.8s).

**Blocked hit:** Yellow sparks: 4 small yellow particles burst from the glove/guard area. A metallic ring flash on the guard.

**Dodge:** The dodging fighter leaves a blue afterimage (faint fighter outline at previous position, fading over 6 frames).

**KO (fighter goes down):** Screen flash white 0.4 alpha for 4 frames. Crowd silhouettes jump. A large "KO!" text slams into the center of the screen with a scale animation (from 200% to 100% over 6 frames) in bright red. Stars orbit the downed fighter's head (3 small yellow stars circling at 2-second intervals).

**Stagger:** The staggered fighter emits 3 cartoon stars that orbit briefly.

**Blood stain accumulation:** On each hard hit, a small dark red ellipse (3-8px) is drawn onto a persistent "canvas blood layer" that remains for the rest of the match.

### UI Polish
HP bars redesigned: player bar fills from left, AI bar fills from right — they mirror each other like a fighting game health display. The bars use a gradient fill (bright color at the front edge, darker at the back). When health drops below 30%, the bar turns red and pulses. Stamina bars below HP are yellow/orange. A thin separator line divides the canvas horizontally at the top HUD zone with a subtle background. Round number: large centered display between the two fighters' name tags.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jab | Sharp snap | Noise burst 0.03s + 400Hz click | 0.12s | Quick light contact |
| Hook | Solid thud | Noise burst 0.06s + 200Hz thud | 0.2s | Heavier body shot |
| Uppercut | Heavy slam | Noise burst 0.1s + 100Hz boom | 0.3s | Powerful upward blow |
| Block | Hard block | 600Hz square pulse + muted noise | 0.15s | Glove-to-glove impact |
| Dodge whoosh | Air move | White noise 400→2000Hz sweep | 0.15s | Quick evasion sound |
| Counter hit | Extra crack | All hit sounds + bonus ring | 0.3s | More impact than normal |
| KO | Big boom | All layers: boom + crowd roar simulation | 1.0s | Climactic impact |
| Crowd reaction | Roar sim | Filtered pink noise, swell 0.5s | 0.5s | Crowd going wild |
| Bell (round end) | Bell ring | 880Hz sine + overtones, slow decay | 2.0s | Boxing bell character |
| Low health | Heartbeat | 60Hz sine, double-beat pattern | continuous | Tense health warning |

### Music/Ambience
A boxing arena ambience: constant low crowd murmur (filtered pink noise at 0.02 amplitude, barely audible). Before rounds, a 4-beat count-in on a high hat (filtered noise, 0.05s, at 120 BPM). During rounds, no music — pure crowd ambience rises and falls based on action intensity. After KO or big moments, the crowd roar simulation plays (1-second noise swell). The gym-like quiet between flurries makes each punch land harder.

## Implementation Priority
- High: KO star-orbit effect + screen flash, counter punch gold star burst, crowd silhouette rows, comic-book impact flash
- Medium: Blood stain accumulation layer, fighter motion trail on punches, dodge afterimage effect, ring canvas grain texture
- Low: Arena spotlight beams, crowd jump reaction on KO, stars-orbiting-head on stagger, colored rope segments
