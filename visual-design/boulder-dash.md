# Boulder Dash — Visual & Sound Design

## Current Aesthetic
A 25x20 tile grid dungeon crawler. Dirt tiles: brown with a slightly lighter center and occasional dark texture dots. Wall tiles: grey with subtle horizontal lines. Steel (border) tiles: dark with X cross-hatch lines. Boulders: grey circles with a bright highlight dot. Diamonds: cyan rotating diamonds with a glow and white center sparkle, animated by a `sparklePhase` counter. The player character: a blue rectangle body (`#8cf`) with head circle and two pixel eyes. The exit: a pulsing green cell when open, or dark when locked. Enemies: red circles with orange "wing" triangles extending left/right and two white eye pixels. The HUD: a semi-transparent dark bar at top showing level, diamond count, and timer in blue-cyan text.

## Aesthetic Assessment
The diamond animation (phased sparkle glow with twinkling) is a standout — beautiful and matches the spirit of the original game. The enemy design with wing triangles is distinctive. However the overall palette is quite muted — the dirt fills most of the screen and its brown-on-brown look becomes monotonous. The boulder is a plain grey circle with very little character. The player character is barely more than a colored blob. The steel walls look like simple dark tiles. More depth and atmosphere in the cave environment would transform this.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
The cave needs atmosphere. Dirt tiles: redesigned as proper compacted earth — dark reddish-brown (`#5c3012`) base with small rock pebbles visible as darker rounded dots at random positions per tile. The dirt has a wet underground look — a very faint sheen effect (a 1px bright horizontal line at the middle of each tile at 15% alpha). When the player digs through dirt, the adjacent tiles briefly "crumble" (a 3-frame animation where the tile shows a crack texture before disappearing).

Wall tiles: solid stone look — medium grey base (`#4a4a5a`) with visible mortar lines forming a natural stone pattern. Stones slightly vary in shade per tile (±5% brightness randomized on level generation). Each stone block has a bright top-left edge and darker bottom-right edge (beveled).

Steel border: solid dark iron — near-black (`#1a1a22`) with a repeated rivet/bolt motif at corners of each tile. A metallic sheen stripe runs diagonally across each tile.

The empty dug-out spaces (where dirt was removed): near-black void (`#080608`) — creating a strong contrast with the earthy tiles.

### Color Palette
- Dirt base: `#5c3012`
- Dirt pebble: `#3d1f0a`
- Wall stone: `#4a4a5a`
- Wall highlight: `#6a6a7a`
- Steel: `#1a1a22`
- Empty void: `#080608`
- Diamond: `#44eeff`
- Diamond sparkle: `#ffffff`
- Boulder: `#888899`
- Boulder highlight: `#ccccdd`
- Player: `#44aaff`
- Enemy: `#ff2020`
- Enemy wing: `#ff6600`
- Exit open: `#00ff44`
- HUD text: `#44eeff`

### Entity Redesigns
**Player character:** The player is Rockford — a small spelunker. Upgrade from a plain rectangle:
- Body: cyan/blue rectangular torso with slightly tapered sides (trapezoidal, wider at shoulders)
- Head: cream/white circle with a helmet in player color (dark blue arc over top half)
- Helmet light: a small yellow circle at the front of the helmet that casts a faint radial glow (5px radius, yellow tint) onto adjacent tiles — a miner's headlamp effect
- Legs: two small blue squares that alternate position during walking
- The miner headlamp is the star detail — it makes the player recognizable and functional

**Boulders:** Bigger personality. The grey circle gets:
- A natural rock texture: 3-4 random dark patches (smaller circles at 60% opacity) on the surface suggesting shadow
- A bright specular highlight (upper-left)
- A very faint outer shadow/glow in dark grey
- When a boulder is falling, it gets a slight vertical motion blur (the circle is drawn twice: once at 40% opacity 4px above the current position)

**Diamonds:** The current sparkle animation is already excellent. Enhance it:
- Add 3-4 tiny star-shaped sparkle bursts that appear randomly around the diamond (using `Math.random()` thresholds, each lasting 5 frames)
- The diamond itself rotates very slowly (the shape rotates 10° every second)
- When collected, the diamond rapidly scales up to 150% then vanishes with a bright flash

**Enemies (butterflies/fireflies):** The red circle + orange wings design is good. Intensify:
- Wings now flap: the two side triangles oscillate between their current position and 2px shorter every 6 frames
- A pulsing red glow (0.4 → 0.8 intensity, 1-second cycle)
- Add antennae: two thin lines extending from the top of the body, curving outward
- When an enemy is killed by a boulder, it flashes white then explodes into 6 small red/orange particles

**Exit (when open):** A compelling portal. A bright green rectangular frame with animated corner pulses. Inside the exit cell: a rapidly rotating bright green + dark green checkerboard pattern (like a warp zone). A vertical beam of light extends upward from the exit for 3 tiles.

### Particle & Effect System
**Diamond collection:** A bright cyan flash fills the diamond's cell (white at 0.8 alpha for 2 frames), then 8 cyan sparkle particles burst outward in a star pattern, fading over 15 frames. A "+100" floating text rises and fades.

**Boulder crush (player or enemy):** An orange/red explosion: 10 particles burst outward. If the player is crushed, the screen flashes red at 0.4 alpha for 3 frames, and a larger star-burst effect plays.

**Dirt dig:** When the player moves into a dirt tile, a brief brown "puff" of 4-5 dark brown particles falls from the top of the tile downward, vanishing in 8 frames.

**Level complete:** All diamonds on the board simultaneously flash bright and then fly toward the exit in a sweeping arc animation. The exit portal spins rapidly.

### UI Polish
HUD bar becomes a proper mining display:
- Left: "LVL X" with a small pickaxe icon (two lines forming a pickaxe shape)
- Center: Diamond icon (small cyan diamond shape) + count/needed in bright cyan, turning gold when exit opens
- Right: Timer with a small hourglass icon, turning red when under 15s
- The player's headlamp glow on the canvas is the most distinctive UI element — it naturally draws the eye

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Move into dirt | Crunch | Brown noise (lowpass white noise 300Hz) | 0.15s | Earth crunching |
| Diamond collect | Sparkle chime | 1318+1760Hz sines | 0.3s | Crystal ping |
| Boulder fall | Rumble | 50Hz sine, amplitude rises over 0.3s | per tile | Growing rumble as falling |
| Boulder land | Thud | 80Hz sine burst | 0.2s | Heavy impact |
| Enemy killed by boulder | Squash | 300→100Hz sine sweep + crunch noise | 0.4s | Comic squash sound |
| Player killed | Deep boom | 40Hz sine + noise | 0.6s | Heavy impact |
| Exit opens | Magical reveal | 523+784+1046Hz ascending arpeggio | 0.8s | Portal opening |
| Level complete | Triumph | Full major chord arpeggio + sustain | 1.5s | Achievement fanfare |
| Timer warning (<15s) | Tick | 800Hz square, 0.05s | every second | Countdown tick |

### Music/Ambience
An underground ambient soundtrack: deep cave atmosphere. A continuous low drone: 55Hz and 82Hz sine waves at 0.015 amplitude each, providing a subtle harmonic hum like a cavern's resonance. Every 8-15 seconds, a random cave drip sound: a brief 800Hz sine attack with a long 1.5s decay, mimicking water dropping from stalactites. Occasional distant rumble (30Hz filtered noise, 0.3s duration) plays every 20-40 seconds, suggesting the cave is alive and dangerous.

## Implementation Priority
- High: Player headlamp glow effect, diamond rotation + random sparkle bursts, boulder falling motion blur, dirt dig crunch particles
- Medium: Stone wall bevel/texture, enemy wing flap animation, exit portal spinning checkerboard, boulder crush particle burst
- Low: Dirt crumble animation on adjacent tiles, diamond collection fly-to-exit animation, floating score text on collection
