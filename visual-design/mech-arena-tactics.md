# Mech Arena Tactics — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with turn-based tactics on a 10x10 grid (44px cells). Mechs are rendered as hexagonal shapes: player mechs in blue `#2244aa`, AI mechs in red `#882244`. A loadout screen allows weapon selection. Armor type indicated by glow color: light=`#5f5` (green), medium=`#8af` (blue), heavy=`#c8f` (purple). Weapon beams animate in color: laser=`#f44`, missile=`#fa0`, cannon=`#ff0`, MG=`#0f8`. Checkerboard grid `#181830`/`#1e1e3a`. A combat log panel sits on the right. The game has good structural bones but the visuals are generic — mechs look like hexagons, not war machines, and the battlefield feels like a game board rather than a devastated arena.

## Aesthetic Assessment

**Score: 2/5**

The mechanic-visual connection is reasonable (color = armor/weapon type) but the art direction falls flat. The mechs have no visual character — they could be anything. The grid battlefield has no environmental storytelling. Weapon effects are simple colored lines. With proper mech silhouettes, battlefield terrain damage accumulation, and explosive weapon effects, this could feel like a genuine tactical showdown.

## Visual Redesign Plan

### Background & Environment

Transform the grid into a post-apocalyptic industrial battlefield. Background behind the grid: dark charred urban environment `#0a0a12`. The grid overlay should suggest a holographic tactical display — thin grid lines in `#1a1a3a` with slightly brighter intersection dots `#2a2a4a`.

Cell backgrounds should vary: most cells flat `#0e0e1a`, but 15–20% of cells have terrain modifiers visible — rubble piles (grey-brown pixel cluster `#3a3020`), crater (darker oval `#080810`), cover object (darker rectangle). These are purely cosmetic but suggest battlefield history.

Add environmental storytelling around the grid edges: broken building silhouettes in `#0a0a14`, smoke columns rising from previous battles (thin wavy lines `#282020` slowly animated). The combat log panel should have a terminal/cockpit aesthetic: dark `#040810` background, green phosphor text `#00dd44`, scan lines.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Player mech base | Deep steel blue | `#1a3a88` |
| Player mech highlight | Electric blue | `#4488ff` |
| Player mech cockpit | Ice blue | `#88ccff` |
| AI mech base | Burnt red | `#882020` |
| AI mech highlight | Bright red | `#ff4422` |
| AI mech cockpit | Orange glow | `#ff8844` |
| Light armor glow | Acid green | `#44ff88` |
| Medium armor glow | Steel blue | `#44aaff` |
| Heavy armor glow | Plasma purple | `#cc44ff` |
| Laser weapon | Bright scarlet | `#ff2222` |
| Missile weapon | Fireball orange | `#ff8800` |
| Cannon weapon | Thunder yellow | `#ffee00` |
| MG weapon | Tracer green | `#00ff88` |
| Grid cell base | Dark arena | `#0e0e1a` |
| Grid cell hover | Target lit | `#1a2a1a` |
| Grid line | Tactical overlay | `#1a1a3a` |
| Combat log background | Cockpit terminal | `#040810` |
| Combat log text | Phosphor green | `#00dd44` |
| HP bar full | Vital green | `#44ff44` |
| HP bar low | Danger red | `#ff4444` |
| Selected cell | Target yellow | `#ffee00` |
| Glow/bloom | Electric bloom | `#4488ff` |

### Entity Redesigns

**Player Mechs** — Move from plain hexagons to distinctive war machine silhouettes. Render in layers:
1. Body: the hexagon base in `#1a3a88` with faceted inner lines (1px lines in `#2244aa` suggesting armor plates)
2. Shoulders: two raised rectangular protrusions at top corners
3. Cockpit: small rounded square `#88ccff` near the top center, with a glow dot inside
4. Weapon hardpoints: visual indicators of equipped weapon (barrel extending from side for cannon, tube for missiles, barrel cluster for MG, emitter ring for laser)
5. Leg struts: two small inverted-V shapes at the bottom of the hex
6. Apply `setGlow('#4488ff', 0.6)` for overall field presence

**AI Mechs** — Same structure but with angular aggressive styling: the body hexagon has sharper inner lines in `#ff4422`, cockpit glows orange `#ff8844`, weapon hardpoints are larger and more prominent. Apply `setGlow('#ff4422', 0.6)`.

**Weapon Effects** — Each weapon has a distinct visual:
- **Laser**: Thin bright line `#ff2222` with `setGlow('#ff2222', 2.0)`, instant travel, held for 0.3s then fades
- **Missile**: Animated projectile — small arrowhead shape `#ff8800` that arcs from attacker to target over 0.5s, then explosion
- **Cannon**: Large projectile — solid sphere `#ffee00` with trailing streak, travels over 0.3s, impact flash
- **MG**: Rapid-fire dashes — 6 small `#00ff88` dashes spaced along the trajectory, all visible briefly (burst effect)

**Terrain Cells** — Cells that have been attacked multiple times accumulate visible damage: on the first hit in a cell, add a small scorch mark (darker circle overlay). Rubble terrain cells show a small debris pile.

### Particle & Effect System

- **Laser hit**: Small crackling sparks at impact point — 6 particles `#ff4444`, `#ffaaaa`, radiate outward. Brief glow flash on the target mech.
- **Missile explosion**: 12 particles in `#ff8800`, `#ff4400`, `#ffff00` with varying velocities. Short-lived smoke clouds `#443333` follow at larger scale.
- **Cannon impact**: 8 particles `#ffee00` + crater effect (slightly darker cell overlay remaining after explosion).
- **MG strafing**: Continuous stream of tiny impact sparks while firing — 2–3 sparks per shot, `#00ff88`.
- **Mech destroyed**: 15 particles in the mech's team color + grey debris. Screen flash white 2 frames. Scorch circle left in the cell.
- **Mech damaged but surviving**: Brief white flash on mech for 2 frames, HP bar shakes.
- **Move animation**: Mech slides smoothly across cells (interpolated position over 0.3s). Dust/footprint particles at previous cell.
- **Action selection**: Target cells show a pulsing ring indicator `#ffee00` when selected as attack target.
- **Turn start**: Brief flash of team color from all friendly mechs.

### UI Polish

Transform the combat log into a genuine cockpit terminal: dark panel `#040810`, scanline texture (alternating rows at slightly different alpha), green phosphor text `#00dd44` with a subtle text glow, monospace font. Entries scroll with newest at top. Critical hits shown in bright `#ff4444`.

Loadout screen: dark panels with weapon cards. Each card shows weapon name, damage range, range stat, and the weapon's beam color. Equipped weapons highlighted with a glow border.

HP bars: render as a segmented bar (5 segments for standard health pool). Each segment is a discrete block that can be empty or full, rather than a smooth gradient. This matches the mech combat feel — hit points feel like meaningful armor chunks.

Turn indicator: a large glowing arrow or border highlight on the active team's mech panels. "PLAYER TURN" / "AI TURN" displayed in large text with a brief appearance animation.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Laser fire | High-pitched zap | Sine 2000→400 Hz fast sweep | 0.25s | Classic sci-fi laser sound |
| Missile launch | Whoosh + ignite | Noise HPF 500 Hz + sine 300 Hz | 0.3s | Rocket whoosh |
| Missile explosion | Deep boom | Sine 60 Hz + noise, LPF 800 Hz | 0.6s | Cinematic explosion |
| Cannon fire | Powerful boom | Sine 80 Hz + mid noise burst | 0.4s | Deep artillery report |
| Cannon impact | Heavy thud | Sine 55 Hz, sharp attack, slow decay | 0.5s | Ground impact |
| MG fire | Rapid staccato | Short noise bursts 200–1000 Hz, 8/s | 0.5s | Machine gun rattle |
| MG impact sparks | Light pinging | Triangle 800 Hz, 4 quick pings | 0.2s | Rounds hitting armor |
| Mech moves (step) | Mechanical thud | Sine 120 Hz + high-freq click | 0.15s | Heavy foot on ground |
| Mech destroyed | Massive explosion | Multi-layer: deep sine + noise + crackle | 1.5s | Memorable destruction |
| Mech damaged (survives) | Metal clang | Sine 400 Hz + 600 Hz, sharp | 0.2s | Armor impact clang |
| Player turn start | Alert tone | Sine 440+660 Hz chord | 0.3s | Attention-getting, friendly |
| AI turn start | Ominous tone | Sine 220+330 Hz minor chord | 0.3s | Threatening, tense |
| Select mech | Click | Sine 600 Hz, fast decay | 0.05s | UI click |
| Mission complete | Victory fanfare | 6-note ascending major phrase | 1.0s | Triumphant |
| Mission failed | Defeat tone | 4-note descending minor phrase | 1.2s | Somber |

### Music/Ambience

A tense industrial battlefield ambient track. Generate using Web Audio: low rhythmic percussion (kick drum using sine 60 Hz with short attack/decay, at 80 BPM), a droning bass pad (sawtooth at 55 Hz, heavy low-pass filter 200 Hz cutoff, very low amplitude), and occasional metallic impact accents (triangle wave 1500 Hz, random 5–12s intervals). During AI turns, add a slightly more complex rhythmic element (hi-hat equivalent: filtered noise 4000 Hz, at quarter notes) to suggest the AI "thinking."

The overall effect: industrial drum machine with drone bass. Mechanical and cold. Perfect for tactical decision-making without distraction.

## Implementation Priority

**High**
- Mech layered render (armor plates, cockpit, weapon hardpoints, leg struts)
- Laser glow effect (bright line + `setGlow` at high intensity)
- Missile projectile animation (arcing travel + explosion)
- Mech destroyed particle burst
- Weapon sound effects (all four weapon types)
- Mech damaged flash
- HP segmented bar render

**Medium**
- MG burst effect (stream of dashes)
- Cannon impact crater cell overlay
- Combat log terminal styling (phosphor green + scanlines)
- Turn indicator flash animation
- Mech destroyed scorch circle
- Mech move interpolation animation
- Move dust/footprint particles

**Low**
- Terrain cell variety (rubble/crater cosmetics)
- Broken building silhouette border
- Smoke column background animation
- Loadout screen weapon card design
- Industrial percussion ambient loop
- AI turn ominous music shift
- Per-cell damage accumulation visual
