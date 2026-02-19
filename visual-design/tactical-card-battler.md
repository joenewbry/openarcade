# Tactical Card Battler — Visual & Sound Design

## Current Aesthetic

Three vertical lane columns on a dark navy `#1a1a2e` background. Cards are rendered as flat rectangles with minimal decoration — mana cost circles, stat numbers, and text labels. Heroes are simple filled circles (blue for player, red for AI). Mana crystals are small circles in the bottom-right area. The card hand sits at the bottom and supports drag-and-drop. Combat log fades in purple text between lanes. Glow effects exist on playable cards and active heroes.

## Aesthetic Assessment
**Score: 2/5**

The color palette is competent and thematic but the actual rendering is extremely flat. Cards look like colored rectangles with text. Heroes look like blobs. There is zero sense of depth, fantasy atmosphere, or visual excitement. The lane layout is clear but sterile.

## Visual Redesign Plan

### Background & Environment

Replace the flat navy fill with a layered parallax dungeon chamber. Three thick stone columns divide the lanes, with carved glyphs that pulse faintly matching the active player's color. A starfield of floating magical motes drifts in the background (tiny circles with randomized slow drift). The mid-section between the two lane rows should look like a battlefield divide — a glowing crack or rift line pulsing with energy.

Lane backgrounds should have a subtle vignette: darker at edges, slightly lit near center. When combat animations play, the entire arena dims and the combatants glow bright.

### Color Palette
- Primary: `#cc44ff` (arcane purple)
- Secondary: `#4488ff` (player blue) / `#ff4466` (AI red)
- Background: `#0a0a1a`, `#12122a`
- Glow/bloom: `#cc44ff`, `#ffcc44` (gold for attacks)

### Entity Redesigns

**Cards in Hand:** Give cards a beveled appearance by drawing three rectangles — the main body, a lighter 2px top/left strip (highlight), and a darker 2px bottom/right strip (shadow). Add a card type icon area (a small diamond or circle shape at the top center containing the mana crystal). Minion cards get tiny sword/shield icons for ATK/HP. Spell cards get an animated shimmer effect while dragged (cycle a bright stripe across the card face).

**Cards on Field (Minions):** Wider and more imposing. The creature name should display in a banner strip across the top. ATK stat displayed in a gold shield polygon bottom-left, HP in a red gem polygon bottom-right. Low-HP minions pulse a dim red.

**Heroes:** Replace circles with hexagonal gem shapes (6-point polygon). Player hero is a deep blue gem with a bright core. AI hero is a crimson gem. Both should have animated glow that increases in urgency as HP drops. A thin HP arc (segmented ring) surrounds each hero.

**Mana Crystals:** Draw as rounded diamond shapes instead of circles. Lit crystals have inner glow. Depleted crystals are hollow and dark.

### Particle & Effect System

- **Card Play:** Burst of 12-16 colored sparks radiating from the played card's origin, fading in 0.4 seconds.
- **Combat Strike:** A bright flash at the attacker, then a directional streak to the target, and an impact burst of 8 particles at the defender.
- **Minion Death:** Dissolve effect — 20 small rectangle particles of the card's color exploding outward and fading.
- **Spell Cast:** Beam of light from card to target. Damage spells: red lightning arc. Heal spells: green rising sparkles. War Cry: golden rings expanding outward from each buffed minion.
- **Hero Hit:** Screen edge vignette flash in attacker color (red or blue, 2-frame pulse).

### UI Polish

- HUD HP/Mana numbers should be displayed in styled frames, not bare DOM text.
- End Turn button: draw as a stone tablet shape with chiseled text. Active state should pulse purple glow.
- Turn indicator ("YOUR TURN" / "AI TURN") should animate in from the top with a brief zoom-in scale.
- Combat log text should appear with a brief slide-in from center, then fade. Use a larger font size (14-16px) for more impact.
- Add a "thinking" indicator when AI is computing (3 pulsing dots below the AI hero).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Card pickup | OscillatorNode triangle | 440 Hz → 660 Hz sweep | 80ms | Soft pluck feel |
| Card play (minion) | OscillatorNode sawtooth + lowpass | 200 Hz, Q=2, cutoff sweep 200→800 | 200ms | Meaty thud |
| Card play (spell) | OscillatorNode sine + high Q bandpass | 880 Hz | 120ms | Magical chime |
| Combat strike | BiquadFilter + white noise burst | noise → lowpass 400 Hz | 80ms | Impact whomp |
| Minion dies | Sine descend | 440→110 Hz | 300ms | Defeated chord |
| Spell damage | Square wave arpeggiate | 660, 440, 220 Hz stacked | 200ms | Electric zap |
| Heal cast | Sine chord | 528, 660, 792 Hz | 400ms | Soft healing tone |
| War cry buff | Sawtooth chord | 220, 277, 330 Hz | 350ms | Triumphant fanfare |
| Turn start (player) | Sine + sine | 440 + 660 Hz, slight delay | 200ms | Ready chime |
| Turn start (AI) | Sawtooth descend | 330→220 Hz | 250ms | Menacing rumble |
| Victory | Sine arpeggio | 261, 329, 392, 523 Hz | 600ms | Major chord sweep |
| Defeat | Sine descend | 261, 220, 196, 130 Hz | 800ms | Sad minor fall |
| Mana crystal fill | Soft sine tick | 880 Hz each crystal | 30ms/crystal | Play sequentially |

### Music/Ambience

A subtle generative ambience: two sine oscillators at 55 Hz and 82 Hz (power fifth) with very slow tremolo (0.15 Hz LFO amplitude modulation) running continuously at very low gain (0.04). This creates a cave-like hum that pulses with mystical energy. Add occasional random high-frequency "sparkle" pings (1200-2400 Hz sine, ~0.3s, extremely quiet) to suggest magical atmosphere.

## Implementation Priority
- High: Card glow on playable state, combat strike particle burst, hero hexagon shape with HP arc, mana crystal diamond redesign
- Medium: Background mote particles, spell cast beam effects, end turn button polish, sound events for card play and combat
- Low: Generative ambience, hero urgency pulse, lane rift divider animation, AI thinking indicator
