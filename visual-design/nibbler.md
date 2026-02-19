# Nibbler — Visual & Sound Design

## Current Aesthetic

Dark background with a blue grid (#0f3460 wall blocks with #16213e inner highlights). Snake in bright green (#4f6) with gradient body fading toward tail. Snake head has white eyes with dark pupils oriented by direction. Food as pulsing yellow circles with glow. HUD bar at top with level/lives/time/food count. Timer turns red under 10s. Walls are clean and visible. Overall very similar to Snake — the Nibbler-specific elements (maze walls, food count, time limit) are functional but the visual identity is thin.

## Aesthetic Assessment
**Score: 2.5/5**

Clean and readable but generic. The maze wall system is the core Nibbler differentiator and it's rendered adequately but without personality. The snake is well-drawn (gradient body, eye direction). But food items lack visual appeal beyond a basic glow circle, the maze walls have no texture or character, and there's no ambient life to the world.

## Visual Redesign Plan

### Background & Environment

Transform into a neon-tube arcade maze. The background is true black (`#000000`). Grid lines are removed entirely. Walls become glowing neon tubes — thick (full CELL width), with a bright colored border that glows intensely. Each maze level gets a different wall color scheme:

- Level 1: Electric blue tubes (`#0055ff` with `#4499ff` glow)
- Level 2: Hot pink tubes (`#ff0088` with `#ff44cc` glow)
- Level 3: Acid green (`#00ff44` with `#44ff88` glow)
- Level 4: Deep orange (`#ff6600` with `#ffaa44` glow)
- Levels 5-8: Cycle through these palettes with intensity increasing

Each wall tile is drawn as:
1. Full dark background rect (`#060606`)
2. Outer colored rect (wall color, full CELL size)
3. Inner dark rect (CELL-4 size, creating a 2px neon border effect)
4. Top face (lighter wall color, CELL×3 rect at top — like a tube highlight)

The border outer boundary (edge walls) are drawn slightly thicker with a stronger glow, making the maze feel enclosed.

A very faint scanline effect (horizontal 1px translucent lines every 2px in `#00000020`) overlays the entire canvas for CRT authenticity.

### Color Palette
- Background: `#000000`
- Wall (level 1): `#0044cc` fill, `#2266ff` border
- Wall (level 2): `#cc0066` fill, `#ff22aa` border
- Wall (level 3): `#006622` fill, `#00ff44` border
- Wall (level 4): `#cc4400` fill, `#ff6600` border
- Snake head: `#00ffcc`
- Snake body: fades `#00ffcc` → `#006655`
- Food: `#ffdd00` primary, `#ffffff` at pulse peak
- HUD text: level color (matches wall)
- Timer (urgent): `#ff2222`
- Glow/bloom: matches level wall color

### Entity Redesigns

**Snake:** Major upgrade. Head becomes a proper snake face:
- Rounded front (filled circle, not rect)
- Forked tongue: when moving, a small Y-shape (two short 1px lines) protrudes from the front of the head, flickering rapidly (every 3 frames)
- Eyes: remain white with dark pupils but add a subtle slit pupil (2 overlapping circles to make an oval pupil)
- Head glow: 0.8 at `#00ffcc`

Body segments get smoother transitions — instead of individually drawn rects, each body segment fills the gap to the next segment with a connecting rect along the direction of movement, preventing gaps at corners. Body color fades from bright cyan at the segment just behind the head to dark teal near the tail. The outermost 3 tail segments fade to near-transparency.

**Food items:** Replace plain pulsing circles with rotating geometric shapes. Each food is a spinning "star burst" — an 8-pointed shape drawn as overlapping short lines radiating from center. The rotation speed is 2°/frame. Outer tips glow brightly; inner center is darker. Colors match the level wall theme (complementary to wall color — e.g., gold against blue walls). On the game-over time-out, remaining food items flash red rapidly.

**Level transition:** Keep the overlay but add: all food items simultaneously explode outward (particles), the maze walls "power down" (glow fades over 10 frames), then rapidly re-light in the new level's color scheme.

**HUD bar:** Redesign as a proper arcade scoreboard. The top strip has:
- Level number with the level's neon color, styled as "L-03"
- Heart icons for lives (not unicode — draw tiny heart polygons in red)
- Time counter styled as countdown clock digits, red when urgent
- Food remaining shown as "◆ N left" where ◆ is a small rotated square in gold

### Particle & Effect System

**Food eaten:** 8-12 gold sparks radiate from eat position. Score "+10xL" text floats upward in white, fading over 20 frames. A brief ring of light expands from eat point (fillCircle with expanding radius, decreasing opacity over 6 frames).

**Wall collision death:** The snake head "splats" against the wall. 10-15 particles in the snake's color spray backward from the head. The head briefly flashes white, then the death overlay appears.

**Self-collision death:** Similar to wall death but particles spray in multiple directions (head and the body segment it hit both emit particles).

**Level complete:** All remaining food items pulse once brightly, then an expanding wave of bright rings sweeps across the maze from the position of the last eaten food. Snake body briefly glows white before transition.

**Food countdown (last 3s):** All remaining food items start flashing red/gold alternately. A brief siren sound intensifies.

### UI Polish

- When time runs below 10s, the HUD timer flashes (already does) and the background gets a very faint red tint pulse (`#ff000010` overlay) synchronized with the flash.
- Level number animates when increasing: zooms in large then settles.
- Snake eye direction is already good — ensure tongue flicker adds personality.
- Lives hearts: when one is lost, a brief "broken heart" effect (the heart cracks into two pieces that fall off screen over 10 frames).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Snake move (tick) | Very short sine | 440Hz (at low speed) → 880Hz (max speed), 15ms | Per move | Tempo matches movement speed. |
| Food eaten | Bright ascending sine | 660→1320Hz over 80ms | 80ms | Satisfying nom sound. |
| Wall collision | Heavy noise burst | White noise, instant full volume then decay | 300ms | Crash impact. |
| Self collision | Same as wall + lower pitch | 150Hz sine added | 300ms | More crunch. |
| Level complete | Ascending arpeggio jingle | Level-appropriate key, 5 notes | 600ms | Celebratory. |
| Timer tick (last 10s) | Alternating beeps | 660Hz and 440Hz, 50ms each per second | Every second | Heart-pounding countdown. |
| Time out (death by timer) | Descending tone + silence | 440→110Hz sawtooth over 1s | 1000ms | Game over "power down." |
| New level intro | Short fanfare | Quick ascending chord | 400ms | Maze power-up sound. |
| Life lost (non-game-over) | Quick sad blip | 330→220→110Hz | 300ms | Less severe than game over. |
| Food spawning | Quiet chime | 1760Hz sine, 50ms | 50ms | Subtle ping when food appears. |

### Music/Ambience

An urgent neon-arcade ambient: a rapidly cycling arpeggio at the root pitch of the level's musical key (e.g., blue=A, pink=D, green=G) played very quietly (0.02 volume) on a slightly detuned saw wave pair — giving an 80s arcade synth feel. The arpeggio tempo starts at 4Hz (one note per 250ms) and gradually increases as the player advances through the level. No drums — the snake movement ticks provide the rhythm. The arpeggio stops during death/transition.

## Implementation Priority
- High: Neon tube wall design (glow borders, level color coding), snake rounded head with tongue, food item star-burst spinner, particle burst on food eaten
- Medium: Body segment gap-filling for smooth turns, wall collision particle splat, countdown timer red tint overlay, level color palette cycling
- Low: HUD heart icons, level-transition wall power-down animation, food countdown flash, life-lost broken heart animation, timer tick sound
