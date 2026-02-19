# Dr. Mario — Visual & Sound Design

## Current Aesthetic
A Tetris-style matching puzzle game on a 280x544 canvas with a 8x16 grid of 32px cells. The game takes place inside a medicine bottle outline drawn in pink/lavender (`#f4c`). Three colors: red (`#f44`), yellow (`#ff0`), blue (`#48f`). Viruses are circles with spiky arms radiating out and a simple face (dot eyes, mouth line). Pills are two-segment rounded rectangles in the two-cell combinations. A next-piece preview shows in a separate area. A ghost piece shows where the pill will land. The score uses standard text. The overall aesthetic is clean and functional but lacks the warm, cartoonish Dr. Mario charm — the viruses are clinical, the bottle has no character, and there are no visual cues to the medical theme beyond the bottle outline.

## Aesthetic Assessment
**Score: 2.5/5**

The mechanical clarity is good — three distinct colors, clear ghost piece, readable grid. But the presentation misses the playful medicine-cabinet world of the original. The bottle needs character, viruses need personality and differentiation, pills should look more pharmaceutical, and the background should evoke a body-under-siege atmosphere.

## Visual Redesign Plan

### Background & Environment
Lean fully into the "microscopic world inside a body" medical fantasy:

**Background**: A soft organic pink gradient `#3a0a18` at edges fading to `#1a0810` at center — suggesting the interior of a body cavity. Small bubbles (circles, r=2–4, alpha=15%) drift upward slowly at random speeds — cellular fluid atmosphere. Very faint hex-grid texture at 5% opacity suggests biological cell structure.

**Bottle**: The medicine bottle gets a full makeover. The outline thickens and gets a 3D glass appearance — left edge has a bright white highlight strip `#ffffff` at 60% alpha (glass reflection). The bottle body is slightly translucent purple-tinted `#8844aa` at 10% alpha, revealing the grid beneath. The bottle cap at top is a red-orange solid cap shape `#cc3300` with a childproof-lock ring detail. The label area on the bottle exterior has "DR. MARIO" in small segmented text.

**Grid floor/walls**: The cell boundaries at the edge of the grid (inside the bottle) have a subtle inner glow in the respective pill/virus color when cells are occupied — giving each column a stained-glass look as they fill.

**Dr. Mario portrait**: In the right panel (next piece area), a small pixel-art portrait of Dr. Mario (white coat, stethoscope, round glasses, black hair) updates his expression: neutral when idle, thumbs-up on a clear, shocked on virus growth.

### Color Palette
- Background edge: `#3a0a18`
- Background center: `#1a0810`
- Bottle glass tint: `#8844aa` at 10% alpha
- Bottle highlight: `#ffffff` at 60%
- Bottle cap: `#cc3300`
- Virus red body: `#ee2222`
- Virus yellow body: `#ffcc00`
- Virus blue body: `#2244ee`
- Virus dark eye: `#220000`
- Pill red: `#ff3333`
- Pill yellow: `#ffdd00`
- Pill blue: `#3355ff`
- Pill highlight: `#ffffff` at 40%
- Ghost piece: `#ffffff` at 20%
- Grid line: `#3a1a2a`
- Clear flash: `#ffffff`
- Score text: `#ffddff`
- UI panel: `#1a0a1e`

### Entity Redesigns
**Viruses**: Each color has a distinct personality, not just recolored versions of the same design:
- **Red Virus**: Angry face — thick angry eyebrows, scowling mouth, spiked arms pointing outward aggressively. Color `#ee2222` with darker `#aa0000` spikes. Pupils are bright white with red irises.
- **Yellow Virus**: Smug/mischievous face — arched eyebrow, smirk. Yellow `#ffcc00` with orange `#cc8800` spikes. Pupils are dark with a small gleam dot.
- **Blue Virus**: Scared/nervous face — wide circular eyes, wavy mouth, arms raised in fear. Blue `#2244ee` with dark-blue `#0022aa` trembling spikes. Pupils large and worried.

All viruses have a subtle pulsing animation — their spike arms oscillate ±2px from neutral, and their face expressions twitch every 60 frames with a brief alternative pose (the angry virus briefly shows a toothy grin, etc.).

**Pills**: Fully pharmaceutical. Each half-segment is a capsule shape — a rectangle with hemispherical caps at each end in the exterior facing direction. A bright highlight arc runs along the upper-left of each capsule half (specular pharmaceutical shine). The junction where two halves meet has a thin dark line and a subtle shadow. Horizontal pills show both capsule halves side by side; vertical pills stack them.

**Ghost piece**: Instead of a faint outline, the ghost shows as a fully transparent capsule at 20% alpha with white edges — pharmaceutical X-ray effect.

**Next piece display**: A dedicated panel with a rounded frame that shows the next pill in proper capsule form, with a subtle rotation animation (slowly spinning 5 degrees left/right).

### Particle & Effect System
- **Virus clear**: When a matching group of 4 is completed, each matching virus pops in sequence (chain): a bright flash of its color (`#ffffff` → virus color), then 8 small spike-shaped fragments scatter radially and fade over 15 frames. A brief "DESTROY!" text fragment appears in the virus's color and floats up.
- **Pill landing**: Soft thud — a small circle of 4 pale dots radiates from the landing position.
- **Line clear / combo**: When multiple viruses clear simultaneously (chain reaction), each cleared cell flashes white in sequence, and a large "+COMBO" text in gold rises from the grid center. For 4+ simultaneous: a burst of colored confetti (tiny rectangles in all three colors) fills the bottle interior.
- **Level complete**: All viruses gone — the Dr. Mario portrait in the panel does a celebrating animation (arms raised). The bottle briefly fills with white bubbles rising upward. "VIRUS CLEAR!" text appears in large bright letters.
- **Speed increase**: As levels advance, a brief "SPEED UP!" overlay pulses with an orange glow.
- **Pill drop (fast drop)**: Trailing ghost after-images (3 fading capsule outlines) briefly appear below the pill as it falls fast.

### UI Polish
- Score panel: styled as a medical chart clipboard — off-white `#f8f0e8` with dark ink text, rounded corners, a small clip at the top. Score and level rendered in a clinical monospace style.
- Level indicator: a series of small virus icons that progressively fill as level advances — each filled icon is a cleared (dark/faded) virus, making a progress bar of tiny characters.
- "NEXT" label above the preview pill uses a blue medical-font style.
- Speed indicator at top: a small speedometer arc shape that fills as speed increases from LOW → MED → HI → SUPER.
- Pause overlay: the bottle cap descends partially over the bottle when paused — a clever visual metaphor.
- Game over: the bottle cap pops off and the word "GAME OVER" emerges on a scroll.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pill rotate | Short snap: square 600 Hz, hard attack | 40ms | Crisp click |
| Pill move horizontal | Soft tick: triangle 400 Hz | 20ms | Gentle nudge |
| Pill land | Soft thud: sine 120 Hz + brief noise | 80ms | Capsule drop |
| Pill hard drop | Heavier thud: sine 80 Hz + longer noise | 120ms | Decisive slam |
| Virus match (single) | Pop: sine 600 Hz, fast attack/decay | 80ms | Satisfying pop |
| Virus chain (each link) | Rising pitch per link: sine 600 Hz + 80 Hz per link | 80ms each | Chain excitement |
| Virus clear (all 4) | Multi-pop burst: 4 staggered sine pops 600→900 Hz | 300ms | Grand finale |
| Combo (multi-color) | Chord: sine C5 + E5 + G5 together | 200ms | Triumphant harmony |
| Level clear | Ascending 5-note fanfare: sine C5 D5 E5 G5 C6 | 500ms | Victory march |
| Game over | Descending minor: sine A4 → F4 → D4, slow | 1000ms | Medical alarm tone |
| Speed up warning | Rising two-tone alarm: triangle 440 Hz + 660 Hz alternating | 400ms | Urgency signal |
| Next piece preview | Soft chime: triangle 880 Hz | 50ms | Glance indicator |

### Music/Ambience
A chiptune-style Dr. Mario soundtrack approximated with Web Audio oscillators:

1. **Main theme (Fever)**: Recreated as a repeating 16-note melody in C major using square oscillators — the iconic "Fever" melody. Tempo 140 BPM. Volume modest. Uses two oscillators: melody voice (square) and bass voice (triangle, one octave down). The melody plays for 8 bars then repeats.
2. **Chill mode (between drops)**: When no piece is actively falling (not applicable here since pieces are always active), the bass voice drops out and only melody continues.
3. **Level clear jingle**: The main melody pauses, a celebratory 5-note ascending run plays, then the melody resumes in the new level.
4. **Virus threat escalation**: As the bottle fills with more viruses (increasing density), the melody's tempo creeps up by 5 BPM per 20% fill — the music speeds up as the situation gets more desperate.
5. **Bubble ambience**: Underneath the music, very faint biological ambience: bandpass noise at 300 Hz (very low gain 0.02) simulating the cellular fluid environment.

## Implementation Priority
- High: Distinct virus personality per color (angry/smug/scared expressions), pharmaceutical pill capsule shape with highlight arc, virus pop chain animation, bottle 3D glass highlight
- Medium: Organic background with drifting bubbles, chain reaction colored confetti, level-clear bottle-fill animation, score clipboard UI panel
- Low: Dr. Mario portrait in panel with expression changes, bottle-cap pause animation, hex-grid cell structure background, speed escalation visual overlay
