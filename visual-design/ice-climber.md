# Ice Climber — Visual & Sound Design

## Current Aesthetic

Vertical platformer climbing through ice blocks with a shifting sky gradient background. Ice blocks are `#68c` (medium blue) with a lighter `rgba(170,210,255,0.4)` shine highlight and fine crack lines. Summit blocks are golden `#da4`. The floor is dark `#445`. Player wears a blue parka `#48f` with a peach face `#fdb`, swinging a hammer with a silver head. Topi enemies are mauve `#c4a` seal shapes with a lighter belly. Fruits are colorful collectibles. The aesthetic has genuine charm but lacks the crisp, luminous quality of a polished arcade game.

## Aesthetic Assessment

**Score: 3/5**

The color choices evoke the original NES Ice Climber well — cool blues, warm golden summit, colorful fruits. The ice block shine highlights are a smart touch. However the sky background is simple banded gradients rather than a rich atmospheric depth, the ice blocks could have much more crystal-like translucency, and the particle/effect work is minimal. The hammer swings but doesn't create an impact burst.

## Visual Redesign Plan

### Background & Environment

The sky should feel like a crisp alpine altitude — cold, clear, and vast. Build a three-layer background:

- **Sky gradient:** Top `#040820` (near-space dark) → mid `#0a1840` (deep night blue) → bottom `#1a3060` (horizon blue). This gradient scrolls with the player position — lower sections are warmer blue, upper sections approach near-black.
- **Stars:** At high altitude (beyond 50% climb), small stars `#99aabb` appear, fading in based on height. 30 stars, 1px, scattered.
- **Mountain silhouette:** Very faint distant mountain range silhouette drawn in `rgba(30,50,100,0.12)` at the far background layer — parallaxes at 3% of player scroll speed.
- **Snow drift:** Occasional small snow particles `rgba(200,220,255,0.4)` drifting diagonally downward (2–3px, 4–8 per screen), giving sense of altitude wind.

Ice blocks should look crystalline — slightly translucent with internal refraction lines. Use layered rendering:
1. Block fill: `#2a5a8a` (deeper blue base)
2. Top face highlight: lighter `#5595cc` strip across top 4px
3. Internal shine: `rgba(170,210,255,0.35)` diagonal highlight patch
4. Crack detail: faint darker `#1a4a7a` thin lines suggesting ice fractures
5. Border: `#1a4a7a` 1px outline

### Color Palette

- Primary (ice): `#4488cc`
- Ice highlight: `#88ccff`
- Ice deep: `#2a5a8a`
- Sky top: `#040820`
- Sky bottom: `#1a3060`
- Summit gold: `#ddaa33`
- Summit glow: `#ffee66`
- Floor dark: `#334455`
- Player parka: `#3366ff`
- Player parka accent: `#5588ff`
- Player face: `#ffddaa`
- Hammer head: `#ccddee`
- Topi body: `#bb88aa`
- Topi belly: `#ddbbcc`
- Fruit eggplant: `#9944ff`
- Fruit carrot: `#ff8800`
- Fruit cabbage: `#44cc44`
- Fruit mushroom: `#ff4444`
- Snow: `rgba(200,220,255,0.5)`

### Entity Redesigns

**Player (Popo):**
- Parka: `#3366ff` rounded rectangle body with `#5588ff` lighter front strip (suggests fabric folds)
- Face: `#ffddaa` circle, small dark eyes `#223344`, pink cheek dots `#ffaaaa`
- Hat: white `#eeeeff` dome shape with `#3366ff` brim
- Hammer: handle `#8855aa` (purple-wood), head `#aabbcc` with specular dot `#ffffff`
- On hammer swing: glowing arc `rgba(200,220,255,0.4)` behind the hammer head sweep
- Hammer impact on ice: ice crystal burst particles

**Topi (enemy):**
- Body: `#bb88aa` rounded shape, wider at bottom
- Belly: `#ddbbcc` lighter oval on front
- Dark eyes: `#331122` small circles
- Tusks: small `#eeeecc` nubs
- Movement: slight bobbing up-down animation as they walk
- On ice rebuild: sparkle effect as block reforms behind them

**Ice Blocks:**
- Standard: crystalline treatment described above — deep blue base, bright top highlight, internal shine patch, crack details
- When breaking: block shatters into 6 triangular ice shard particles, `#88ccff` color, spin outward and fade
- When Topi rebuilds: sparkle particles appear around block, `#aaddff` dots

**Summit blocks:** Gold `#ddaa33` with bright top highlight `#ffee66`, subtle warm glow `rgba(255,220,80,0.2)` beneath block. The summit platform should pulse gently with a golden aura.

**Fruits (collectibles):** Each fruit gets a bright glow halo in its color:
- Eggplant: `#9944ff` with purple glow
- Carrot: `#ff8800` with orange glow
- Cabbage: `#44cc44` with green glow
- Mushroom: `#ff4444` with red glow
All fruits slowly rotate 360° (for visibility and appeal). On collect: burst of 6 colored sparkle particles.

**Condor (summit):** Bright golden `#ffcc44` with strong glow `rgba(255,200,60,0.4)`. Wings animate up-down. On catch: screen flash + particles.

### Particle & Effect System

- **Hammer swing arc:** Curved bright line `rgba(200,230,255,0.5)` following hammer head sweep, fades in 0.15s
- **Ice break shard burst:** 6 angular ice shards `#88ccff`, spin + fade, life 0.4s
- **Ice break dust:** 4 white puff particles `rgba(255,255,255,0.4)`, drift upward, life 0.3s
- **Block rebuild sparkle:** 8 small cyan dots `#88ffff` appear around reforming block, pop-in animation
- **Fruit collect burst:** 6 star particles in fruit color, life 0.3s, scale up then fade
- **Summit reach:** 12 golden particles `#ffee66` burst from summit, screen brightness flash
- **Snow drift particles:** Ambient 4 particles per frame falling diagonally, very faint
- **Player footstep dust:** 2 small dust puffs `rgba(200,200,255,0.3)` per landing step
- **Height indicator glow:** Progress bar right side pulses subtly as player climbs

### UI Polish

- Height progress bar (right side): Slim bar `#6688aa`, fill `#88ccff`, with player position dot `#ffffff` + glow. Summit gold indicator `#ffee66` at top.
- Score display: Top-left, white numerals `#ffffff` with slight blue glow `rgba(136,204,255,0.4)`
- "SUMMIT!" text: Golden `#ffee66` large bold text with glow, animates in from top on summit reach
- Player lives: Popo silhouette icons top-right, in parka blue `#3366ff`
- Game over screen: Frost-effect dark overlay, "GAME OVER" in icy `#88ccff` text with glow
- Stage clear banner: Center screen wipe in gold

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Footstep on ice | Short click | 800Hz triangle, gain 0.2 | 0.04s | Crisp tap |
| Hammer swing | Whoosh | White noise, highpass 2000Hz, gain 0.3 | 0.12s | Air swipe |
| Hammer hit ice | Impact crack | White noise burst, bandpass 1500Hz Q2, gain 0.5 | 0.15s | Ice crack |
| Ice block break | Shattering | White noise, lowpass 600Hz sweep down, gain 0.6 | 0.3s | Breaking ice |
| Block rebuild | Crystal chime | 880Hz sine, gain 0.25 | 0.2s | Tinkle |
| Fruit collect | Ascending blip | 660Hz → 990Hz triangle, gain 0.4 | 0.15s | Pickup chime |
| Topi appear | Low growl | 100Hz triangle, gain 0.3 | 0.3s | Enemy grunt |
| Player jump | Spring boing | 300Hz → 500Hz sine, gain 0.35 | 0.2s | Bounce |
| Summit reach | Golden fanfare | C5-E5-G5-C6 arpeggio, sine, gain 0.6 | 0.7s | Victory |
| Player fall death | Descending whistle | 400Hz → 50Hz sine, gain 0.4 | 0.8s | Fall sound |
| Condor catch | Triumphant chord | C4+E4+G4 simultaneous, sine, gain 0.5 | 1.0s | Bonus fanfare |
| Wind (ambient) | White noise lowpass | cutoff 300Hz, gain 0.06 | Looped | Alpine wind |

### Music/Ambience

Bright, brisk chiptune-inspired procedural loop:
- Lead: Triangle wave at 523Hz (C5), simple 8-note melody looping over 4s: C-E-G-E-C-A-G-E, each 0.5s, gain 0.15
- Harmony: Triangle at 330Hz (E4) following the same rhythm offset by one note
- Bass: Square wave at 130Hz (C3), playing root notes: C-C-A-A-G-G-F-F each 1s, gain 0.12
- Tempo: 120BPM. As player climbs higher (above 70% summit), increase tempo to 140BPM and add a hi-hat (white noise burst 8000Hz bandpass, gain 0.1, every 0.25s)
- Cold, light, and energetic — evokes snowy mountain adventure

## Implementation Priority

- High: Crystalline ice block rendering (layered highlights, crack details), ice shard burst on break, hammer swing arc, player redesign with fabric detail, all core game sounds
- Medium: Three-layer sky background with altitude gradient, snow drift particles, fruit glow halos + collect bursts, summit golden glow pulse, chiptune music loop
- Low: Mountain silhouette parallax, star field at high altitude, block rebuild sparkle particles, Topi bobbing animation, height progress bar pulse
