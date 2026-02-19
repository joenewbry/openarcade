# Stratego Digital — Visual & Sound Design

## Current Aesthetic

A 10x10 grid board game. The board is dark slate-blue (`#141e30`) with dark grid lines. Lake cells are `#0d2844` with horizontal wave lines. Player pieces are bright blue rectangles with rank numbers and abbreviations; AI pieces are identical but in red when revealed. Unknown AI pieces show "?" in dark blue. Valid move highlights are green/red tinted cells. A battle popup uses a themed border. The captured panel shows tiny colored pieces. The status bar and overall UI are clean and readable but the board feels flat and sterile.

## Aesthetic Assessment
**Score: 2/5**

The layout is solid and the dual blue/red faction colors work. The board lacks tactile depth — it looks digital rather than like a physical game. The lake cells are decent. Pieces need personality and the overall color scheme needs warmth and drama to evoke a field-of-war feeling.

## Visual Redesign Plan

### Background & Environment

**Canvas background**: Deep forest-green felt suggestion — `#0a1a0a` with a subtle weave texture (alternating horizontal single-pixel lines at 3% opacity in slightly lighter green). The non-board area around the sides gets a darker frame suggesting a game box edge.

**Board**: Change board background from cold slate-blue to a warm cream-parchment `#d4b896` (like aged map paper) with darker amber grid lines `#b08060`. This immediately reads as a "game board" rather than a digital interface. The board background alternates very slightly between cells — odd cells at 100% parchment, even cells at 97% — creating a subtle chessboard texture.

**Lake cells**: Deep midnight blue `#0a1a3a` with animated water shimmer — horizontal highlights at different positions that oscillate slowly (sin(time + x*0.1)). Small reflection flecks (white dots at 20% alpha) scattered on the surface.

**Board edge**: A thick dark wooden border (multiple nested rects of decreasing lightness from `#5a3010` to `#3a1e08`) surrounds the entire board, with corner ornaments (diamond shapes at each corner).

### Color Palette
- Player pieces: `#2255cc` (royal blue)
- Player border: `#4488ff`
- AI pieces: `#cc2222` (battle red)
- AI border: `#ff5555`
- Board parchment: `#d4b896`, `#c8aa80`
- Board grid: `#b08060`
- Lake: `#0a1a3a`
- Wood border: `#5a3010`
- Capture highlight: `#ffee44`
- Glow/bloom: `#4488ff`, `#ff5555`, `#ffee44`

### Entity Redesigns

**Pieces**: Move away from plain rectangles to shield-shaped hexagonal polys (pointed bottom, flat top, slightly wider than tall). Each piece has:
- An outer border ring in the faction's bright color.
- A colored inner fill (darker shade of faction color).
- The rank number displayed large and centered in white/gold.
- The name abbreviation displayed smaller below in a lighter shade.
- Known piece types get additional icon decoration:
  - **Flag**: A small triangle flag shape drawn above the rank number.
  - **Bomb**: A circle with a short fuse line above.
  - **Marshal/General (rank 1-2)**: Gold stars (small 5-point polygon) flanking the number.
  - **Spy**: A small eye icon (ellipse with dot center).
  - **Scout**: Two small arrow polys indicating movement.
  - **Miner**: Small pick-axe shape (line + polygon head).
- Unknown AI pieces: same shield shape in dimmer red, with "?" but also a subtle question-mark silhouette watermark.

**Selected piece**: Bright yellow/gold border glow (existing code) plus a slowly rotating dashed circle around the piece — drawn as 8 small dots at cardinal/diagonal positions that orbit at 0.02 rad/frame.

**Valid move cells**: Green cells get an animated chevron that points inward from each side (4 small line chevrons pointing toward the cell center, pulsing). Attack cells get a crossed-swords icon (two diagonal lines forming an X) that pulses red.

**Battle popup**: Redesigned as a dramatic confrontation panel. Background gets an angled split — left half in player blue, right half in AI red, with a vertical lightning bolt dividing them. Piece names appear on their respective sides in large text. The result text appears center stage in gold with a dramatic font size increase.

**Lake cells**: Add a "NO ENTRY" indicator — a faint red circle with diagonal slash drawn at low alpha across each lake cell.

### Particle & Effect System

- **Battle win**: The winning piece gets a burst of 12 colored particles in its faction color, shooting outward. Winner's cell briefly flashes white.
- **Battle loss**: The losing piece shatters — 8 polygon "shard" particles spin outward and fade.
- **Battle both destroyed**: Both pieces flash simultaneously, then both shatter in their respective colors.
- **Flag captured**: Massive golden particle explosion — 30+ particles in yellow/gold. Triumphant visual that fills most of the screen for 20 frames.
- **Piece selected**: A brief "lift" animation — the piece draws 2px above its normal position for 5 frames.
- **Setup placement**: Each placed piece spawns with a small ripple effect — expanding circle at low alpha.

### UI Polish

- **Captured panel**: Each captured piece is displayed as a tiny shield icon (not just a square). Sorted by rank for easier scanning.
- **Status bar**: Shows the current phase with an animated indicator — a small blinking cursor during AI thinking phase.
- **Score display**: Each capture adds +1 to a counter with a brief gold number-float animation.
- **Setup mode**: Unplaced pieces in the setup order are shown in a scroll at the bottom, with the next piece to place prominently highlighted.
- **AI thinking**: A subtle animated "..." with the dots appearing one at a time every 15 frames.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Piece selected | Wood tap: noise through low bandpass | 300Hz, Q=5 | 80ms | Like clicking a board piece |
| Piece moved | Slide: brief noise sweep | 500→200Hz | 120ms | Piece dragged on board |
| Battle starts | Stinger chord | 220+330+440Hz sawtooth | 300ms | Tense conflict chord |
| Battle win | Trumpet-like sine | 523→659→784Hz arpeggio | 400ms | Victory call |
| Battle loss | Descend sine | 440→330→220Hz | 400ms | Defeat fall |
| Battle both | Crash: noise burst | Broadband noise, loud | 200ms | Mutual destruction |
| Flag captured | Fanfare: 4-note ascending | 523, 659, 784, 1047Hz | 800ms | Game-winning fanfare |
| Piece placed (setup) | Click | Noise burst at 2000Hz | 60ms | Satisfying snap |
| AI move | Very soft thud | Triangle wave 150Hz | 80ms | Subtle AI action |
| Setup complete | Confirmation chime | 784Hz + 1047Hz simultaneous | 300ms | Ready to fight |

### Music/Ambience

A military field drums and ambient loop:
- **Snare rhythm**: Filtered noise (bandpass 2000Hz, Q=3) in a slow military march pattern — beat on 1 and 3 of a 4/4 bar at 80 BPM, light snare on 2 and 4. Very low gain (0.04).
- **Low brass drone**: Sawtooth at 55Hz filtered through resonant lowpass (300Hz cutoff), gain 0.02. Provides tension underneath.
- **Battle theme intensity**: During the battle popup, gain on all elements doubles for the duration.
- **Victory/defeat stings** override the loop briefly before it resumes.

## Implementation Priority
- High: Shield-shaped piece polys with rank icons, parchment board background, battle popup redesign (split panel), battle win/loss sounds
- Medium: Lake water shimmer animation, selected piece rotating orbit dots, wood border frame, captured piece shield icons
- Low: Piece setup ripple animation, military drum ambient, flag capture massive particle explosion, piece placement footstep sound
