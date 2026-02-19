# Mega Man — Visual & Sound Design

## Current Aesthetic

A 512x400 canvas with a tile-based platformer in 3 stages × 3 rooms each. The player is a small rectangle in `#4bf` (cyan) / `#28a` (darker blue). Background `#1a1a2e`. Platform tiles in `#2a4a6a` / `#3a6a8a`. Ladders `#8a6a2a`, spikes `#f44`. Enemies: walker=`#f44`, flier=`#f80`, turret=`#888`. Boss colors: Fire Man=`#f80`, Ice Man=`#8ef`, Elec Man=`#ff0`. Health pickups `#4f4`, score pickups `#ff0`. The game captures the basic structure of Mega Man but lacks the iconic visual character — the hero is a faceless blue rectangle, stages lack personality, and the bosses don't feel threatening. The original NES art direction gave every element immediate visual identity.

## Aesthetic Assessment

**Score: 2/5**

Structurally correct but artistically underdeveloped. Mega Man without his helmet, face, and arm cannon is just a blue rectangle. The stage tiles need distinctive character per stage. Bosses need dramatic visual presence. The NES originals communicated personality through limited pixel art — we can do better with smooth shapes. The charged shot mechanic and boss battles are the heart of this game and both deserve spectacular visual treatment.

## Visual Redesign Plan

### Background & Environment

Each of the 3 stages needs a distinct visual theme that sets expectations and atmosphere:

**Fire Man's Stage**: Background gradient from deep red-black `#1a0808` at top to warm `#1a0c0c` at bottom. Lava glows at the very bottom of the screen (`#ff4400` strips with `setGlow`). Platform tiles: industrial dark metal `#2a2020` with orange glow edges `#ff4400` (near-lava levels). Moving flame particles drift upward behind platforms.

**Ice Man's Stage**: Cold blue-white background gradient `#0a0a1a` → `#0a1020`. Stalactite shapes hang from the ceiling (dark `#0a1828`). Platform tiles: ice-blue `#4a7a9a` with white frost edge highlights `#c0e0f0`. Occasional snow particle drift.

**Elec Man's Stage**: Dark tech/circuit board aesthetic. Background `#0a0a14` with faint circuit trace lines `#151525`. Platform tiles: dark metal `#252540` with yellow energy conduit lines `#ffee44` along edges. Static electricity sparks occasionally jump between nearby platforms.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Player (Mega Man) | Cobalt blue | `#2288ff` |
| Player highlight | Sky blue | `#66bbff` |
| Player arm cannon | Steel grey | `#8899bb` |
| Cannon shot | Cyan bolt | `#44eeff` |
| Charged shot | Gold plasma | `#ffcc00` |
| Fire Man palette | Deep scarlet | `#cc2200` |
| Fire Man flame | Bright orange | `#ff6600` |
| Ice Man palette | Glacier blue | `#4499cc` |
| Ice Man projectile | Blizzard white | `#aaddff` |
| Elec Man palette | Thunder yellow | `#eecc00` |
| Elec Man bolt | Electric white | `#ffff88` |
| Platform (Fire) | Charred metal | `#2a2020` |
| Platform (Ice) | Frozen blue | `#4a7a9a` |
| Platform (Elec) | Dark alloy | `#252540` |
| Spike hazard | Blood red | `#ff2222` |
| Ladder | Warm brass | `#aa8840` |
| Health pickup | Life green | `#44ff66` |
| Score pickup | Gold orb | `#ffcc22` |
| Background (Fire) | Hell red-black | `#120808` |
| Background (Ice) | Arctic void | `#080c14` |
| Background (Elec) | Tech dark | `#080814` |
| Glow (charged shot) | Gold bloom | `#ffcc00` |

### Entity Redesigns

**Mega Man (player)** — Give him his iconic identity. Render in layers:
1. Helmet: a rounded rectangle at the top of the character with a slightly wider brim (classic helmet shape in `#2288ff`)
2. Visor: thin horizontal strip inside helmet in `#66bbff`
3. Face: small peach square `#ffcc88` below visor
4. Body: main rect in `#2288ff` with lighter chestplate detail `#66bbff` (small horizontal strip)
5. Arm cannon: right side has a short tube extending (grey `#8899bb`) — rotates slightly when firing
6. Legs: two small rectangles below body, alternating when walking

**Buster Shot (standard)**: Small cyan oval `#44eeff` that travels horizontally. Slight trail of 2 fading copies behind it.

**Charged Shot**: After holding fire ~1.5s, the arm cannon glows increasingly gold (`setGlow('#ffcc00', intensity rises 0→2.0`). Release fires a large pulsing oval `#ffcc00` with a bright core `#ffffff`. This should feel POWERFUL and satisfying.

**Enemies**:
- Walker: now has legs that animate — two stick legs alternating. Body rectangle has eyes (2 dark pixels).
- Flier: propeller visible above body (rotating lines), body has a menacing eye.
- Turret: more mechanical — a base rectangle `#666` with a barrel rotating to face player.

**Bosses**:
- **Fire Man**: Larger (24x32px), fiery red `#cc2200` with animated flame crown — 4–5 flame tongues `#ff6600` waving above head. Sets glow pulsing orange.
- **Ice Man**: Cool blue with spiky shoulder extensions, animated frost particles floating around him.
- **Elec Man**: Yellow with lightning bolt decorations on arms, crackles of electricity `#ffee44` arcing from fingertips randomly.

### Particle & Effect System

- **Buster shot impact**: 4 cyan sparks `#44eeff` radiate outward, lifetime 0.2s.
- **Charged shot impact**: 12 gold sparks `#ffcc00` + white core flash, larger radius, `setGlow('#ffcc00', 3.0)` for 1 frame.
- **Enemy destroyed**: 6 particles in enemy's color, radiate and fade 0.4s.
- **Boss hit**: Screen flash brief white. Boss flashes white 3 times (3 frames flash cycle).
- **Boss destroyed**: 20 particles in boss color + white + grey. Large explosion. Screen shake 4px for 6 frames.
- **Player damaged**: Brief screen tint red `#ff000033`. Player flashes white 6 times (brief invincibility visual).
- **Spike death**: Player breaks apart — 8 blue particles scatter in all directions.
- **Fire stage flames**: 5 small flame particles `#ff4400` drift upward from near-lava platform edges per second.
- **Ice stage snow**: 15 white pixel particles `#eef8ff` drift down slowly, randomly placed per frame.
- **Elec stage sparks**: Every 3s, a small `#ffee44` spark jumps between two nearby platform tiles (2 particle trail).
- **Health pickup collect**: Green burst `#44ff66`, 8 particles.
- **Charge building**: While charging, blue→gold spark particles orbit the arm cannon area, count increasing as charge grows.

### UI Polish

HUD at top: dark semi-transparent band `#0a0a1e` at 70% alpha. Health bars rendered as a column of discrete blocks (9 blocks, like the NES original HP bar). Player HP is cyan `#44eeff`, boss HP is red `#ff4422`. Both labeled with small icons.

Boss health bar appears as a separate prominent bar at top during boss fights, with the boss's color and a brief "VS [BOSS NAME]" flash when the boss room is entered.

Stage name displayed briefly (2s) when entering a new stage: large bold text in the stage's color, fades in/out.

Score: top right, gold numerals `#ffcc22`. Lives: top left, small Mega Man helmet icons.

Room transition: brief horizontal "wipe" as camera moves to next room.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Buster shot fire | Bright zap | Sine 800→1200 Hz quick sweep | 0.1s | Light, satisfying pop-zap |
| Buster impact | Spark click | Triangle 1000 Hz, instant decay | 0.05s | Brief impact |
| Charge building | Rising hum | Sine 200→600 Hz continuous | loop | Pitch rises with charge level |
| Charged shot fire | Power discharge | Sine 600→200 Hz + harmonics | 0.4s | BIG, satisfying release |
| Charged impact | Explosion | Sine 100 Hz + mid-noise burst | 0.5s | Noticeably more powerful |
| Walk step | Light tap | Band-pass noise 400–800 Hz | 0.04s | Alternating every 6 frames |
| Jump | Boing | Sine 200→400 Hz quick | 0.1s | Upward spring feel |
| Land | Thud | Sine 100 Hz sharp | 0.05s | Weight of landing |
| Enemy destroyed | Pop | Noise 400–2000 Hz, fast decay | 0.15s | Satisfying enemy death |
| Boss hit | Metallic clang | Sine 300+400 Hz, medium decay | 0.2s | Solid impact feel |
| Boss destroyed | Explosion | Multi-layer sine + noise | 1.2s | Dramatic, memorable |
| Player hit | Alert | Triangle 880 Hz, brief tremolo | 0.2s | Hurt but not dead |
| Player death | Descend | Sine 440→110 Hz over 1s | 1.0s | Classic death sound |
| Health pickup | Life chime | Sine 659+784 Hz brief chord | 0.2s | Bright, positive |
| Boss intro | Dramatic chord | Minor chord + echo | 0.5s | Ominous boss appearance |
| Stage clear | Fanfare | 8-note ascending melody | 1.5s | Celebratory phrase |

### Music/Ambience

Each stage needs a distinct theme communicating its elemental character:

**Fire Man Stage**: Driving, aggressive rhythm. Sawtooth bass at 110 Hz, fast 160 BPM, heavy. Melody on square wave using a minor pentatonic scale with hot energy.

**Ice Man Stage**: Slower, more deliberate. Triangle oscillator melody at 120 BPM, cool minor key, with long sustains suggesting vast frozen spaces.

**Elec Man Stage**: Frenetic and technical. Rapid arpeggios on square wave at 150 BPM, major/minor mixed, complex rhythm. Electricity in the music.

**Boss Battles**: Common boss theme — urgent, driving at 170 BPM, minor key, repeating 8-bar loop. Adrenaline-pumping.

All themes generated as oscillator sequences through Web Audio. No audio files.

## Implementation Priority

**High**
- Mega Man helmet/visor/face/arm cannon render (iconic silhouette)
- Charged shot system (visual charge-up glow + power discharge)
- Stage-specific platform and background colors per area
- Boss distinctive render (Fire/Ice/Elec visual themes)
- Player damaged flash sequence (invincibility blink)
- Boss destroyed particle explosion + screen shake
- Buster shot and charged shot sounds

**Medium**
- Enemy walk animation (alternating legs)
- Player charge-building particle orbits around arm cannon
- Stage-specific atmospheric particles (flames/snow/sparks)
- Boss HP bar with stage-color theming
- Enemy destroyed pop particles
- Boss intro dramatic chord
- Stage clear fanfare

**Low**
- Boss-specific unique abilities (fire crown animation, ice frost particles, elec arm crackles)
- Room transition wipe animation
- Stage name display on entry
- Score/lives HUD refinement
- Per-stage music themes (three distinct oscillator sequences)
- Boss battle urgency music theme
