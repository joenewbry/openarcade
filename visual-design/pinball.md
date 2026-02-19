# Pinball — Visual & Sound Design

## Current Aesthetic

A narrow 350px pinball table with a dark navy background (`#0a0a18`). Bumpers are colored circles (red, green, blue, magenta, orange) with glow rings and center dots. Drop targets are gold rectangles. Rollovers are horizontal lines with triangle arrows. Flippers are gold lines with glow. The ball is a light gray circle with a highlight and gold bloom. Slingshot triangles fill in gold when hit. Launch power bar shows as a vertical colored strip. Bonus text floats upward and fades.

## Aesthetic Assessment
**Score: 3.5/5**

One of the better-looking games — the gold color scheme is cohesive, bumpers have a nice three-state visual (dark/glowing/exploding), and the physical simulation gives it inherent dynamism. But the table looks like a wireframe mockup rather than a real pinball machine. The background is empty — a real machine has intricate art filling every inch. Rails look skeletal, the drain area is just a dark rectangle, and there's no sense of depth or manufactured material.

## Visual Redesign Plan

### Background & Environment

Transform the table into a proper vintage pinball machine aesthetic. The background gets a rich dark purple-to-black gradient suggesting painted machine art. Add ornamental art elements filling the space: geometric Art Deco patterns in the upper corners at ~10% opacity, constellation lines connecting the bumpers, thin decorative border scrollwork on the side rails. The side gutters should look like polished chrome rails — rendered as slightly lighter strips with a specular highlight line.

The launcher lane gets a ruler-like measurement pattern for the power indicator. The table border (walls) should render as thick chrome/steel rails with a 3D bevel — a bright highlight edge on the top and a darker shadow on the bottom.

### Color Palette
- Primary (flippers, ball accent): `#ffcc44`
- Bumper red: `#ff2244`
- Bumper green: `#22dd44`
- Bumper blue: `#4488ff`
- Bumper magenta: `#dd44ff`
- Bumper orange: `#ff8833`
- Background: `#08041a`, `#140a30`
- Rails: `#444466`
- Rail highlight: `#8888aa`
- Ball: `#e8e8f0`
- Glow/bloom: `#ffcc44`, `#ffffff`

### Entity Redesigns

**Ball:** The ball becomes a polished steel sphere with visible 3D shading — bright specular highlight at upper-left, gradient from light gray to dark gray, and a dark shadow at lower-right. As it moves fast, a glowing motion trail (3 ghost positions) shows. A lens-flare-style cross highlight at peak speed.

**Bumpers:** Each bumper gets a concentric ring design — outer ring is the bumper color, middle ring is darker, inner dot is bright white. A small text label shows the point value inside. When hit: the entire bumper flashes bright white, then pulses back to its color over 8 frames, with a starburst particle explosion of 8 rays.

**Flippers:** The flippers should look mechanical — thicker (10px) with a beveled edge (lighter top, darker bottom), pivot anchor circles at the hinge point, and a slight rubber texture pattern (diagonal micro-dashes). They glow gold when activated and have a momentum smear on rapid movement.

**Drop targets:** Each target becomes a solid 3D block — visible face with a bright stripe in the middle, and when hit, animates "falling" by sliding down 6px and rotating slightly, then disappearing.

**Rollovers:** The lane markers become proper inlay lights — bright diamonds set into the table surface. When activated, they glow intensely with a small burst ring.

**Slingshots:** The triangle slingshots get proper kicker visuals — rubbery band texture on the active edge, bright flash on trigger.

**Spinner:** The spinner becomes a visible metallic bar that visibly blurs at high speed, with a faint whoosh trail.

**Launcher:** The launch area becomes a proper spring-loaded plunger — circular plunger tip, coil spring visual below, chrome casing.

### Particle & Effect System

- **Bumper hit:** 8-ray starburst + 4 outward particles in bumper color, life 15 frames
- **Slingshot hit:** Elastic snap — 3 particles launch perpendicular to the slingshot face
- **Drain ball:** 6 spark particles fall off screen with the ball
- **Multiball activation:** Dramatic flash of the entire table — all bumpers light simultaneously, then cascade
- **Drop target bank complete:** Sequential flash across all 3 targets + rising text "BANK CLEAR!"
- **Tilt:** Red warning particles scatter from ball + screen gets a red vignette overlay
- **EXTREME MULTIBALL text:** Large pulsing magenta text with orbiting stars

### UI Polish

Score shown at top in a proper seven-segment LED display style font (approximated with thick pixel characters). Ball count as ball silhouettes in a row. Multiplier shown as a spinning badge. Bonus text becomes more elaborate — different colors for different types of points, and larger/more dramatic for milestones.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Bumper hit | Sharp knock | Square wave 400Hz + noise click | 100ms | Classic bumper pop |
| Flipper activate | Thwack | Noise burst + 300Hz thump | 80ms | Mechanical impact feel |
| Ball launch | Spring release | Descending noise 2kHz→200Hz | 300ms | Spring tension sound |
| Slingshot | Elastic snap | Sharp noise burst 1.5kHz | 60ms | Snappy and distinct |
| Drop target | Click-drop | 600Hz square click | 100ms | Plastic target sound |
| Rollover activate | Bell ding | Sine 880Hz | 200ms | Light and rewarding |
| Spinner (spinning) | Whirring | Noise filtered at speed, 300–1000Hz | Looping | Pitch tied to spinSpeed |
| Ball in drain | Drain whoosh | Descending noise sweep | 400ms | Ominous sound |
| Multiball activated | Fanfare | C-E-G-C arpeggio ascending | 600ms | Triumphant |
| Tilt | TILT warning | Descending buzz 200Hz | 500ms | Alarming and distinct |
| Score milestone | Celebration | Random ascending glissando | 400ms | Every 10,000 points |
| Bonus text popup | Soft chime | Sine 700Hz | 100ms | Light tap sound |

### Music/Ambience

A classic arcade pinball soundtrack: repeating 4-bar melody in a catchy minor key, built from square waves and triangle waves. BPM 120. The melody accelerates subtly as the ball speed increases (or multiplier increases). Between balls, a brief musical "stinger" plays. Tilt silences music for 2 seconds.

## Implementation Priority
- High: Ball 3D sphere shading with trail, bumper starburst particles, flipper thicker bevel design, bumper hit sound
- Medium: Table background art decoration, rail chrome effect, drop target "fall" animation, launcher plunger visual
- Low: Spinner blur trail, rollover inlay lights, score LED font style, background music with speed variation
