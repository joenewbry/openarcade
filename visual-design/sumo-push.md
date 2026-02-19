# Sumo Push — Visual & Sound Design

## Current Aesthetic

A circular ring fighting game on a 500x500 canvas. The dohyo (ring) is a plain light-colored circle on a dark grey background. Two wrestlers are plain colored circles with minimal detail — small eye dots and a horizontal belt line. A stamina bar sits above each wrestler. The background is dark with no texture or atmosphere. Particles are plain colored squares. The overall aesthetic is bare and abstract — the sumo theme is barely communicated through the visual language.

## Aesthetic Assessment
**Score: 2/5**

The circular ring concept is solid and the stamina+charge mechanics are interesting. But the wrestlers look like labeled circles and the environment has no sense of a Japanese arena. This needs ceremony, material weight, and the visual drama of two massive athletes colliding.

## Visual Redesign Plan

### Background & Environment

**Canvas background**: Deep ceremonial dark `#0d0808` — near-black with a very warm hint. A subtle radial gradient glow from center (large circle, `#2a1008` at center fading to `#0d0808` at edges) suggests overhead arena lighting. Outside the ring, a tatami mat texture suggestion: very faint alternating horizontal bands at 4% alpha in slightly lighter warm tones `#1a1008` — the traditional floor of a sumo hall.

**Dohyo (ring)**: The circular ring gets a complete redesign. The ring surface is rendered as a warm clay-sand color `#e8c898` (traditional dohyo clay). A fine crosshatch at 6% alpha in slightly darker `#d4b07a` suggests the packed-earth texture. The ring boundary (tawara straw bales) is drawn as a thick ring border — 12px wide arc in warm wheat `#d4a840` with a slightly brighter inner edge `#e8c860` suggesting braided straw. Four cardinal marks (short thick lines, 2px, in dark `#5a3010`) divide the ring quarters. A center line (shikirisen) is drawn as two parallel dark lines `#5a3010` in the inner ring area where wrestlers begin.

**Ring shadow**: A subtle shadow ellipse slightly below the ring (fillCircle slightly offset, dark `#00000040`) gives the ring a grounded, elevated-platform feel.

**Audience suggestion**: Faint vertical thin rectangles in alternating muted tones at the very edge of the canvas suggest a distant crowd. Drawn at 8% alpha, rows of small rects in muted blue-grey.

### Color Palette
- Dohyo surface: `#e8c898`, `#d4b07a`
- Tawara border: `#d4a840`, `#e8c860`
- Ring markers: `#5a3010`
- Background: `#0d0808`, `#1a1008`
- Wrestler 1 (Player): `#2244cc` (deep indigo-blue mawashi)
- Wrestler 2 (AI): `#cc2222` (deep crimson mawashi)
- Stamina full: `#22dd44`
- Stamina low: `#ff4422`
- Charge indicator: `#ffdd00`
- Win flash: `#ffffaa`
- Glow/bloom: `#ffdd00`, `#2244cc`, `#cc2222`

### Entity Redesigns

**Wrestlers**: Move beyond plain circles to fully designed sumo silhouettes:
- **Body**: Larger filled circle in a neutral flesh-tone `#e8b888`, with a colored mawashi (belt) drawn as an arc/thick ring around the lower third of the circle in the faction color. The mawashi arc is 10px thick.
- **Face**: Two small white circles for eyes with tiny black pupils that shift toward the opponent. A small curved line below for a stern, determined expression.
- **Topknot**: A small dark oval `#2a1a08` slightly above center on the head — the chonmage hairstyle.
- **Arms**: Two short thick lines (`lineWidth 4`) extending from the sides of the body, angled slightly forward in fighting stance. Tips have small circle hands.
- **Charging state**: When charging, the entire wrestler pulses brighter (lighter shade of their color) and gains a bright border ring in their faction color that expands slightly on each frame.
- **Stunned state**: Wobbly rotation — the wrestler tilts ±15 degrees oscillating. Stars orbit the head (4 small 5-point polygon stars in yellow circling at 1 radius above head).
- **Mid-air (pushed to edge)**: The wrestler tilts dramatically at 30 degrees toward the ring boundary.

**Stamina bars**: Redesigned as ceremonial-looking panels. Each bar is framed by two thin dark lines forming a bordered rectangle, with a colored fill that shifts from green to red as stamina decreases. When stamina is low (<25%), the bar flickers rapidly (alternates between 60% and 100% alpha every 3 frames). The bar sits in a small dark panel above the wrestler, labeled with a wrestler icon glyph.

**Charge meter**: The charge builds up as a bright golden arc that sweeps around the outside of the wrestler circle (strokeArc from 0 to 2π scaled by charge amount). At full charge, the arc pulses gold and a brief flash occurs.

**Round score indicators**: Each win is displayed as a sumo victory icon — a small filled circle in the wrestler's faction color, arranged horizontally near the top corners of the canvas. Up to 3 circles visible (best of 5 = first to 3 wins).

### Particle & Effect System

- **Clash impact**: When wrestlers collide with high force, a starburst of 12 impact particles in mixed faction colors (6 blue, 6 red) radiate from the contact point. Each particle is a diamond (rotated square) that spins as it travels.
- **Ring-out**: When a wrestler crosses the ring boundary, a large explosion of clay-colored particles (`#d4b07a`) burst outward — 20 particles scatter in all directions. The ring flashes white for 6 frames.
- **Charge release**: Releasing a full charge shoots 8 bright golden particles forward from the wrestler's position (in the direction of movement). A brief golden arc expands and fades from the wrestler.
- **Round win**: Confetti burst from the winner's current position — 15 small rect particles in the winner's faction color + gold. Winner briefly enlarges (scale 1.2x over 10 frames then returns).
- **Stomp (ground slam)**: When a wrestler uses a heavy stomp move, a circle ring expands outward from the impact point — grows to radius 60 and fades over 20 frames.
- **Dust clouds**: Continuous micro-particles — small grey-tan circles (radius 2-3) drift from beneath each wrestler while they are moving, suggesting dohyo dust kicked up by heavy feet.

### UI Polish

- **Round counter**: Displayed as large stylized kanji-inspired characters at the top center — "ROUND X" in a bold, condensed wide font rendered with large text. The round number blooms to 2x size and shrinks during round transitions.
- **"BASHO!" indicator**: When a new match begins, large ceremonial text appears center-screen in gold, zooming in from 0.5x to 1x size over 20 frames.
- **Result screen**: "RING OUT!" or "FORCE OUT!" text slams down from above the canvas in large white text with a faction-colored border.
- **Ceremony wait**: The brief pause before each round features the wrestlers facing each other with a pulsing red line between them (the shikiri tension). A countdown of 3 dots appears and disappears.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Wrestler clash | Low bass thud + noise | Sine 60Hz + broadband noise | 200ms | Heavy body contact |
| Charge building | Rising sine swell | 110→220Hz, gain increases | Duration of charge | Tension building |
| Charge release | Sharp impact thud | Sine 80Hz + noise burst | 150ms | Powerful release |
| Ring-out | Dramatic boom | Sine 55Hz + heavy noise | 500ms | Massive fall sound |
| Round start | Ceremonial tap | Triangle wave 440Hz | 300ms | Referee signal |
| Round win | Victory ascending | Sine 523→659→784Hz arpeggio | 500ms | Triumphant sting |
| Stomp | Deep thump | Sine 80Hz, sharp attack | 100ms | Ground impact |
| Low stamina | Heartbeat pulse | Sine 80Hz, slow repeat | 60ms each | 1 beat/sec urgency |
| Dodge | Whoosh | Noise highpass 3000Hz sweep | 80ms | Quick movement blur |
| Match win (3 rounds) | Full fanfare | 523+659+784+1047Hz chord + arpeggio | 800ms | Grand victory |

### Music/Ambience

A ceremonial sumo atmosphere loop:
- **Taiko drum approximation**: Low bandpass noise (200Hz center, Q=4) in a slow ceremonial pattern — heavy beat on beats 1 and 3 of a 4/4 bar at 60 BPM. Very deliberate, solemn tempo. Gain 0.05 on beats, 0.005 between. The two-beat pattern evokes traditional taiko rhythm.
- **Shamisen drone**: A sawtooth oscillator at 110Hz filtered through a resonant bandpass (500Hz center, Q=6) at very low gain (0.012) — a buzzing, string-like texture. Very slowly modulates filter cutoff between 400-600Hz via a 0.05Hz LFO.
- **Crowd murmur**: White noise filtered through very narrow bandpasses at 800Hz, 1200Hz, 1800Hz at 0.006 gain each — a distant crowd. Swells slightly (gain x2) during charge-up moments.
- **Intensity layer**: During a clash, the taiko gain doubles for 2 beats and the drone pitch rises a tritone (110→155Hz) for 0.5 seconds — snap of dramatic tension.

## Implementation Priority
- High: Dohyo clay surface with tawara bale border, wrestler mawashi belt arc + topknot, clash impact burst particles, ring-out boom sound
- Medium: Charge arc indicator around wrestler, dust cloud particles, stamina bar flicker at low HP, taiko drum ambient loop
- Low: Audience silhouette rects, stomp ring-expand effect, ceremonial kanji-style round text, crowd murmur swell
