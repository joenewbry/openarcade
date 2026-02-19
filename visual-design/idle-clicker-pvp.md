# Idle Clicker PVP — Visual & Sound Design

## Current Aesthetic

Four-player competitive idle clicker with a dark navy background (`#1a1a2e`), gold/yellow theme (`#ffff66`), player-colored panels (blue `#44aaff`, red `#ff5555`, green `#55ff55`, orange `#ff9900`), and a central pulsing gold coin button. Left panel shows upgrades; right panel shows sabotage options. A leaderboard bar sits at top with player scores and a timer bar below it. Warning flash overlays appear when attacked. The aesthetic is functional but the layout is dense, the coin button is the only animated element, and the panels lack visual personality.

## Aesthetic Assessment

**Score: 2/5**

The color-coded player system is clear and readable. The pulsing coin button is the right instinct — it's the core interaction. However the overall design feels like a developer UI rather than an arcade game. The backgrounds are flat dark rectangles, there are no ambient particle effects, the upgrade buttons are plain, and the attacked warning flash is the only reactive visual feedback. This game can be transformed into something genuinely exciting.

## Visual Redesign Plan

### Background & Environment

Replace the flat `#1a1a2e` background with a rich dark gradient: `#080818` (center) radiating to `#0a0a20` at edges. Add a subtle animated circuit-board pattern `rgba(40,60,100,0.05)` — thin horizontal and vertical lines with small junction dots, slowly drifting upward at 0.3px/frame, giving a sense of digital network activity.

The central coin button area should be a glowing altar: a dark circular pedestal with concentric ring decorations in `rgba(200,160,40,0.1)` and a warm gold radial gradient beneath the button itself.

Player panels (left: upgrade, right: sabotage) should have distinct visual character:
- Panel background: `#0c1020` with a thin top-border line in the active player's team color
- When this panel belongs to the local player: subtle border glow in `#44aaff`
- Upgrade buttons: dark raised look `#1a2540`, brighter on hover

### Color Palette

- Background: `#080818`
- Panel fill: `#0c1020`
- Panel border: `#1a2540`
- Circuit lines: `rgba(40,80,140,0.06)`
- Theme gold: `#ffdd44`
- Theme gold bright: `#ffee88`
- Coin button ring 1: `#886600`
- Coin button ring 2: `#cc9900`
- Coin button ring 3: `#ffe066`
- Coin button glow: `rgba(255,220,50,0.4)`
- Player 1 (blue): `#44aaff`
- Player 2 (red): `#ff5555`
- Player 3 (green): `#55ff55`
- Player 4 (orange): `#ff9900`
- Leaderboard bg: `#0a0a18`
- Score text: `#ffffff`
- Warning flash: `rgba(255,50,50,0.35)`

### Entity Redesigns

**Coin Button (central):** The star of the show — make it spectacular:
- Three concentric circles: outer `#886600` (3px border), mid `#cc9900` (2px), inner `#ffe066` fill
- A large `$` or coin-face symbol drawn in the center, gold on gold (slight brightness contrast)
- Pulsing outer glow: radial gradient `rgba(255,220,50,0.0)` → `rgba(255,220,50,0.35)` → transparent, radius oscillating ±10px at 1.5Hz
- On each click: button physically depresses (scale 0.95 for 0.1s), bright flash `rgba(255,240,180,0.6)`, 8 gold spark particles fly outward
- On auto-click: smaller visual pop (0.97 scale, 6 sparks, less intense flash)
- Button size grows slightly as Multiplier upgrade level increases (+2px radius per level)

**Score/Counter display (per player):**
- Large neon numerals in team color with matching glow
- "+N" floating text animation rising and fading on each click
- Milestone number reached: counter flashes brighter and font scales up 110% for 0.3s

**Upgrade buttons (left panel):**
- Row layout: icon area + label + level indicator + cost
- Dark base `#0f1828`, brighter top edge `#1a2a40`, player-color left accent bar
- Level indicator: row of small filled dots in player color, one per level
- On purchase: button flashes player color, "UPGRADED!" text pops out briefly
- Maxed out: gold `#ffdd44` border, "MAX" label

**Sabotage buttons (right panel):**
- Similar to upgrade buttons but with red/danger color accent `#ff3344` left bar
- Hack: lightning bolt icon (two line segments)
- Steal: hand icon (simplified polygon)
- Virus: biohazard symbol (three arcs)
- On activation: button flashes white then red, icon animates briefly

**Leaderboard bar (top):**
- Dark `#0a0a18` background, player entries as colored blocks
- Leader entry: slightly larger text + team-color glow + small crown `#ffdd44` above
- Score values animate when they change (roll-up counter)

**Timer bar:**
- Full-width progress bar, gradient from left `#44aaff` → `#ffdd44` → `#ff5555` as time runs out
- Last 10 seconds: bar pulses red, border flashes

**Attack warning:**
- Instead of simple overlay, show directional attack arrows from attacker player color pointing at victim's panel
- Victim's panel border flashes team color of attacker rapidly for 0.5s
- Floating red text "HACKED!" / "STOLEN!" / "VIRUS!" rises from the victim's score area

### Particle & Effect System

- **Coin click spark:** 8 gold particles `#ffe066`, radiate from button center, life 0.4s, arc upward, small (3px)
- **Auto-click burst:** 4 smaller gold particles, same trajectory but lower intensity
- **Upgrade purchase:** 6 player-color star particles from button, life 0.5s
- **Sabotage activate:** 8 red spark particles `#ff3344` from target panel + shockwave ring
- **Milestone number:** Large floating "+1000!" text in team color, rises 40px and fades over 1s
- **Game over / winner:** Winner's panel expands glow, 20 gold particles fill center screen
- **Circuit background:** 12 slow-drifting lit nodes on the circuit pattern, travel along lines

### UI Polish

- Upgrade panel title: "UPGRADES" in player-color all-caps with glow, top of panel
- Sabotage panel title: "SABOTAGE" in red `#ff5555` with glow
- Cost labels: gold `#ffdd44` with coin symbol
- "CLICKED!" floating text above button on manual click, white, fades in 0.5s
- Speed boost (Multiplier) active indicator: animated number "+Nx" badge next to score in gold

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Manual click | Crisp tap | 600Hz triangle, gain 0.4 | 0.06s | Satisfying click |
| Auto-click | Softer tap | 500Hz triangle, gain 0.2 | 0.05s | Subtle auto |
| Upgrade purchase | Rising tone | 400Hz → 800Hz sine, gain 0.5 | 0.2s | Reward chime |
| Max upgrade | Fanfare | C5-E5-G5 chord, sine, gain 0.5 | 0.4s | Achievement |
| Hack activate | Electronic buzz | 200Hz square, gain 0.5 | 0.3s | Digital attack |
| Steal activate | Zap | 800Hz → 200Hz sawtooth, gain 0.4 | 0.25s | Resource theft |
| Virus activate | Descending whine | 600Hz → 100Hz, gain 0.4 | 0.5s | Malware deploy |
| Being hacked | Alarm blip | 440Hz square, 3 blips, gain 0.5 | 0.5s | Warning |
| Score milestone | Cash register | 880Hz + 1108Hz triangle chord, gain 0.5 | 0.3s | Cha-ching |
| Timer warning | Beep | 660Hz sine, gain 0.4 | 0.08s per beat | Last 10s countdown |
| Game over | Triumphant | C4-G4-E5-G5 arpeggio, sine, gain 0.5 | 0.8s | Winner fanfare |
| Leaderboard change | Blip | 550Hz triangle, gain 0.25 | 0.07s | Rank shift |

### Music/Ambience

Energetic digital/electronic loop to match the competitive intensity:
- Bass: Square wave 55Hz, rhythmic on/off at 130BPM (8th notes), gain 0.15
- Hi-hat: White noise bandpass 7000Hz, gain 0.12, every 1/8 note, accent every 1/4
- Lead: Sawtooth 440Hz with fast LFO vibrato (8Hz, ±5Hz), simple 4-note loop (A-C-E-G), 0.5s each, gain 0.1
- Intensity layer: As game timer approaches end (last 30s), gradually raise bass gain to 0.25 and add sawtooth pad (220Hz, gain 0.08) for urgency
- Between rounds: 2-second silence then new loop begins with slightly higher tempo (+5BPM)

## Implementation Priority

- High: Coin button click animation (depress, flash, spark particles), floating "+N" text on click, attack warning directional arrows, all click/purchase/attack sounds
- Medium: Circuit background animation, upgrade button level-dot indicators, timer bar gradient + pulse, leaderboard rank shift animation, ambient electronic loop
- Low: Button icon graphics (lightning/hand/biohazard), coin button size scaling with multiplier level, game-over gold particle burst, milestone floating text, score roll-up animation
