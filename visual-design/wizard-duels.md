# Wizard Duels — Visual & Sound Design

## Current Aesthetic

Two pixel-art wizards face off on a dark night arena (`#050515` sky gradient). Player wizard wears blue robes (`#333388`), AI wears red (`#833333`). Four spells: Fire (orange `#f72`), Ice (cyan `#4df`), Lightning (yellow `#ff0`), Heal (green `#4f8`). Background has 50 static stars, a faint moon circle, runes on the ground, and an elliptical arena outline. Projectiles carry glow and trail particles. Combo spells: Steam (grey) and Explosion (orange). The background is actually quite nice — the foreground wizard art and combat feel needs major uplift.

## Aesthetic Assessment
**Score: 3/5**

The background atmosphere is solid (stars, moon, runes, arena ellipse). The wizard geometry is simple but readable. What's missing: the spells feel underpowered visually (small circles with glow), the wizard characters have no personality or life, the HUD spell bar is plain text on a dim rect. The collision impacts are just particle bursts without drama.

## Visual Redesign Plan

### Background & Environment

Keep and enhance the existing dark sky gradient — deepen it to near-black (`#020210`) at the top, transitioning through deep navy to `#151530`.

Add a **dramatic full moon**: a large circle (`#dde5ff`) at 90px, with a faint outer corona (larger circle at 0.08 alpha). Phase it to a quarter-crescent using an overlapping dark circle offset.

Stars: increase to 80 stars with 3 distinct brightness tiers. Top 10 brightest stars get a 4-point star polygon drawn over them (tiny cross shape). Twinkle rate varies per star based on index.

Ground plane: replace flat dark rect with layered depth. A misty ground fog layer — draw 3 overlapping very wide, very flat ellipses near ground level in `#2030608` at varying alphas, shifting slowly each frame (oscillate Y by ±2px).

Arena: the ellipse outline becomes more prominent — double-stroke (thick dark, thin purple-white). Fill the interior with a very subtle lighter ground color. Inscribed runes grow slightly larger and glow more noticeably.

Add floating magical debris: 6–8 slow-drifting glowing motes (`#8844ff` at 0.2 alpha, 2px radius) that float upward from the ground and loop.

**Dramatic lightning storm hint for high-tension rounds:** when either wizard is below 30 HP, briefly flash the background sky from pure dark to deep purple (`#300060` at 0.15 alpha) every 120 frames.

### Color Palette
- Primary (player): `#4499ff` (electric blue)
- Primary (AI): `#ff4422` (volcanic red)
- Background: `#020210`, `#0c0c28`, `#141430`
- Ground: `#18183a`, `#1e1e44`
- Glow/bloom player: `#66bbff`
- Glow/bloom AI: `#ff6644`
- Arena accent: `#8844ff`

### Entity Redesigns

**Wizard bodies:** Significantly enlarge the robe trapezoid (wider base, taller). Add flowing robe hem — draw 3 short pointed triangle "hem spikes" at the robe base for a billowing effect. The belt becomes a glowing sash: a narrow rect in the wizard's color with a subtle glow.

**Wizard hat:** Taller (tip extends further). Add a brim shadow ellipse beneath the brim for depth. The hat star becomes a proper 5-point star polygon, yellow-white glowing.

**Staff:** Replace the simple line with a layered staff — a wooden shaft (brown line, slightly thicker) with a decorative crook at the top. The orb at the staff tip grows to radius 8, with a pulsing inner core (smaller bright circle oscillating in size).

**Cast animation:** When casting, the wizard's staff arm raises dramatically. The orb flares to 3x size for 5 frames, matching the spell color, with a ring expand-and-fade effect (circle stroke expanding outward, fading).

**Shield:** The current ellipse shield gains detail: inner rune (already a diamond — add small stroke lines radiating from diamond corners). The pulsing alpha is kept, add a rotating outer ring of tiny dash marks (12 short line segments on the ellipse, rotating).

**Meditation aura:** 4 orbiting particles become 6, with varying sizes. Add pulsing concentric ring halos around the meditating wizard.

**Hit flash:** Instead of full-white, the wizard flickers between its color and a saturated bright version — the robe color shifts to `#ffffff` briefly, then its outline color.

### Particle & Effect System

**Fire projectile:** Increase size to 8. Trail is 25 points long. 2 additional trailing particles per frame — tiny orange (`#ff6600`) and yellow (`#ffcc00`) dots offset randomly ±3px. On impact: large explosion (30 particles), expanding ring stroke in orange fading over 20 frames.

**Ice projectile:** Size 10, slow moving. Add 4 rotating crystal shard lines around the projectile (already implemented — enhance length to ±8px). On impact: burst of white and cyan shards radiating outward, plus a "frost ring" — a circle of 8 small diamond shapes expanding and fading. Target slowed: subtle blue ice-crystal overlay drawn on the slowed wizard (small blue diamond shapes at feet).

**Lightning:** Already has zigzag. Add: persistent arc from staff to projectile for 3 frames after casting (draw a straight-ish line with 2 random jitter points). On impact: screen-wide flash (white overlay at 0.12 alpha for 3 frames), then 6 radiating arc lines from impact point.

**Heal:** Currently invisible (no projectile). Visualize as: a rising column of green sparkles erupting from the wizard's feet to above their head. Animated over 20 frames — sparkles rise and fan outward. The healAnim ellipse ring is enhanced to include inner cross-shaped particle burst in bright green.

**Steam combo:** Billowing cloud — draw 5 overlapping grey circles of varying sizes moving forward. On impact: cloud expands to 3x before fading, blinding effect visualized as a white-grey ring expanding over the target.

**Explosion combo:** Ring of fire — on impact, draw 3 concentric expanding ring strokes in yellow, orange, red, each fading at different rates. 50 particles in all fire colors. Screen shake (already exists in wrestling — implement same pattern here).

**Shield block:** Currently just white particles. Add: the shield briefly flashes pure white, then a shatter effect — 6 angular polygon shards radiate outward from the impact point, rotating as they fly.

### UI Polish

**Spell bar:** Replace plain text on dim rect with icon-style spell slots. Each spell occupies a 60x40 square panel. Background: dark (`#00000088`), border: the spell's color at 0.5 alpha. Inside: a symbol representing the spell (fire=flame triangle polygon, ice=snowflake cross lines, lightning=zigzag bolt, heal=cross). The spell name and mana cost appear below. On cooldown/insufficient mana: desaturate the icon (already done with color alpha).

**Win indicators:** The filled/empty circles become shining stars — filled star polygon (5-point) for a win, star outline for empty.

**Combo hint text:** Give it a magical float animation — oscillate Y ±2px at ~0.05 Hz.

**HP/mana bars:** Add tick marks every 25% along the bar length. HP bar color transitions more granularly: green → yellow-green → yellow → orange → red in 4 steps.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Fire cast | Sawtooth + highpass filter, freq ramp up | 150→400 Hz, highpass 800 Hz, gain burst | 180ms | "Whoosh-crackle" fire sound |
| Ice cast | Triangle wave + vibrato (LFO 8 Hz, ±20 Hz depth) | 300 Hz center, slight reverb via delay node 40ms | 250ms | Crystalline shimmer |
| Lightning cast | Oscillator rapid frequency jump 100→3000 Hz, distortion | Instantaneous freq jump, gain 0→1→0 over 60ms | 80ms | Sharp crack/zap |
| Heal cast | Rising sine arpeggio: C4→E4→G4→C5 | 262→330→392→524 Hz, 50ms stagger | 250ms | Warm restorative chord |
| Fire hit | White noise burst + low thud: noise filtered 500-3000 Hz + sine 80 Hz | Simultaneous, gain 0→0.8→0 over 120ms | 150ms | Impact + burn |
| Ice hit | Glassy crack: triangle 800 Hz, sharp attack, + high-freq noise burst | 800 Hz, 20ms attack, decay 200ms | 220ms | Ice shatter |
| Lightning hit | Sharp high-freq crack: sawtooth 2000 Hz, very fast decay + thunder rumble: sine 60 Hz 400ms | 2000 Hz + 60 Hz, simultaneous | 450ms | Zap + thunder |
| Shield raised | Low resonant hum rising: sawtooth 200→400 Hz over 150ms | Rising ramp, gain 0.5 | 200ms | Magical barrier snap |
| Shield block | Metallic ring: triangle 600 Hz with quick resonant decay | 600 Hz, decay 300ms, reverb sim | 350ms | "Clang" deflect |
| Combo: Steam | Hissing white noise through narrow bandpass 800-1200 Hz | Noise burst, fade over 400ms | 450ms | Steam vent |
| Combo: Explosion | Broadband noise + sub-bass thud 50 Hz, gain 1.0 | Noise + sine 50 Hz, sharp attack, decay 300ms | 400ms | Detonation |
| Shield block | "Clang" metallic triangle 600 Hz | Decay 300ms | 350ms | Deflect sound |
| Round won | Triumphant brass-like: sawtooth + lowpass 2000 Hz, C5 chord | 523+659+784 Hz, simultaneous | 600ms | Victory fanfare sting |
| Round lost | Descending minor: triangle A4→F4→D4 | 440→349→294 Hz, 100ms each | 380ms | Defeat sting |
| Meditating | Soft continuous tone: sine 220 Hz, gain 0.04, slow LFO 0.2 Hz | Quiet background hum | continuous | Calm restoration sound |

### Music/Ambience

An ambient battle soundtrack: two layers. Base layer — deep sustained chord using 3 sine oscillators (D2+A2+D3: 73+110+147 Hz) with very slow amplitude LFO (0.05 Hz), gain 0.06. Creates ominous drone. Second layer — occasional high solo: a single triangle oscillator at random intervals (15–30s) plays a brief 3-note modal phrase in A minor (A4→C5→E5→A4), as if a distant wind instrument. Gain 0.04. During low-HP combat tension, a fourth oscillator adds a low tremolo (80 Hz, LFO 4 Hz) at gain 0.03 — subliminal urgency pulse.

## Implementation Priority
- High: Spell visual enhancements (ice crystals on slow, heal sparkle column, explosion ring shockwave), shield block shatter, wizard hat/robe enlargement
- Medium: Background improvements (moon crescent, ground fog mist, more stars), combo spell drama, spell bar icon redesign, HP/mana bar tick marks
- Low: Ambient floating motes, low-HP sky flash, meditation concentric ring halos, full audio system
