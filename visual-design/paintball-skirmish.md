# Paintball Skirmish — Visual & Sound Design

## Current Aesthetic

Dark green field (`#1a2a1a`) with subtle grid lines. Players are color-coded circles (blue team `#44aaff`, red team `#ff5555`) with white outlines and a gun barrel line. Cover objects — bunkers, walls, trees, barrels, sandbags — are rendered in muted earth tones. Bullets are small colored circles with a half-step trail. Paint splats accumulate on the ground as persistent colored circles. Spawn zones are subtly tinted. Ammo pickups pulse yellow.

## Aesthetic Assessment
**Score: 2/5**

Functional but visually bland. The field reads as a plain dark rectangle with shapes on it. Cover lacks personality. Players are featureless circles. Bullets are too small to read clearly in motion. Splats are a great mechanic but render too flat. No dynamic lighting, no impact feel, no environmental charm. The military-casual paintball premise has huge potential that goes untapped.

## Visual Redesign Plan

### Background & Environment

The playing field should look like a proper paintball arena: a bright artificial turf green (`#1a3a18`) with subtle grass texture streaks (thin darker lines at slight angles, ~8% opacity, dense coverage). The center dividing line becomes a bold white dashed line with team-colored subtle half-tints on each side. Boundary walls should be solid and thick, rendered with a slight 3D top-face highlight. The spawn zones get a stronger team-color vignette that fades quickly toward center.

Add ambient splatter marks as background decoration — pre-placed faint old-paint marks that give the arena a "used" feel. Shadows under all cover objects.

### Color Palette
- Primary (blue team): `#00aaff`
- Primary (red team): `#ff3333`
- Field base: `#1a3a18`
- Field accent: `#163014`
- Spawn blue tint: `#002244`
- Spawn red tint: `#440000`
- Cover: `#5a5a5a`, `#7a6a4a`, `#3a6a3a`
- Ammo pickup: `#ffee00`
- Glow/bloom: `#ffffff`

### Entity Redesigns

**Players:** Replace circles with a proper top-down figure: an oval torso with a slightly smaller head circle on one end, and the gun as a rectangular barrel extending from the body toward the aim direction. A goggle/visor stripe across the head in a contrasting color. Team color fills the torso; a dark outline gives crisp separation. Crouching reduces the figure height by ~30% and widens the torso slightly. Dead players leave a full-body paint splatter outline on the ground.

**Cover objects:**
- Bunkers: Concrete gray (`#707070`) with darker mortar lines drawn as horizontal stripes, a slight top-edge highlight in `#909090`
- Sandbags: Warm tan with visible sack seams, gentle bulging outline
- Trees: Dark canopy circle with visible light-and-shadow split (darker lower-left, lighter upper-right), brown trunk showing beneath
- Barrels: Steel-drum style — circular with two horizontal band rings, a lid ring, slight reflective highlight
- Walls: Brick texture via repeating small rectangles in alternating offset rows

**Bullets:** Elongated ovals (2:1 ratio) rather than circles, with a 3-pixel glowing trail extending back 8px. At impact on cover, a star-burst impact flash (6 rays, 8px each, fade in 3 frames). In air, bullets cast a tiny moving shadow on the ground.

**Splats:** The paint splats become more organic — irregular polygons generated at impact time using ~8 points jittered around a center, with 2–3 satellite blobs nearby. Splat color has higher saturation than bullet color. Old splats fade very slowly over ~300 frames, making the arena tell a story.

**Ammo pickups:** A rectangular ammo magazine shape with stacked bullet icons, yellow glow, slowly rotating.

### Particle & Effect System

- **Bullet impact on cover:** 4 paint droplets launch at random angles, each a teardrop shape, land 10–30px away and become mini splats
- **Player hit/elimination:** Large paint burst — 12 droplets of team color, larger radius, plus the player body becomes a splat outline
- **Reload:** Progress bar fills with team color; at completion, brief flash of bright white
- **Muzzle flash:** 3-frame starburst at gun barrel tip, yellow-white center, team-colored outer rays
- **Bullet trail:** Continuous fading trail of 3 ghost positions
- **Crouch activation:** Small dust puff particles, 4 gray particles scatter from feet

### UI Polish

HUD panel (bottom-left) gets a frosted dark background with a colored border matching team color. Ammo bar uses team color fill. Crosshair becomes a clean circle with 4 gap lines and a center dot; the gap scales with accuracy (wider when moving, tighter when crouched). Round message banners slide in from top with colored background.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Shoot | Noise burst + click | Filtered white noise, highpass 2kHz, fast decay | 80ms | Satisfying pop, not too loud |
| Bullet impact on cover | Dull thud | Low noise burst, lowpass 800Hz | 60ms | Muffled splat sound |
| Player hit/eliminated | Splat + yelp | Noise burst + descending sine 400→200Hz | 200ms | Distinct from cover impact |
| Reload complete | Mechanical click | Square wave click at 1200Hz | 40ms | Crisp and satisfying |
| Ammo pickup | Rising chime | Sine wave 600→900Hz sweep | 150ms | Clear reward sound |
| Low ammo warning | Rapid beeps | 800Hz sine, 3 pulses, 100ms apart | 300ms | Triggers below 10 ammo |
| Round end (win) | Ascending fanfare | C-E-G arpeggio, sine, 3 notes | 600ms | Bright and triumphant |
| Round end (loss) | Descending | G-E-C descent, minor, triangle wave | 600ms | Deflated feel |

### Music/Ambience

No looping music — this game benefits from ambient tension. A very faint crowd/wind ambience at 2% volume keeps the space from feeling dead. Between rounds, a brief 2-second rhythmic percussion pattern (kick + snare pattern via noise bursts) signals the round transition.

## Implementation Priority
- High: Organic paint splats, player body redesign with gun arm, muzzle flash particles, shoot sound
- Medium: Cover texture details (brick, sandbags), bullet elongation and trail, ammo pickup redesign
- Low: Field grass texture, ambient ambience, background pre-placed splatter marks, old-splat fade
