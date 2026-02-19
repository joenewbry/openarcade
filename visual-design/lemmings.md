# Lemmings — Visual & Sound Design

## Current Aesthetic

The game renders a 1200x400 pixel terrain on a 600x400 scrolling viewport. Lemmings are tiny figures (~4px wide) with blue bodies (`#8af`) and peach heads. The terrain is drawn with depth-shaded browns (`#1e2814` range). Entry door glows green (`#4f4`), exit door glows yellow (`#ff0`). Background is deep navy (`#0a0a1e`). Particles exist for deaths (red `#f66`) and saves (blue `#8af`). Ability UI at bottom shows colored icons. The look is functional but flat — the terrain lacks texture, lemmings lack personality, and the environment lacks atmosphere.

## Aesthetic Assessment

**Score: 2/5**

The color choices are reasonable but execution is primitive. Lemmings are indistinct blobs at their small size. The terrain feels like a flat colored fill with no depth or texture. The portal effects (entry/exit) are just simple colored shapes. The overall scene lacks the charming pixel-art character of the original.

## Visual Redesign Plan

### Background & Environment

Replace the flat navy background with a layered cave/sky system. Behind the terrain, add a deep cavern atmosphere with parallax stalactites and distant cave features. Use a gradient background shifting from deep indigo at top (`#0d0d2b`) to near-black at bottom (`#050510`). Add distant glowing crystals (tiny bright points, `#4af` at low alpha) scattered in the background layer. The terrain itself should have a visible rock texture — use subtle noise-based color variation across terrain pixels (shift between `#3d2b1a`, `#4a3520`, `#2d1f12` per-chunk). Add a subtle gradient on terrain edges to give a rounded, 3D cliff feel.

Add ambient floating dust motes (20–30 tiny white pixels slowly drifting) to give the cave atmosphere life. Entry door should pulse with a warm golden portal glow. Exit door should radiate a heavenly white/yellow beam upward.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary (lemmings) | Bright sky blue | `#5bc8f5` |
| Secondary (terrain base) | Warm sandstone | `#8b6340` |
| Terrain shadow | Dark earth | `#3d2414` |
| Terrain highlight | Lit stone | `#c49a6c` |
| Background deep | Cave void | `#060618` |
| Background mid | Indigo cave | `#0d0d2b` |
| Glow/bloom (entry) | Warm portal gold | `#ffcc44` |
| Glow/bloom (exit) | Heaven beam white | `#fffff0` |
| Ability UI accent | Electric cyan | `#00e5ff` |
| Danger/death | Hot coral | `#ff4d4d` |

### Entity Redesigns

**Lemmings** — Give each lemming a distinct silhouette despite their small size. Use a 3-part render: round head (skin `#ffd5a8`), body rectangle (blue overalls `#5bc8f5`), tiny feet. Add a 1px green hair tuft on top of the head. For walking lemmings, alternate feet position each 4 frames. State-specific colors: diggers get a brown hard-hat (`#8b6340`), builders carry a visible brick `#c49a6c`, blockers spread arms wide with a red `#ff4d4d` glow, climbers have a tiny pickaxe outline. Dead lemmings explode in a satisfying starburst of blue + skin-tone particles.

**Entry Door** — Render as a golden arch/portal with animated shimmer lines radiating inward. Lemmings should appear to "pop" out with a small spawn flash. Use `setGlow('#ffcc44', 1.2)` on the arch frame.

**Exit Door** — A staircase leading up into a bright white void. Animate a gentle pulsing column of white light rising from the door. Lemmings walking in should shrink and fade as they enter. Use `setGlow('#ffffff', 1.5)` with wide spread.

**Terrain** — Add a 2px lighter edge highlight at exposed terrain surfaces to simulate rim lighting from above. Differentiate terrain types visually (standard earth, metal platforms, ice) with color tinting.

### Particle & Effect System

- **Death explosion**: 12–16 particles radiate outward from lemming position. Colors cycle through `#ff4d4d`, `#ffa040`, `#ffd5a8` (body parts!). Each particle has slight gravity. Lifetime 0.6s.
- **Save sparkle**: When a lemming reaches the exit, 8 golden star particles (`#ffcc44`) radiate upward with slight float. Lifetime 0.8s.
- **Dig debris**: While digging, 4–6 small brown chunks (`#8b6340`) arc downward per frame. Short lifetime 0.3s.
- **Builder brick snap**: A brief white flash `#ffffff` at the point a brick is placed, plus 2 dust motes.
- **Skill use flash**: When assigning a skill, emit a brief ring of the skill's color expanding outward from the lemming.
- **Ambient cave dust**: 25 near-invisible white pixels (`#ffffff` at alpha 0.15) slowly drift downward. Respawn at top when leaving viewport.

### UI Polish

Replace the flat ability button bar with a stylized control panel aesthetic. Dark panel background (`#0a0a14`) with subtle border gradient. Each ability icon: colored circle with the ability glyph (digger=pick, builder=brick, etc.) in white. Active ability: bright glow ring + scale 1.1x. Hover: subtle lift effect (draw 1px lighter border).

HUD elements: lemming count uses a small walking lemming icon next to the number. Progress bar (saved/needed) uses a gradient fill `#5bc8f5` → `#00e5ff` with glow. Level name displayed in a parchment-style text box at top center.

Terrain cursor: when hovering to assign a skill, show a faint selection ring around the nearest lemming with their current state icon above them.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Lemming spawn (pop out) | Sine + tiny pitch rise | 300→600 Hz sweep | 0.15s | Bright pop, soft attack |
| Walking footstep | Short noise burst | Band-pass 800–1200 Hz | 0.05s | Alternating L/R, every 8 frames |
| Dig (pick hitting ground) | Noise + thud | Low thump 80 Hz + noise burst 1k Hz | 0.12s | Chunky, satisfying impact |
| Brick placed (builder) | Short click | Sine 440 Hz, fast decay | 0.08s | Gentle click, not harsh |
| Blocker placed | Low resonant drone | Sine 220 Hz with slow tremolo | loop | Fades in, sustains while blocking |
| Climber scrape | Filtered noise | High-pass 2k Hz, slow trem | 0.2s per step | Subtle scraping |
| Bash explosion | Noise burst + reverb tail | White noise, HPF 200 Hz | 0.4s | Chunky crash |
| Lemming death (oh no!) | Descending whistle | Sine 800→200 Hz | 0.3s | Iconic "uh oh" tone |
| Lemming saved (yay!) | Rising chime | Sine 600→1200 Hz, bright | 0.25s | Joyful ascending tone |
| Level complete fanfare | Arpeggiated chord | C major: 261→329→392→523 Hz | 1.0s | Happy staircase up |
| Nuke (exploder) | Deep boom | Sine 60 Hz + white noise | 0.6s | Powerful, low rumble |
| Time warning | Repeating beep | Square 880 Hz | 0.2s each | Urgency signal |
| Skill button click | Tick | Sine 1000 Hz, very fast | 0.04s | UI feedback |

### Music/Ambience

Generate a dripping cave ambience loop using Web Audio: occasional water drip sounds (short sine blips at 400–800 Hz with reverb), low sub-bass hum (sine at 40 Hz, very quiet), and distant wind whoosh (band-pass filtered white noise, slow LFO on volume). Layer in a gentle melodic theme using a simple oscillator melody — pentatonic scale, slow tempo (70 BPM), looping 16-bar phrase. Use a sawtooth wave with heavy low-pass filter for a muted, underground quality. Add subtle echo (delay node, 0.4s, 30% feedback).

## Implementation Priority

**High**
- Terrain texture variation (color noise per pixel chunk)
- Lemming state-specific renders (hard hat, brick, arms-spread blocker)
- Death explosion particles with color variety
- Entry portal glow animation
- Exit door light beam effect
- Death sound ("oh no" descending whistle)
- Save sound (ascending chime)
- Walk footstep sounds

**Medium**
- Background parallax cave layer with crystals
- Ambient floating dust motes
- Builder brick snap flash
- Skill assignment ring effect
- UI panel polish (styled ability bar)
- Cave ambient drip/hum audio loop
- Level complete fanfare

**Low**
- Terrain rim lighting (edge highlight shader)
- Lemming spawn pop animation
- Per-terrain-type visual differentiation (ice, metal)
- Full melodic background theme
- Lemming mini-shadows on terrain
