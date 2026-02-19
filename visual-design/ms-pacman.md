# Ms. Pac-Man — Visual & Sound Design

## Current Aesthetic

Classic Pac-Man maze structure with blue line-drawn walls on near-black (#0a0a3e). Dots in pink (#ffb8ff). Power pellets pulse with pink glow. Ms. Pac-Man is yellow with a red bow/ribbon above her head and a beauty mark. Ghosts have proper dome + wavy skirt shapes in their classic colors (red, pink, cyan, orange). Frightened ghosts go dark blue with white dot eyes and wavy mouth. Fruit as colored circles with leaf/stem. Four different maze layouts rotate by level. The dot colors and bow are good Ms. Pac-Man references. Wall color is very dark blue.

## Aesthetic Assessment
**Score: 3.5/5**

The maze structure is correct and the ghost shapes are well-executed. Ms. Pac-Man's bow is a nice distinguishing touch. But walls are too dark and flat (no interior color difference from the black background), dots are too dim, and the overall palette lacks the bright arcade pop of the original. The ghost eyes could be more expressive. Power pellet effect is barely visible.

## Visual Redesign Plan

### Background & Environment

The maze background transforms into a deep neon retro-arcade aesthetic. The "empty" space inside the maze is true black (`#000000`). Walls get a dramatic glow treatment.

**Wall redesign:** Walls are drawn as filled solid rectangles in deep indigo (`#1a0a5e`) with a bright neon blue border (`#4080ff`) on all exposed edges. The border glow is set at 0.6 intensity for the current maze color (each maze level gets a different wall color):
- Maze 1: Blue (`#4080ff`) — classic arcade blue
- Maze 2: Magenta (`#cc44cc`) — hot pink
- Maze 3: Teal (`#44ccaa`) — sea green
- Maze 4: Gold (`#ddaa00`) — warm yellow

Wall interiors have a subtle diagonal line texture (two 1px lines at 45° per 8×8 block, drawn very faint in a slightly lighter version of the wall fill).

**Floor:** The path cells have an extremely faint grid (0.5px lines every 16px in `#0a0a0a`) — barely visible but gives texture to the empty maze.

**Ghost house:** The central ghost house area has a slightly warmer tint (`#050a10`) to distinguish it. The door bar (currently pink, #f9b) is redesigned as a blinking two-tone gate — alternating pink and white, flashing at 0.5Hz.

Add a persistent "horizon glow" — a soft wide light bloom at the horizontal center of the maze (approximated as a large translucent rect, `#2030ff06`, spanning full width) that suggests the arcade cabinet's ambient backlight.

### Color Palette
- Background: `#000000`
- Wall fill: `#0a0640`
- Wall border (maze 1): `#4080ff`
- Wall border (maze 2): `#cc44cc`
- Wall border (maze 3): `#44ccaa`
- Wall border (maze 4): `#ddaa00`
- Dot: `#ffaaff` (brighter pink)
- Power pellet: `#ff88ff` with `#ff00ff` glow
- Ms. Pac-Man: `#ffdd00`
- Bow: `#ff2222`
- Glow/bloom: varies by maze color

### Entity Redesigns

**Ms. Pac-Man:** Keep the yellow disc + mouth animation but make her larger (use the full T/2 - 0 radius instead of -1). The bow gets more detail: a proper ribbon with two rounded lobes instead of flat triangles. Add a subtle golden body gradient — the leading edge of her body is slightly lighter (`#ffee44`) and the trailing edge slightly darker (`#ddaa00`). Eye: larger, with a white highlight dot. Beauty mark stays.

On power mode (after eating pellet): brief flash of bright white → back to yellow, with a crown glow (#ffdd00 at 1.0 intensity for 3 frames).

**Dots:** Larger (3px radius instead of 2px). Brighter pink (`#ffaaff`). Extremely brief "twinkle" when collected — a 2-frame white flash at the dot position.

**Power pellets:** Radius 7px (was 5px). Glow at 0.8 intensity. Pulse animation is more dramatic — varies from radius 5 to 9 using sinusoidal breathing. Color cycles slightly between `#ff88ff` and `#ffffff` at the pulse peak.

**Ghosts:** More polished. The dome (top arc) gets a specular highlight — a small white filled circle (radius 3) at the top-left of the dome. The wavy skirt bottom animates with slightly more range (±4px instead of ±2px). Each ghost's eyes get sclera (white filled ellipses), colored iris rings (matching their body color but lighter), and dark pupils that shift toward the nearest player path target.

Ghost colors:
- Blinky (red): keep #f00, brighter highlights at #ff4444
- Pinky: keep #f9b, upgrade to #ff88bb
- Inky (cyan): keep #0ff, upgrade to #44ffee
- Clyde (orange): keep #f80, upgrade to #ff9922

**Frightened ghosts:** Dark navy body (#2233aa) instead of current #22f. Eyes become swirling spirals (drawn as two small arcs). Mouth is a more expressive zig-zag. In the final 3 seconds of frightened mode, the flashing alternates between the frightened navy and each ghost's own color (not white), making it clearer which ghost is about to recover.

**Fruit:** Each fruit type gets a proper miniature sprite instead of a circle:
- Cherry: two red spheres with stem (miniaturized Mr. Do cherry design)
- Strawberry: textured with seed dots
- Orange: ribbed sphere
- Etc. — all drawn with highlight spots for a 3D rounded look.

### Particle & Effect System

**Dot eating:** Each dot consumed emits 2-3 tiny pink sparks (1px circles) that drift outward and fade over 5 frames. These are very subtle — just enough to register as satisfying feedback.

**Power pellet eaten:** Ring of 8 bright cyan sparks radiates outward. Ms. Pac-Man briefly grows (draw at 1.3x size for 3 frames) suggesting the power rush.

**Ghost eaten:** Instead of just a score popup, the ghost "pops" — its body rapidly scales up to 2x then disappears over 4 frames, replaced by floating eyes that move toward home. Score text (+200/400/800/1600) bursts outward from the center in the ghost's color.

**Ms. Pac-Man death:** Existing animation is good (closing wedge). Add: during the collapse, red particles fly outward from her position. The maze dims (fillRect overlay at 0.3 opacity) while the animation plays, focusing attention.

**Level clear:** All dots cleared triggers a rapid white flash (3 frames), then the entire maze border glows bright for 30 frames, then slowly dims as the next level loads.

### UI Polish

- "READY!" text improved: larger (20px), gold with warm glow, bouncing scale animation.
- Ghost score popups (200/400/800/1600) styled with the respective ghost's color and a glow.
- Lives display redesigned: Ms. Pac-Man silhouettes (small, facing right) instead of numbers, arranged horizontally in the external lives display.
- Fruit icon appears with a brief "pop" entry animation (scales from 0 to full size over 8 frames).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Dot eating | Very short sine click | 440Hz alternating with 330Hz each eat | 15ms | Classic waka-waka character. Alternate pitch each dot. |
| Power pellet | Ascending sine + glow | 220→880Hz sweep | 200ms | Power-up whoosh. |
| Ghost eaten | Descending electronic tone | 660→110Hz sine, heavy decay | 300ms | Satisfying "got it" sound. |
| Ghost frightened (loop) | Low tremolo sine | 200Hz ±15Hz at 5Hz rate | Loop | Background during power mode. Volume 0.03. |
| Frightened ending | Rapid ascending beeps | 440Hz, 660Hz, 880Hz alternating quickly | Loop | Warning alarm, last 3 seconds. |
| Ms. Pac-Man death | Classic descending fanfare | C5-B4-A4-G4-F4-E4-D4-C4 | 1200ms | Iconic death sound, sine waves. |
| Level clear | Jingle | G4-G4-G4-E4-G4-G4-G4-C5 | 800ms | Celebratory. |
| Fruit collected | Double blip | 880Hz + 1320Hz, 100ms each | 200ms | Reward sound. |
| Extra life | Rising arpeggio | C4-E4-G4-C5 | 400ms | Volume 0.3. |
| Ghost returning home | Faint rapid clicks | 200Hz square wave, 30ms each | Per bounce | Quiet ghost eyes movement sound. |
| Game start | Classic opening tune | C-E-G-C major arpeggio + melodic phrase | 1500ms | Faithful to arcade style. |

### Music/Ambience

The siren: a sine wave at 220Hz that slowly oscillates up (to 280Hz) and back down as ghosts chase. This is the classic Ms. Pac-Man "presence" sound. Volume 0.04. During power mode, the siren stops and the frightened tremolo replaces it. The siren is an essential part of the game feel.

Between the waka-waka of eating and the siren, no additional music is needed. The rhythm of play creates its own music.

## Implementation Priority
- High: Wall glow system with per-maze colors, dot eating particle sparks, power pellet breathing animation, ghost frightened color improvement
- Medium: Ghost specular highlights + more expressive eyes, Ms. Pac-Man golden gradient body, fruit sprite redesigns, waka-waka alternating pitch sound
- Low: Maze interior diagonal texture, ghost house two-tone gate, death particle burst, level-clear border glow effect, "READY!" bounce animation
