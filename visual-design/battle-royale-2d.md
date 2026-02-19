# Battle Royale 2D — Visual & Sound Design

## Current Aesthetic
The game uses a dark `#141428` ground with grid lines `#1e1e3a`, a red zone danger overlay drawn with a frame polygon technique, buildings in `hsl()` brownish tones, trees as green circles, loot with weapon-specific colors (pistol `#aaa`, shotgun `#fa0`, rifle `#4af`, sniper `#f4a`), and player circles with HP bars and armor arcs. The world is 3000×3000 with a 600×600 canvas viewport.

## Aesthetic Assessment
The player/loot color coding is clear and the HP arc system conveys multiple health values elegantly. The shrinking danger zone creates appropriate tension. But the world is desolate — flat grey-brown buildings with no visual character, green circles as trees that could be from any basic game, and a ground that's just dark with grid lines. Real battle royale games derive tension from the environment — abandoned buildings with broken glass, dense forests, distinctive landmarks. The map feels like an empty placeholder. The zone graphic is functional but lacks terror.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Transform the flat ground into a convincing top-down abandoned world.

**Ground**: Base `#1a1a2a`. Add subtle variation: 30% of 40×40 grid cells are slightly lighter (`#1e1e32`) or darker (`#151520`) — irregular patches suggesting terrain variation. Scattered 1×1 pixel debris: 100 random tiny dots in `rgba(60,60,80,0.4)` across the visible viewport.

**Buildings**: Redesigned with interior space suggestion — draw the outer wall rectangle (dark `#2a2030` fill, `#3a3050` stroke), then an inner rectangle offset by wall thickness (8px) in a slightly lighter `#1e1c2a`, suggesting room interiors. Doorway gaps: 20px-wide breaks in walls at 1–2 sides per building. Windows: small 8×8 rectangles on walls in dark glass tone `rgba(100,120,160,0.4)`. Destroyed buildings get a lighter fill with rubble dots (4–6 small circles in `#4a4060`).

**Trees**: Replaced with dense foliage circles — outer ring in dark forest green `#1a3a18`, a slightly brighter middle layer `#2a5a22`, and a bright top highlight cluster (3–5 tiny circles in `#44aa33`) suggesting light hitting leaves. Trees cast a subtle shadow: a dark ellipse offset 4px down-right at `rgba(0,0,0,0.3)`.

**Danger zone**: The collapsing circle border becomes a terrifying bright red ring. The safe-zone edge: a bright `#ff2200` stroke (3px) with a pulsing glow (`rgba(255,30,0,0.4)`, radius 8px, 1Hz pulse). Outside the safe zone: a red tint overlay `rgba(200,0,0,0.15)` with animated noise — subtle flickering (opacity ±0.05 at 3Hz) suggesting active danger. Inside the zone: a very faint blue-green safe tint `rgba(0,100,60,0.05)`.

### Color Palette
- Ground base: `#1a1a2a`
- Ground variation: `#1e1e32` (light), `#151520` (dark)
- Building exterior: `#2a2030` fill, `#3a3050` stroke
- Building interior: `#1e1c2a`
- Window glass: `rgba(100,120,160,0.4)`
- Tree outer: `#1a3a18`
- Tree mid: `#2a5a22`
- Tree highlight: `#44aa33`
- Player (self): `#00ffcc` — bright teal
- Player (enemy): `#ff4422` — threat red
- Zone border: `#ff2200`
- Zone exterior: `rgba(200,0,0,0.15)`
- Safe zone: `rgba(0,100,60,0.05)`
- Pistol loot: `#aabbcc` (steel blue-grey)
- Shotgun loot: `#ff9900` (orange)
- Rifle loot: `#44aaff` (blue)
- Sniper loot: `#ff44aa` (pink-magenta)
- Melee loot: `#aa6622` (brown)
- Medkit: `#ff4444` with white cross
- HP bar: `#44ff44`
- Armor arc: `#4488ff`

### Entity Redesigns
**Player circles**: Add detail layers — outer circle in faction color (self: teal, enemy: red), a directional indicator (small triangle or line segment pointing the direction the player faces), and the HP/armor arcs (HP as inner arc, armor as outer arc). Enemy players that are out of line-of-sight get a dimmer rendering (`rgba` version of their color at 50% opacity).

**Weapons on ground (loot)**: Instead of plain colored circles, draw weapon silhouettes:
- Pistol: small L-shaped polygon (barrel + grip)
- Shotgun: wider barrel rectangle with a shorter grip
- Rifle: longer barrel with a stock behind
- Sniper: very long thin barrel
All in their assigned colors, with a subtle glow ring indicating rarity.

**Medkit**: Red circle with a white cross (4px lines). Pulses gently (scale ±5% at 0.5Hz).

**Bullets (projectiles)**: Short 2×6px rods oriented along velocity, in bright white `#ffffff` with a faint trail of 3 ghost images.

**Zone visual**: As zone shrinks, the border moves — animate the border position smoothly rather than snapping. The zone edge leaves a brief burn mark trail: dark `rgba(100,0,0,0.4)` patches that fade over 120 frames where the zone boundary has passed.

### Particle & Effect System
**Gunshot flash**: At the shooter's position, a brief 6px white circle (2 frames) + 4 small sparks outward along the barrel direction, fading over 8 frames.

**Bullet impact (wall/tree)**: 4–6 dust/debris particles in ground color (`#3a3a50`), scattered outward, fading over 15 frames.

**Player hit**: Target player briefly flashes white (2 frames). Blood particle effect: 3 small red circles (`#ff2200`) scatter outward from impact, fading over 20 frames.

**Player death**: Large 12-particle explosion in enemy color, player circle shrinks to 0 over 8 frames with a white flash. A persistent 16px dark mark remains at death location for 60 frames.

**Zone damage**: When the player is outside the safe zone, a red pulse flashes on the player's HP bar and a brief red vignette at screen edges (every hit).

**Loot pickup**: Loot item scales down to 0 and disappears over 4 frames with a small sparkle burst in the loot's color.

**Airdrop crate**: (if applicable) A large bright yellow `#ffcc00` square with a small parachute icon above, slowly drifting down. Lands with a dust cloud (8 grey particles, expanding outward).

### UI Polish
Minimap in top-right: 100×100px showing player position (bright teal dot), enemies as red dots, zone circle boundary as red arc, buildings as dark rectangles. Own player health bar at bottom-left — large and prominent (120px wide). Armor bar below it in blue. Current weapon shown at bottom-right with remaining ammo. Kill count in top-left. Player count remaining ("Players: 24") in top-left below kill count. Zone timer if applicable. Direction indicator at edges of screen when zone boundary is off-screen (small red arrows pointing toward danger).

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Pistol fire | Noise + bandpass 1500Hz | Sharp crack | 80ms | Crisp handgun |
| Shotgun fire | Noise + lowpass 400Hz | Wide boom | 200ms | Heavy spread |
| Rifle fire | Noise + bandpass 800Hz | Medium crack | 100ms | Auto-rifle |
| Sniper fire | Noise + bandpass 600Hz | Long crack + echo | 350ms | Distant, echoing |
| Reload | Noise + bandpass 1200Hz | Click-click | 150ms | Mechanical reload |
| Player hit | Noise + highpass 1500Hz | Sharp impact | 60ms | Harsh hit |
| Player death | Noise bloom + sine fall | Boom + 220→55Hz | 800ms | Dramatic death |
| Pickup loot | Sine ping | 660Hz brief | 50ms | Item collect |
| Medkit use | Sine arpeggio up | 330→440→550Hz | 250ms | Healing chime |
| Zone damage | Noise + lowpass 200Hz | Low burn | 300ms | Zone hurts player |
| Zone moving | Oscillator (sine) | 80Hz rising, very soft | continuous | Approaching danger hum |
| Kill confirmed | Sine chord | 440+550Hz | 200ms | Kill confirmation |
| Win (last player) | Sine fanfare | Full 5-note ascending | 600ms | Victory fanfare |

### Music/Ambience
Tension-building dynamic ambient. Three layers:
1. **Base drone**: sine at 44Hz, gain 0.03 — ever-present sub-bass tension
2. **Danger proximity layer**: bandpass noise (150–300Hz) whose gain increases as the zone closes in — from 0 at game start to 0.08 at final zone. Gives the growing sense of compression.
3. **Heartbeat**: alternating noise bursts (lowpass 100Hz, 60ms each, 0.6 second interval) whose tempo increases as player count drops — from 1 beat/second (many players) to 3 beats/second (final 3 players). This creates the same mounting tension as the original Asteroids heartbeat, but for player elimination.

No music beyond this ambient system — the silence between gunshots is part of the battle royale tension.

## Implementation Priority
- High: Building interior/doorway/window rendering, tree foliage layered circles with shadow, zone border pulsing glow
- Medium: Weapon silhouette loot icons, bullet projectile rods with trails, player hit flash and blood particles
- Low: Ground terrain variation patches, zone exterior red flicker, zone burn mark trail, tree shadow ellipses
