# Competitive Minesweeper — Visual & Sound Design Plan

## Current Aesthetic

The game has two 10x10 minesweeper boards side by side on a 600x400 canvas. Player board uses theme `#ff8844` (orange) and AI board uses `#e66666` (red-pink). Unrevealed cells are drawn with a raised 3D effect in `#2a2a4e` with highlight/shadow. Standard minesweeper number colors (1=blue, 2=green, 3=red, etc.). A countdown overlay exists. The boards are separated by a center divider. The game has a reasonable foundation but feels like a plain web app. The competitive angle — two simultaneous boards racing to clear — deserves a tense spy-thriller or cyberpunk aesthetic.

## Aesthetic Assessment: 2.5 / 5

The raised 3D cell style is a good touch that gives depth. Number colors are correct. But the boards float on a generic dark background with no visual narrative. The "VS" nature of the competition isn't dramatized at all. The center needs to feel like a rivalry is happening there. The theme should be: two operatives defusing bombs simultaneously — tense, precise, competitive.

---

## Visual Redesign Plan

### Background & Environment

- **Background**: deep matte black `#080c10` — the briefing room / operations center aesthetic.
- **Background grid**: very faint technical blueprint grid `#0e1218` — 20px squares at 0.3 alpha, suggesting a satellite surveillance map.
- **Side panels**: each board sits in a slightly raised panel. Player panel: dark blue-tinted `#0c1020` with a subtle 1px border in `#4488ff` on the top and left edges. AI panel: dark red-tinted `#140c10` with 1px border in `#ff4444` top and right edges.
- **Center divider**: instead of blank space, a **vertical rivalry column** with:
  - Thick 2px line in `#444860` center.
  - "VS" text in large bold `#cc4444` glowing text halfway down.
  - Timer display (MM:SS) in `#ffffff` bold, above VS.
  - Player score and AI score flanking the divider.
  - Two horizontal progress bars showing mines flagged: left bar in player color, right bar in AI color.
- **Scan line effect**: barely visible horizontal alternating rows at `rgba(0,0,0,0.04)` for CRT terminal feel.
- **Corner indicators**: in each top corner, a small "OPERATIVE A" and "OPERATIVE B" label in military stencil style.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background | dark navy | `#080c10` |
| Blueprint grid | none | `#0e1218` at 0.3 alpha |
| Player panel bg | generic dark | `#0c1020` |
| AI panel bg | generic dark | `#140c10` |
| Player panel border | none | `#4488ff` 1px |
| AI panel border | none | `#ff4444` 1px |
| Unrevealed cell (player) | `#2a2a4e` | `#1a2040` with `#2a3258` highlight, `#101828` shadow |
| Unrevealed cell (AI) | `#2a2a4e` | `#2a1a1a` with `#3a2828` highlight, `#180e0e` shadow |
| Revealed cell (player) | lighter | `#0e1828` (dark blue-tinted) |
| Revealed cell (AI) | lighter | `#1a0e0e` (dark red-tinted) |
| Flag (player) | default | `#4488ff` flag on `#c0c8e0` pole |
| Flag (AI) | default | `#ff4444` flag on `#e0c0c0` pole |
| Mine (exploded) | red | `#ff3300` with `setGlow('#ff6600', 20)` |
| Number 1 | `#4488ff` | `#5599ff` bright blue |
| Number 2 | `#44aa44` | `#44cc44` bright green |
| Number 3 | `#ee4444` | `#ff4433` orange-red |
| Number 4 | `#4444aa` | `#5544cc` purple |
| Number 5 | `#aa4444` | `#cc3333` deep red |
| Number 6 | `#44aaaa` | `#44cccc` teal |
| Number 7 | `#444444` | `#aaaaaa` grey |
| Number 8 | `#888888` | `#cccccc` light grey |
| Timer | white | `#ffffff` with subtle red `setGlow` when under 30s |
| VS text | none | `#cc4444` with `setGlow('#ff4444', 12)` |

### Entity Redesigns

**Unrevealed Cells**
- 3D raised effect is good — enhance it:
  - Top-left edge: 2px line in highlight color (light grey for player `#4a5880`, lighter brown for AI `#584a4a`).
  - Bottom-right edge: 2px line in shadow color.
  - Face: flat fill (player `#1a2040`, AI `#2a1a1a`).
  - Very faint digital "noise" pattern on face: 2–3 tiny 1px dots in slightly lighter color, random positions per cell (seeded by cell coords so stable).

**Revealed Cells**
- Flat recessed appearance (opposite of raised): face is slightly darker than unrevealed.
- Player board revealed: `#0e1828`.
- AI board revealed: `#1a0e0e`.
- Numbers drawn in standard colors but bold, centered, with very subtle `setGlow` at 2px matching number color.

**Flags**
- Flag on a short vertical pole (3px rect).
- Flag cloth: small rectangle (team color) with a slight wave: draw as 4-point polygon with the trailing corner offset +2px.
- Player flag: `#4488ff`.
- AI flag: `#ff4444`.

**Mines (on game end)**
- Circle fill in `#1a0a0a` dark.
- 8 radiating spike triangles around center in `#ff3300`.
- Center shines bright orange `#ff6600`.
- Glow: `setGlow('#ff6600', 15)`.
- Exploded mine (game-over): larger, more spikes, screen flash.

**Cursor / First click ripple**
- When any cell is first clicked: brief ripple ring emanates from click (white circle stroke expands from r=5 to r=20, fades, 200ms).

### Particle & Effect System

| Effect | Description |
|---|---|
| Cell reveal | Quick "flip" animation: cell scales from 1.0 to 0.8 (compress), then snap to revealed (1.0) in 80ms |
| Cascade reveal | Cells reveal in wave from origin: each cell +30ms delay, creating ripple |
| Flag place | Small flag appears with brief bounce (scale 0 → 1.2 → 1.0, 150ms) |
| Flag remove | Flag shakes briefly (±2px x-oscillation, 3 frames) before disappearing |
| Mine explode | Large orange-red burst: 8 spike fragments fly outward, screen-flash white at 0.4 alpha, 1 frame |
| Win | Board cells cycle through rainbow flash from center outward (wave of color) |
| AI move | Faint blue targeting reticle briefly appears on AI's chosen cell (crosshair, 2 frames) |
| Timer low (30s) | Timer text pulses red, subtle red background flash every 1s |
| Click ripple | White ring expands from clicked cell, r: 5→25, fade 200ms |

### UI Polish

- **Operative labels**: top-left "OPERATIVE A" in small monospace sans, player color. Top-right "OPERATIVE B" in AI color.
- **Progress bars**: below each board, a bar showing flagged mines count out of total. Player bar fills left-to-right in `#4488ff`, AI bar fills right-to-left in `#ff4444`.
- **Timer**: center top, large bold digits. Turns red `#ff4444` with glow when under 30s.
- **Mine counter**: small text "MINES: 15" below board, in team color.
- **Win screen**: "MISSION COMPLETE" (player win) or "MISSION FAILED" (AI win) in military font style. Player time and accuracy displayed. Restart prompt.
- **Countdown overlay**: "3... 2... 1... GO!" text centered, dramatic scale-up animation, theme color flashes.
- **Board header**: above each board: player name in team color, accuracy stat (% correct flags), time advantage indicator.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Cell reveal (safe) | sine | 660Hz | A:0 D:0.05 S:0 R:0 | none | crisp click |
| Cell reveal (numbered) | sine | 440→550Hz | A:0 D:0.08 | none | confirmation beep |
| Cascade reveal | sine | 550Hz, each +20Hz per cell | A:0 D:0.04 per | none | rising sweep |
| Flag place | triangle | 880Hz | A:0 D:0.06 | none | marker placed |
| Flag remove | triangle | 880→660Hz | A:0 D:0.06 | none | marker removed |
| Mine explode | noise + sine | — + 80Hz | A:0 D:0.5 | lowpass 300Hz | deep boom |
| Win | sine chord | C5 E5 G5 C6 arpeggio | A:0.01 D:0.15 per | reverb | victory fanfare |
| AI move | sine | 330Hz | A:0 D:0.03 | none | opposing click |
| Timer tick (low) | triangle | 880Hz | A:0 D:0.05 | none | urgent tick |
| Timer warning (10s) | sawtooth | 440Hz pulse | A:0 D:0.08, every 0.5s | lowpass 1000Hz | alarm pulse |
| Countdown 3/2/1 | sine | 440/550/660Hz | A:0 D:0.15 | none | countdown beeps |
| GO! | sine | 880Hz | A:0.01 D:0.3 | reverb | launch tone |

### Music / Ambience

- **Ambient base**: constant very quiet filtered noise (lowpass 300Hz, gain 0.02) suggesting electronics/HVAC — an operations center ambient hum.
- **Game music**: tense, minimal. Percussion loop at 110 BPM — kick (noise+60Hz, D:0.12) on beat 1, snare (noise, bandpass 1800Hz, D:0.08) on beat 3. No melody — just rhythm, staying out of the way of the "detective work" focus of the game.
- **Tension climax**: when both players are very close to finishing (>80% revealed), music adds a hi-hat pattern (noise, highpass 4000Hz, D:0.03) on every 16th note, dramatically increasing tension.
- **Mine explosion**: music stops abruptly for 0.2s, then resumes softer.
- **Win/lose stingers**: replace music for 3s.
- **AI thinking indicator**: very quiet, sparse clicks (sine 440Hz, D:0.02, random interval 0.5–2s) during AI computation frames — implies the AI is "thinking".
- **Master gain**: 0.4.

---

## Implementation Priority

**High**
- Cell reveal "flip" animation (scale compress/expand)
- Mine spike design (circle + 8 triangle spikes)
- Flag pole and cloth design (team-colored wave polygon)
- Center divider rivalry column (VS text, progress bars, timer)
- Panel border colors (blue left, red right)
- Cascade reveal ripple effect

**Medium**
- Cell face digital noise texture
- Timer red pulse when under 30s
- Click ripple ring effect
- Win board rainbow flash
- Ambient ops-center hum
- Mine explode boom sound
- Cell reveal crisp click sounds

**Low**
- AI thinking click sounds
- Countdown dramatic scale animation
- Scan line CRT overlay
- Blueprint grid background
- Progress bar mine-count fills
- Generative percussion tension loop
