# Pirate Conquest — Visual & Sound Design

## Current Aesthetic

A 600x500 Caribbean map with dark ocean (`#082840` to `#0c3560` gradient), green islands, and port icons with anchor symbols. Four players trade goods (rum, sugar, spices, gold) using ships represented as hull polygons. Animated ocean wave lines sweep across the background. Ports are teal circles with anchor icons. Ships navigate between ports with drawn sail shapes. Gold (`#ec4`) accents name labels and resource counters. A turn counter and score panel appear on the right.

## Aesthetic Assessment
**Score: 3/5**

The Caribbean map concept is atmospheric and the wave animation gives life to the ocean. But the execution feels rough — island shapes are small blobs, ports are generic circles, and ships are minimal polygons. The goods trading mechanic has no visual panache. The ocean animation is a nice touch but the waves look scratched on rather than painted. There's real potential for this to look like a hand-drawn antique pirate map that comes alive.

## Visual Redesign Plan

### Background & Environment

Transform the ocean into a richly layered environment. The background becomes a deep ocean parchment — a dark navy-to-midnight-blue radial gradient (`#041420` center to `#020810` edges). Layer animated ocean waves as multiple sinusoidal lines at different depths — 3 layers: deep background waves (slow, subtle, dark blue), mid waves (medium speed, slightly lighter), and surface foam streaks (fast, bright aqua-white, short curved dashes). Occasional animated whitecaps appear as brief bright flares.

The islands get a much richer treatment — irregular organic shapes with visible beach shorelines (a thin sandy strip around the edges), interior green hills suggestion (lighter green toward center), and small palm tree silhouettes. Each island casts a soft shadow on the ocean. The map border becomes a decorative antique compass rose and sea-monster illustrations — very dark shapes suggesting an old nautical chart. Faint latitude/longitude lines cross the ocean at 5% opacity.

### Color Palette
- Ocean deep: `#041420`, `#062035`
- Ocean surface: `#0a3050`, `#0d4070`
- Wave foam: `#3080c0`, `#80c0f0`
- Island green: `#2a5a20`, `#3a7a2a`
- Beach sand: `#c8a060`, `#e0b878`
- Port circle: `#c8982a`
- Port glow: `#ffcc44`
- Ship hull: `#8b4513`, `#a05020`
- Ship sail: `#f0e8d0`, `#d4c8a0`
- Gold/treasure: `#ffcc00`, `#ffd700`
- Player colors: `#4488ff` (blue), `#ff4444` (red), `#44dd44` (green), `#ffaa00` (orange)
- UI background: `#0a1420`
- Text: `#f0d890`

### Entity Redesigns

**Islands:** Each island is a proper irregular landmass shape — drawn as a filled polygon with 8-10 points with natural variation. The fill is a dark green (`#2a5a20`) with a lighter inner highlight suggesting hills. A sandy beach border (thin ring in `#c8a060`) rings the waterline. 2-3 small palm tree shapes (Y-branching lines) sit atop the larger islands. Island names display in a weathered serif-style rendering (thick strokes, slightly uneven) above each landmass.

**Ports:** Ports become proper harbor icons — a circular dock platform with an anchor emblem and a wooden pier extending toward the shore. The owning player's color tints the dock border. An unowned port glows in neutral gold. A small flag on a pole shows the controlling player's color. Port tooltip on hover shows: port name, owner, and goods available.

**Ships:** Ships become proper top-down sailing vessels — a tapered hull shape widest at the beam, stern square cut. Sails depicted as billowing triangles or square sails with slight curvature. The hull color varies by ship type: sloop (dark brown, small), brigantine (medium brown, 2 mast marks), galleon (deep mahogany, wide hull, 3 mast marks). Each ship's sail color shows the owning player's color at reduced opacity — so blue player's ships have blue-tinted sails.

**Goods icons:** Instead of text abbreviations, goods are shown as small icon pictograms in the trade panel — a barrel for rum, a bag for sugar, a leaf for spices, a coin stack for gold. Each has a color coding (amber/white/green/gold) and the quantity shown as a number badge.

**Ocean waves:** Waves become visible sine-curve lines sweeping left to right. Multiple layers: the deepest layer moves at 0.3x speed in very dark blue, mid layer at 0.6x in medium blue, surface at 1x in bright aqua. Occasional foam clusters (short curved dashes) appear at wave crests. The entire ocean surface has a faint shimmer — a very slow sine-wave brightness modulation.

### Particle & Effect System

- **Cannon fire:** When a ship attacks, a muzzle flash burst of 5 particles emits from the ship, followed by a cannonball arc (small dark circle) traveling to the target with a trailing smoke puff of 3 gray particles
- **Hit explosion:** On ship impact, 8 orange-red particles burst outward + water splash (4 white droplets fan outward)
- **Port captured:** Golden star burst — 8 gold particles emit from the port in a ring, plus the port briefly flashes the new owner's color
- **Trade completed:** Coin shower — 6 gold coin particles arc from ship to port and back, with a soft glitter
- **Ship sunk:** The ship polygon splits into 3-4 pieces that drift apart and fade over 60 frames, with bubbles rising from the wreck position
- **Turn change:** A brief vignette flash in the active player's color sweeps across the screen edges
- **Wave crest:** Occasional brief white sparkle appears at a wave crest — 3-frame life, random positions

### UI Polish

The sidebar panel becomes a captain's log — dark aged parchment texture, gold border, player info presented as ship manifest entries. Each player's section shows their ship count as tiny ship silhouettes, and their goods as icon+number. The trade action becomes a visual exchange interface — goods slide from ship to port and back. Turn counter shown as a ship's log entry — "Turn 12 of 30." The current player indicator is a glowing compass needle pointing to their color.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ship move | Sail creak | Filtered noise, bandpass 200Hz, slow decay | 300ms | Wind-and-rope texture |
| Cannon fire | Deep boom | Sine 60Hz + noise burst, lowpass 500Hz | 400ms | Heavy, satisfying cannon thud |
| Cannonball hit | Impact crack | Noise burst 2kHz + descending sine 300→100Hz | 300ms | Wood-splintering sound |
| Ship sunk | Dramatic crash + bubbles | Noise burst + rapid bubbling noise 800Hz | 800ms | Sinking and gurgling |
| Trade completed | Coin clink | Sine 1200Hz + 800Hz dual tone | 200ms | Classic coin sound |
| Port captured | Triumphant stab | C-E-G-C ascending, short, square wave | 400ms | Brief fanfare |
| Turn start | Bell toll | Sine 440Hz + decay, reverb-simulated | 500ms | Naval bell signal |
| Game end (win) | Cannon salute fanfare | 3 cannon booms + ascending melody | 2s | Epic nautical triumph |
| Ocean ambient | Wave wash | Very slow noise sweep, bandpass 100–400Hz | Looping | Constant quiet ocean sound |
| Storm warning | Rising wind | Noise filtered sweep 100→800Hz | 600ms | Dramatic alert |

### Music/Ambience

A nautical adventure soundtrack: a jaunty sea shanty melody built from triangle waves (bright, pennywhistle-like) over a simple bass pattern (square wave low notes). The rhythm uses noise bursts for drum hits at a medium tempo of 110 BPM. The main melody loops every 8 bars. During combat turns, the music gets a darker variant — the bass drops lower, the melody uses a minor scale variation, and tempo subtly increases. Between turns, ocean ambient sound is emphasized. Volume: ~20% behind sound effects.

## Implementation Priority
- High: Rich ocean wave layering (3 speeds), ship redesign with hull/sail shapes, cannon fire particle effects, ship sunk animation
- Medium: Island beach border and palm silhouettes, port harbor visual with flag, goods icon pictograms, player color sail tinting
- Low: Antique map border decorations, latitude/longitude grid lines, ocean shimmer modulation, background shanty music, storm warning sound
