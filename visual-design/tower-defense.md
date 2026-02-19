# Tower Defense — Visual & Sound Design

## Current Aesthetic

A grid-based tower defense on a 600x480 canvas with a 15x12 grid of 40px cells. An S-shaped path is defined by a PATH array. Four tower types: blaster `#4f4`, cannon `#f80`, frost `#0ef`, sniper `#f4f`. Four enemy types: basic `#f44`, fast `#ff0`, tank `#f80`, boss `#f0f`. Enemies follow the path as circles with HP bars. Towers shoot visible projectiles. Gold resource displayed with wave count and lives remaining.

## Aesthetic Assessment
**Score: 2/5**

The tower defense structure is mechanically complete — four tower archetypes, enemy variety, a proper winding path. But visually it is entirely bare. Towers are colored circles on a grid. Enemies are colored circles with HP bars. The path is a different color from the buildable land but has no texture. There is no personality to the towers, no visual distinction between enemy types beyond size and color, and no satisfying sense of a defended position holding against an assault.

## Visual Redesign Plan

### Background & Environment

The build grid should suggest a strategic map. The non-path tiles should be a grassy landscape: `#1a2e10` base fill with subtle short tick marks (1px horizontal dashes, `#253e18`, scattered at irregular positions) suggesting grass blades. Alternate tiles very slightly between `#1a2e10` and `#1e3214` to break visual monotony.

The path should look like a worn dirt road: a `#4a3018` (dark earth) fill with subtle rut lines (two faint parallel `#3a2410` lines running the length of each path segment). At path corners, draw a slightly wider turn area to smooth the path visually.

At the start of the path (enemy entry), draw a dark portal frame — a rectangular arch in `#1a0010` with a pulsing dark red core `#8b0000` suggesting the enemy spawn. At the path end (the base), draw a castle gate silhouette — two tower rectangles flanking a central arched gateway `#8b6a30`, giving the player something to defend visually.

### Color Palette
- Primary: `#4f4` (blaster green), `#f80` (cannon orange), `#0ef` (frost cyan), `#f4f` (sniper purple)
- Secondary: `#f44` (basic enemy), `#ff0` (fast enemy), `#f80` (tank), `#f0f` (boss)
- Background: `#1a2e10` (grass grid), `#4a3018` (dirt path)
- Glow/bloom: Tower colors for attack flash, `#0ef` for frost effect, `#f0f` for boss aura

### Entity Redesigns

**Blaster Tower:** Not a simple circle — a proper turret structure. Base: a dark square platform `#223322` occupying the full cell, slightly inset 3px from cell edges. On the platform, a circular turret ring in lighter `#336633`. From the ring center, a barrel extending toward the nearest enemy target (a 4x12px rectangle). The barrel tip has a muzzle ring (small circle). Apply `setGlow('#4f4', 4)` to the barrel.

**Cannon Tower:** A chunky artillery piece. Heavy square base `#332211`, a wider short barrel `#553322` (6x8px), with visible bolt marks (4 tiny square dots on the base suggesting reinforcement bolts). Fires a slower, larger projectile.

**Frost Tower:** An ornate tower with an icy aesthetic. Octagonal base platform `#112233`. A central emitter crystal drawn as a diamond polygon `#0ef` with `setGlow('#0ef', 8)` — the brightest of all towers. Frost particles constantly drift outward from the crystal (tiny cyan dots slowly expanding and fading).

**Sniper Tower:** A tall thin structure. Rectangular base `#221133`, a thin vertical spire `#443366` rising to 2/3 of the cell height, a small scope circle at the top. A brief laser sight line extends from the scope toward the target (very thin, 30% opacity, sniper color).

**Basic Enemy:** A humanoid silhouette — a circle body with a slightly smaller head circle above it, and two small leg rectangles below. Red `#f44` with a darker outline. Moves smoothly along the path.

**Fast Enemy:** A smaller, sleeker form — an elongated oval aligned to its movement direction. Yellow `#ff0`. Leaves a brief motion trail (3-frame afterimage at decreasing opacity).

**Tank Enemy:** Wide and imposing — a wider-than-tall oval `#f80` with a thick border ring suggesting armor plating. Moves visibly slowly. Has armor visual: draw bolt patterns (4 small squares) on its body.

**Boss Enemy:** A dramatically large entity. Dark magenta `#f0f` base circle with a pulsing aura ring that expands and contracts slowly (radius +4px at 1.5 Hz). Additional ring details: two concentric lighter rings inside the body. The boss HP bar is displayed above it at full path width, dramatically larger than regular enemy bars. At 50% HP, the boss emits continuous dark particles.

**Projectiles:**
- Blaster: Fast small green `#4f4` circle with a bright core
- Cannon: Slower large orange `#f80` ball with a dark center
- Frost: A white-blue `#aef` crystalline shard (small polygon) that leaves a fading blue trail
- Sniper: Near-instant — a bright purple line appears for 2 frames then vanishes (no travel time visually)

### Particle & Effect System

- **Blaster hit:** Small green spark burst (4 particles) at impact. Brief bright flash at the hit position.
- **Cannon hit:** Large explosion at impact — 6-8 orange particles arc outward with gravity. A small crater circle remains on the path at impact point for 60 frames.
- **Frost hit:** Cyan ring expands from impact point over 8 frames. Enemy gets a blue crystal overlay drawn over it for the duration of the slow effect.
- **Sniper hit:** Brief white flash at impact point. Small white particles scatter radially. Critical hit indicator (small star shape) if one-shot.
- **Enemy death:** Body explodes into 6-8 rectangle particles in the enemy's color, arc outward and fade. A gold coin silhouette briefly floats upward (reward feedback).
- **Boss death:** Extra-large explosion — 16 magenta particles + 6 white sparks radiating outward. Full-canvas brief dark flash. "BOSS DEFEATED!" text scrolls across the top.
- **Wave start:** A red warning banner fades in at the top ("WAVE N INCOMING") for 90 frames before enemies spawn.
- **Tower attack (fire):** Muzzle flash at the barrel tip for 2 frames on each shot.

### UI Polish

- **Gold display:** Draw a coin stack icon (3 overlapping yellow circles in slight offset) beside the gold count. Numbers in bright gold `#ffd700`.
- **Lives display:** Draw as shield icons in blue `#4488ff`. Lost lives use dimmed/cracked shields. Shields crack with a brief animation when a life is lost.
- **Tower selection panel:** When clicking to place a tower, show a stylized grid of tower options with their cost, range indicator, and damage type icon. Each option has a dark background panel with a border in the tower's color.
- **Range preview:** When hovering/selecting a placed tower, draw a dashed circle (using dashedLine) indicating its range. Range ring color matches the tower type.
- **Wave progress bar:** A horizontal bar at the top showing remaining enemies in the current wave — depletes as enemies are defeated.
- **Game over:** Dark overlay fades in. The castle gate silhouette at the end cracks apart (animation: crack lines spread from center, then the two halves separate). "KINGDOM FALLEN" in large dark-red text.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Blaster fire | Quick zap | Sine 600→200 Hz | 60ms | Energy shot |
| Cannon fire | Deep boom | Sine 80 Hz + noise | 200ms | Artillery fire |
| Frost fire | Ice crystal | Triangle 800 Hz + noise highpass | 100ms | Crystalline launch |
| Sniper fire | Sharp crack | Noise burst + sine 1200 Hz | 80ms | Rifle shot |
| Enemy hit (basic) | Thud | Sine 300 Hz | 50ms | Impact |
| Enemy hit (frozen) | Ice crack | Highpass noise 2kHz | 60ms | Crystal shatter |
| Enemy death | Pop | Sine 400→100 Hz | 80ms | Dissolve |
| Boss hit | Low clang | Triangle 220 Hz + noise | 150ms | Heavy impact |
| Boss death | Explosion | Sine 50 Hz + broadband noise | 500ms | Massive boom |
| Tower place | Stone thud | Lowpass noise 200 Hz | 100ms | Construction |
| Gold earned | Coin clink | Sine 1200 Hz, sharp | 60ms | Reward ping |
| Life lost | Alarm bell | Sine 440 Hz, 3 rapid pulses | 300ms | Warning |
| Wave start | Drum roll | Noise + sine 100 Hz, building | 300ms | Wave incoming |
| Wave complete | Fanfare blip | Sine 523+659+784 Hz | 200ms | Wave cleared |
| Game over | Sad fall | Sine 330, 261, 220, 165 Hz | 600ms | Defeat chord |

### Music/Ambience

A strategic tension loop: a low sawtooth bass oscillating between E1 and A1 (41 Hz and 55 Hz), 2 seconds each note, with a slow 0.3 Hz amplitude tremolo for a breathing effect (gain 0.04). A rhythmic triangle arpeggio plays on the off-beats in E minor (E3, G3, B3 = 164, 196, 246 Hz), creating a militaristic feel at gain 0.02. During boss waves, a faster drum pattern activates (noise bursts at 130 BPM, gain 0.04) and the bass root shifts down a step to B0 (30 Hz) for added menace. The music volume swells very slightly when a new wave spawns, providing an audio cue that matches the wave start warning banner.

## Implementation Priority
- High: Tower barrel-with-direction rendering (platform + rotated barrel), enemy type silhouette differentiation, frost slow visual indicator on enemies, cannon explosion particle burst
- Medium: Boss pulse aura ring, sniper laser sight line, crater marks from cannon impacts, wave start warning banner
- Low: Grass tile texture and path dirt texture, spawn portal + castle gate endpoints, frost particle ambient drift, boss death full-canvas flash
