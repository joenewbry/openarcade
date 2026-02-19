# Breakout — Visual & Sound Design

## Current Aesthetic
A classic Breakout layout: 8 rows of 10 bricks in a rainbow progression (red, orange, yellow, green, cyan, blue, purple, magenta — top to bottom). Each brick is a solid filled rectangle of the row's color, with a glow matching the brick color at 0.4 intensity. The paddle is orange with a bright orange glow (0.7). The ball is white with an orange glow. Lives are shown as small orange circles in the bottom-right. The background is completely black (the default canvas). The overall look is minimal — accurate to the original but visually sparse.

## Aesthetic Assessment
The rainbow brick grid is faithful and reads well. The colored glow on each brick creates a neon arcade look. But the black void background, the completely plain bricks (no depth, no detail), and the absence of any atmosphere make this feel like a very early prototype. Breakout deserves to feel like a thrilling arcade cabinet — vibrating with energy, every brick break satisfying, every near-miss heart-pounding.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Replace the black void with a dynamic arcade-machine atmosphere:

**Background:** A deep dark gradient: near-black at the very top (`#04040a`), transitioning to a very dark purple-navy at the bottom (`#0a0818`). Subtle vertical scanlines at 10% opacity (every 2px, alternating 100%/90% brightness) evoke a CRT display — the game's natural home.

**Brick zone backdrop:** Behind the brick grid, a very faint glow emanates from the entire brick area — a soft multicolor ambient light, as if the bricks are illuminated from within and casting their colors onto the screen glass.

**Side gutters:** The left and right 10px margins get a faint reflective effect (very dark mirror of the adjacent bricks' color) — like the arcade cabinet's inner walls reflecting the screen.

**Paddle zone:** A faint horizontal line of ambient glow sits just below the paddle position, suggesting a surface the paddle slides across.

### Color Palette
- Brick row 1 (top): `#ff2222`
- Brick row 2: `#ff7700`
- Brick row 3: `#ffee00`
- Brick row 4: `#00ee44`
- Brick row 5: `#00ddff`
- Brick row 6: `#1166ff`
- Brick row 7: `#9944ff`
- Brick row 8 (bottom): `#ff44cc`
- Paddle: `#ff8800`
- Ball: `#ffffff`
- Background top: `#04040a`
- Background bottom: `#0a0818`
- Glow bloom: row-matched

### Entity Redesigns
**Bricks:** Each brick gets a 3D beveled treatment:
- Main fill: the row's color
- Top edge: 2px lighter shade (the "lit face")
- Bottom edge: 2px darker shade (the "shadow face")
- Left edge: 1px lighter shade
- Right edge: 1px very dark shade
- A small bright "candy shine" in the upper-left third of each brick (a 30% width × 30% height white rectangle at 20% alpha)

This creates the look of colored plastic or candy tiles — matching the Atari 2600 Breakout's distinctive block style.

**Paddle:** Redesigned as a sleek glowing paddle:
- Main body: dark to light gradient (darker center, brighter edges) using two fillRect passes
- Bright top edge: 2px white line at 60% alpha — the ball-contact surface
- A subtle "power" indicator that lights up brighter when the ball is moving fast
- Subtle internal glow that pulses slightly with the ball's current velocity

**Ball:** A perfect bright white sphere illusion:
- Filled white circle with a 2px radius cyan inner circle (inside the ball, slightly offset — the refraction gleam)
- The ball leaves a brief motion trail: 3 ghost positions behind it at 30%/20%/10% alpha, fading as the ball moves faster

**Lives indicator:** Instead of plain orange circles, the lives are displayed as small paddle silhouettes (rectangles with rounded corners) in the bottom-right. A "×3" count next to them.

### Particle & Effect System
**Brick break:** This is the most important visual. When a brick is destroyed:
1. The brick flashes white for 2 frames (full bright fill)
2. 8-12 particles burst outward from the brick center — a mix of the brick's color and white, varying sizes (2-6px squares at random angles)
3. Some particles are "sparks" — bright white dots that fade quickly (6 frames)
4. Other particles are "chunks" — the brick's color, moving slower and lasting 20 frames
5. The screen briefly flickers (entire canvas dims to 80% for 1 frame) on brick breaks in the top 2 rows (high-value)

**Paddle hit:** A horizontal "energy ripple" across the paddle — the hit point glows brightly for 4 frames and the glow spreads left/right along the paddle's length.

**Wall bounce:** A brief bright flash at the wall contact point (a small 6px white circle, fades over 4 frames).

**Ball lost:** A red vignette floods the screen corners for 0.5 seconds (radial dark red overlay). The ball leaves a red trail as it falls below the paddle.

**Level clear:** All remaining bricks simultaneously flash and explode in a synchronized burst. The ball grows 150% and spins faster for 30 frames.

### UI Polish
Score display: large bold text with a subtle glow matching the most recently broken brick's color. Level indicator: shows with a star symbol. Timer/lives area: clean minimal design. When a level is cleared, the next level number appears with a dramatic scale-in animation at the center of the screen.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Brick break (bottom rows) | Low tick | 200Hz square, short | 0.06s | Classic low blip |
| Brick break (mid rows) | Mid tick | 300Hz square | 0.06s | Classic medium blip |
| Brick break (top rows) | High tick | 440Hz square | 0.06s | Classic high blip — closer to top = higher |
| Paddle hit | Thud | 150Hz square, 0.08s | 0.1s | Satisfying paddle thwack |
| Wall bounce | Click | 800Hz sine, very short | 0.04s | Wall ricochet |
| Ceiling hit | High click | 1200Hz sine | 0.03s | Top wall ping |
| Ball lost | Descend | 400→100Hz sine sweep | 0.6s | Falling tone |
| Level clear | Fanfare | 523+659+784+1047Hz arpeggio | 1.0s | Triumphant scale |
| Game over | Failure | 261+220+196Hz descending | 1.2s | Sad chord |

### Music/Ambience
Breakout traditionally has no music — the sound effects ARE the music. The satisfying rhythm of brick-break-paddle-wall-paddle becomes its own percussion. To enhance this: when playing a continuous sequence, the brick break pitches escalate (each consecutive break within 2 seconds raises the pitch by +10%). This creates a natural crescendo as the player goes on a run. The tone frequencies match the original Atari 2600 behavior: TIA sound chip style square wave with pitch tied to brick row (higher row = higher pitch), rewarding skill by making runs sound musical.

## Visual Style
**Style:** Retro CRT
**Rationale:** Paddle games originate from the 1976 Atari 2600 era. Scanlines, phosphor bloom, and candy-colored bricks on a dark CRT background evoke the authentic arcade cabinet feel. The beveled 3D bricks read as colored plastic tiles under screen glass.

## Implementation Priority
- High: Brick break particle burst with sparks and chunks, ball motion trail, brick beveled 3D rendering
- Medium: Background scanline effect, paddle energy ripple on hit, ball lost red vignette
- Low: Consecutive-break pitch escalation, level-clear synchronized brick explosion, wall/ceiling flash at bounce point
