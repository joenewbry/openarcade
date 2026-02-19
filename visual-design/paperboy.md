# Paperboy — Visual & Sound Design

## Current Aesthetic

Dark sky zone (`#0d0d1a`) above a dark road (`#111122`) with teal road-edge glows (`#6ca`). Houses alternate between dark blue/teal tones based on subscriber status, with glowing yellow windows for delivery targets. The bicycle is drawn in teal wireframe style with a rider silhouette. Obstacles render in their respective colors: red cars, brown dogs, orange skaters, orange cones, dark grates. Newspapers are tiny white rectangles. Lane markings are dashed in very dark blue.

## Aesthetic Assessment
**Score: 3/5**

The dark neon aesthetic is an interesting take on the classic, but feels undercooked. The road section dominates visually and feels empty. Houses are tiny and generic. The bike lacks personality. The color scheme is coherent but too dark overall — the action is hard to read. Particles from deliveries are minimal. The day/night look has potential but needs atmosphere.

## Visual Redesign Plan

### Background & Environment

Lean fully into a gorgeous neon night neighborhood aesthetic. The sky should be a deep blue-to-purple gradient with a few distant stars (very small, static). Houses should be the visual spectacle — taller, more detailed, with lit windows creating orange-amber glow that spills onto the sidewalk below. The sidewalk gets a warm concrete texture (horizontal lines with slight color variation). The road becomes a dark asphalt surface with visible lane markings and subtle road texture — tiny specks and uneven color patches.

At the far end of the road, a faint glow horizon suggests the city. Telephone poles and trees create depth silhouettes between houses. Puddles on the road reflect house light as short vertical gradient strips.

### Color Palette
- Primary (bike + player): `#44ffcc`
- Sky: `#050a1a`, `#0d1435`
- Road: `#0e0e18`
- Lane marking: `#22224a`
- Sidewalk: `#1a1a2e`
- House (subscriber, undelivered): `#1a3a5a`
- House (delivered): `#1a4a3a`
- House (non-subscriber): `#141420`
- Window glow: `#ff9940`
- Background: `#050a1a`, `#0d1435`
- Glow/bloom: `#44ffcc`, `#ff9940`

### Entity Redesigns

**Bicycle:** The bike gets a full visual overhaul. Wheels with spoke lines (4 spokes each), a proper diamond frame silhouette with top tube and down tube lines, handlebars and saddle. The rider wears a visible hat with a brim, leans forward in delivery posture, and has a visible newspaper bag (canvas sack) hanging from the handlebars. The bike frame glows in teal (`#44ffcc`) to keep it readable against the dark road. Wheel rotation animated with spoke angle.

**Houses:** Significantly taller (fill the sky zone fully). Each house has: a properly pitched roof with ridge, chimney, garage or steps detail, mailbox post at the curb. Subscriber houses have warm amber windows with curtain silhouettes inside. Non-subscriber houses are completely dark with shuttered windows.

**Cars:** More detailed top-down cars — visible roof shape, windshield rectangle, brake lights, headlights. Each car gets a unique body color and subtle window tint.

**Dog:** Animated running cycle — alternating leg positions using 2 sprite states. Tongue visible.

**Skater:** Taller figure with visible skateboard deck beneath, arms out for balance.

**Cone:** Bright orange with white reflective stripe, dark base shadow.

**Newspapers:** Slightly more visible — rolled newspaper shape (cylinder cross-section: oval at slight angle) with rotation visible in flight arc.

### Particle & Effect System

- **Precise delivery (mailbox hit):** Star burst of golden particles + brief text "PERFECT!" floating up
- **Good delivery (near mailbox):** Green particle burst + newspaper tumble to stop animation
- **Missed subscriber house:** Red X appears, house lights go out with particle flicker
- **Wrong house hit:** Red particles + angry face emoji briefly appears in window
- **Crash:** Bike and rider separate — bike tumbles one way, rider rolls the other, both leaving a dust cloud of 15+ gray/white particles. Stars circle the rider's head.
- **Paper throw:** Small trail of white particles behind newspaper during flight

### UI Polish

HUD at bottom of canvas: deliveries counter with a green percentage bar. Day number shown as a glowing badge top-right. Score animates on change. Lives shown as tiny bike icons. A minimap at top showing the remaining houses ahead as colored dots would be an excellent addition.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Paper throw | Soft whoosh | Filtered noise, bandpass 800Hz, fast decay | 120ms | Light and satisfying |
| Perfect delivery | Bright chime | Sine wave FM, 880Hz + 1320Hz | 300ms | Celebratory bell-like tone |
| Good delivery | Softer chime | Sine 660Hz | 200ms | Less triumphant than perfect |
| Missed house | Low thud | Sine 120Hz decay | 150ms | Subtle disappointment |
| Wrong house hit | Crash clatter | Noise burst, lowpass 1kHz | 200ms | Window-break feel |
| Crash | Impact crunch | White noise + 200Hz sine | 400ms | Distinct from other impacts |
| Bike rolling | Continuous hum | Sine 80Hz + 160Hz, volume tied to speed | Looping | Very quiet, stops when crashed |
| Day complete | Ascending jingle | 5-note C major scale, sine | 800ms | Cheerful reward signal |
| Dog bark | FM pitch burst | 300Hz carrier, 150Hz mod, short | 200ms | Comical and distinct |

### Music/Ambience

A gentle lo-fi beat track built entirely from Web Audio: a kick (bass sine burst), hi-hat (noise burst), and snare pattern at 90 BPM. Very low volume. The neighborhood ambience includes distant dogs barking occasionally, and a gentle wind whistle as speed increases.

## Implementation Priority
- High: House redesign with window glow, crash particle explosion, bike frame detail, paper throw chime
- Medium: Animated bike wheels, dog run cycle, car detail, precise/good delivery distinction
- Low: Background stars, sidewalk texture, puddle reflections, ambient music, minimap
