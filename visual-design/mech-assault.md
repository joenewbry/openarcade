# Mech Assault — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with a real-time top-down mech shooter. The tile map includes: ground `#12122a`, building `#646480`, forest `#1a2a1a`, rubble `#1a1820`. Player mech is `#4488ff` (blue), AI mechs are `#ff4444`/`#44cc44`/`#ffaa00`. Weapons: MG=`#ff0`, Laser=`#0ff`, Missiles=`#f80`, PPC=`#a0f`. A minimap sits at bottom-right (96x80). Heat management mechanic with shutdown. 3-minute match timer. The aesthetic captures the top-down shooter feel functionally, but the world feels sparse — buildings are plain rectangles, forests are plain squares, and the mech art is basic colored shapes. The power and drama of giant war machines is absent.

## Aesthetic Assessment

**Score: 2/5**

The game mechanics communicate well but the visual production is underdeveloped. Mechs look like colored rectangles with a direction indicator. Buildings are featureless boxes. The world lacks environmental richness. Weapon effects are functional but not visceral. The heat mechanic, which is a core gameplay feature, has no strong visual expression. This game has enormous potential for cinematic battlefield drama.

## Visual Redesign Plan

### Background & Environment

Build a war-torn urban battlefield with distinct tile types:

**Ground tiles**: Dark asphalt `#0e0e1e` with subtle road marking lines (faint `#1a1a2a` grid at tile edges). Random cracked-pavement marks (`#0a0a18` hairline cracks).

**Building tiles**: Detailed facade rendering — outer wall `#4a4a60` with window grid pattern (2x3 windows per tile, dark `#1a1a28` with 1px lighter frame `#6a6a80`). Buildings cast shadow tiles (1-tile shadow to south-east, slightly darker `#0c0c1a`).

**Forest tiles**: Individual tree canopy circles overlapping (`#1a3a1a` base, `#2a4a2a` lighter highlights on canopy top). Not just a flat green square.

**Rubble tiles**: Debris-scattered look — irregular dark chunks `#2a2018` on slightly lighter ground `#1c1a14`. Occasional smoke wisp effect.

Add battle atmosphere: slow smoke plumes rising from destroyed buildings (thin columns of `#282020` pixels drifting upward), shell crater marks accumulating on the ground after explosions (darker oval overlays that persist).

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Player mech | Electric cobalt | `#2266ff` |
| Player mech highlight | Ice blue | `#66aaff` |
| Player cockpit | Cyan viewport | `#44ddff` |
| Enemy mech A | Crimson war | `#ee3333` |
| Enemy mech B | Toxic green | `#33cc44` |
| Enemy mech C | Amber threat | `#ffaa22` |
| Ground tile | Dark asphalt | `#0e0e1e` |
| Building wall | Concrete | `#4a4a60` |
| Building window | Dark glass | `#1a1a28` |
| Forest canopy | Battle forest | `#1a3a1a` |
| Forest highlight | Canopy top | `#2a4a2a` |
| Rubble | War debris | `#2a2018` |
| MG tracer | Tracer fire yellow | `#ffee22` |
| Laser beam | Pure cyan | `#00ffee` |
| Missile trail | Burn orange | `#ff8800` |
| PPC arc | Plasma violet | `#bb44ff` |
| Heat bar cool | Safe blue | `#2288ff` |
| Heat bar warn | Hot orange | `#ff8800` |
| Heat bar critical | Danger red | `#ff2222` |
| Explosion | Multi-color | varied |
| Glow/bloom | Weapon color | varied |
| Minimap player | Bright blue | `#4488ff` |

### Entity Redesigns

**Player Mech** — A war machine deserves design. Render in layers:
1. Leg base: wide rectangular lower body `#2266ff` (wider than tall)
2. Upper torso: slightly narrower rectangle above, same color
3. Arm weapons: two thin rectangles extending left and right with weapon barrels at the ends (rotated to face current aim direction)
4. Cockpit dome: small ellipse at top center in `#44ddff` with 1px glow
5. Heat vents: 3 small horizontal lines on the torso sides
6. Direction indicator: replaced by the actual torso rotation and weapon arm orientation
7. `setGlow('#2266ff', 0.5)` for field presence

When heat is high (>70%), vent lines glow red `#ff4422` instead of default blue.

**Enemy Mechs** — Same structure in their team colors but with distinct silhouettes:
- Crimson: wider torso, taller profile (heavy class)
- Toxic green: leaner profile, longer weapon arms (long-range class)
- Amber: medium build with additional shoulder turret (assault class)

**Weapon Effects**:
- **MG**: Rapid short yellow `#ffee22` dashes along trajectory. 8–10 dashes visible simultaneously, each 4px long. Add `setGlow('#ffee22', 0.8)` at the source.
- **Laser**: Continuous bright cyan line `#00ffee` with strong `setGlow('#00ffee', 2.0)`. Held for 0.5s while held. Impact point has a sparkling effect.
- **Missiles**: 2 small arrowhead projectiles `#ff8800` arc from mech to target over 0.4s with fire trail behind them.
- **PPC**: Slow-moving violet sphere `#bb44ff` with a large crackling glow `setGlow('#bb44ff', 2.5)`, travels 0.6s, massive explosion.

**Heat System** — Make the heat mechanic visually dramatic. The heat bar at top transitions smoothly through blue→yellow→orange→red. When above 80%, add heat shimmer effect around the mech (draw 3 wavy lines around the mech in `#ff6622` at 40% alpha). When shutdown occurs: mech color drains to grey, heat vents glow red intensely, brief steam particle burst.

### Particle & Effect System

- **MG impact**: 2 small sparks `#ffee22` at impact point per bullet.
- **Laser impact**: Continuous sparkling at impact point — 2–3 cyan sparks `#00ffee` per frame while laser holds.
- **Missile explosion**: 10–15 particles `#ff8800`, `#ff4400`, `#ffee00` varying velocities. Plus smoke clouds `#443333` that linger 1s.
- **PPC explosion**: 20 particles, large radius, `#bb44ff`, `#8800ff`, `#ffffff`. Brief screen flash and concussion wave (expanding white ring).
- **Mech overheat/shutdown**: 8 steam burst particles `#aaaaff` from vent locations. Mech turns grey-tinted for shutdown duration.
- **Mech destroyed**: 20 particles, team color + grey + orange, large scatter radius. Smoke cloud remains 2s. Crater mark in cell.
- **Building destroyed**: Rubble particles `#4a4a60` scatter, building tile changes to rubble tile over 0.5s transition.
- **Shells hitting ground**: On miss, small impact mark left on ground tile (darker dot, persistent).

### UI Polish

**HUD** — Style as a mech cockpit heads-up display:
- Timer: top center, large glowing numerals in `#ff4422` (red urgency), with a "TIME" label
- Heat bar: prominent at top, color-shifting, segmented into 10 blocks. Label "HEAT" with skull icon when critical
- HP bar: below heat, green segments, label "ARMOR"
- Ammo indicators: small weapon-colored icons at bottom showing remaining ammo per weapon type
- Minimap: dark background with colored dots for units. Frame with cockpit-panel styling `#1a1a3a` with corner brackets

**Weapon switch indicator**: When switching weapons, display weapon icon briefly in center screen, fades over 0.4s.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| MG fire burst | Rapid staccato | Noise HPF 500 Hz, 10 bursts/s | 0.5s | Machine gun cadence |
| MG impact (hits) | Spark ping | Triangle 1500 Hz, 3 quick pings | 0.1s | Metal ricochet |
| Laser fire | Continuous hum | Sine 800 Hz + harmonics, sustain | loop | Electric buzz while firing |
| Laser hit | Crackle | Filtered noise 1000–3000 Hz | 0.05s per frame | Electrical spark continuous |
| Missile launch | Whoosh | Noise HPF 400 Hz volume ramp | 0.25s | Rocket ignition |
| Missile explosion | Boom | Sine 55 Hz + noise LPF 1000 Hz | 0.7s | Deep explosion |
| PPC charge | Rising whine | Sine 200→1200 Hz over 0.5s | 0.5s | Charging up |
| PPC fire | Discharge | Sine 1200→200 Hz + crackle | 0.4s | Plasma discharge |
| PPC explosion | Massive boom | Multi-sine 40+80+160 Hz + noise | 1.0s | Most powerful weapon |
| Mech step | Heavy thud | Sine 80 Hz sharp attack | 0.1s | Every 0.5s of movement |
| Mech overheat | Steam vent | White noise HPF 2000 Hz | 0.3s | Steam release |
| Mech shutdown | Power down | Sine 400→100 Hz slow | 0.8s | Systems offline |
| Mech power-up | Restart | Sine 100→400 Hz | 0.5s | Coming back online |
| Mech destroyed | Catastrophic explosion | All frequencies, peaks then fades | 1.5s | Biggest sound in game |
| Timer warning (<30s) | Beep sequence | Sine 880 Hz, 1/s | loop | Escalates urgency |
| Match end | Fanfare or defeat | 5-note major or minor | 1.0s | Major=win, minor=loss |

### Music/Ambience

Industrial warfare atmosphere. Build with Web Audio:
- Foundation: rhythmic kick (sine 60 Hz, 120 BPM) + snare (noise burst 0.1s, 120 BPM on beats 2 and 4)
- Bass drone: sawtooth 55 Hz, heavy low-pass, slowly cycling volume
- Tension element: long-attack high-pass noise pad at 4000 Hz, volume rising during combat and falling during quiet moments (reactive to whether weapons are firing)
- Occasional distant explosion sounds from background (the game's explosion sound at 10% volume, random 8–20s)

The music responds to gameplay: when all player weapons are on cooldown, volume drops slightly to "scanning" mode. When firing, full intensity. When heat is critical, add a distorted, overloaded quality (gain the bass drone higher, add subtle distortion).

## Implementation Priority

**High**
- Mech layered render (legs/torso/arms/cockpit/vents)
- Heat bar color-shift (blue→orange→red gradient segments)
- PPC charge-then-fire visual + sound sequence
- Laser continuous beam + glow + impact crackle
- Mech destroyed particle burst + crater
- MG sound (rapid staccato) + tracer dashes
- Mech step thuds

**Medium**
- Building window grid pattern
- Forest canopy circles (not flat square)
- Heat shimmer around overheated mech
- Missile arcing projectile + explosion particles
- Shutdown steam particle burst + power-down sound
- Shell crater accumulation on ground
- Heat vent glow shift when critical

**Low**
- Building shadow tiles
- Smoke column from rubble tiles
- Building-to-rubble transition animation
- Persistent hit marks on ground tiles
- Cockpit HUD styling for all gauges
- Reactive ambient music (intensity responds to combat)
- Distant explosion background ambience
