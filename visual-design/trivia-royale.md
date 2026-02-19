# Trivia Royale — Visual & Sound Design

## Current Aesthetic

Dark navy `#1a1a2e` background with a simple vignette. Player avatars are geometric shapes (circles, diamonds, hexagons etc.) in distinct colors along top and bottom strips. The timer is a horizontal bar that shifts from green to red. Answer choice boxes are labeled rectangles with a filled label badge on the left. Category name shown in a category-specific color above the question text. Elimination uses a red skull banner. Particles fire on correct answers. Screen flashes red/green for correct/wrong. The system is well-structured and readable — but visually it feels like a quiz show mock-up, not a battle royale.

## Aesthetic Assessment
**Score: 2.5/5**

The geometric avatar variety and color-per-player system are genuinely good. The timer mechanics (pulsing red when critical, full-screen red wash) create real tension. The text layouts are clean. What's missing: drama, depth, and a feeling that players are being eliminated from an arena rather than a game show.

## Visual Redesign Plan

### Background & Environment

The background becomes an animated arena. Draw a dark radial gradient effect: a central bright zone `#1e1e38` surrounded by dark edges `#0a0a14`. Add 12 very faint rotating "spotlight" lines emanating from the center, slowly spinning at 1°/s, each a gradient from transparent to `#ffffff06`. These are done as thin fillRect strips rotated around the center point.

The player slot strips (top and bottom) get a frosted-glass treatment: a fillRect at 12% opacity `#0a0a18` with a 1px border line `#2a2a48`.

Category-specific environment tinting: When the active category changes, briefly tint the background (`fillRect` with category color at 3% opacity) for the duration of that question, creating a subtle mood shift.

### Color Palette
- Background center: `#1e1e38`
- Background edge: `#0a0a14`
- Correct answer: `#00ff88`
- Wrong answer: `#ff2244`
- Timer safe: `#00ff44`
- Timer danger: `#ff2200`
- Player highlight: matches each player's existing color
- Neutral text: `#ccccdd`
- Glow/bloom: per-player color at intensity 0.7

### Entity Redesigns

**Player slots** — Elevate each avatar's presence:
- Draw a subtle aura glow ring (strokePoly circle 2px larger than the avatar) at the player's color, 0.4 opacity.
- Alive players: full color, inner highlight dot at top-left of avatar.
- Eliminated: avatar color desaturates to gray, a large X is drawn with a dramatic slash animation (line growing from center outward over 400ms) rather than two static lines.
- Player who answered correctly this round: a brief upward-floating "+100" text particle in their color, 600ms.
- Answer indicator now includes a brief particle burst (5 particles) from the avatar position.

**Timer bar** — Restyle as a segmented countdown bar with 15 equal segments, each one going dark as time passes. Critical state (≤3 segments): each remaining segment pulses independently with a sine wave on brightness. The time-remaining number becomes much larger (20px font) and positioned center-screen during critical phase.

**Answer choice boxes** — Redesign for drama:
- Default state: dark fill `#181830`, left-side label badge in the category color, text `#cccccc`.
- Hover: bright glow on the label badge, text lifts to white, `#2a2a50` background.
- Selected (pending): the full box border pulses in the player's chosen color (pink/`#f0a`), background shifts to `#1e103a`.
- Reveal (correct): the correct box floods with `#00ff88` from left to right over 200ms (animated fillRect growing in width), text turns black.
- Reveal (wrong): wrong choice box flashes `#ff2244` then fades to `#300`. Correct box glows.
- The left label badge becomes a checkmark or X icon after reveal.

**Elimination banner** — The current skull banner is good. Enhance it:
- Add a slowly expanding shockwave ring (strokePoly circle) from the eliminated player's avatar position.
- The banner text gets a brief character-by-character type-on animation effect — drawn by progressively slicing the string across frames.
- A thin horizontal "ELIMINATED" line sweeps across the screen.

### Particle & Effect System

Correct answer particles: 20–25 particles in the player's avatar color + gold sparkles (`#ffd700`), exploding from the answer box. Gravity-pulled downward, life 600ms.

Wrong answer: 8 particles in `#ff2244` fall downward from the choice box, heavier gravity.

Elimination burst: 40 particles from the avatar position — large radius, life 800ms, matching the player's color fading to red. Simultaneous screen shake of 6px.

Round transition: a brief white flash (fillRect 20% opacity) for 60ms then dark wipe (dark fillRect sliding in from left over 150ms) that reveals the new question. Creates a "next round" punctuation.

Final standings: rank numbers appear with a brief scale-up animation effect — draw them with increasing size over 3 frames for the top 3 positions.

### UI Polish

**Round counter**: Display as "Round 5/25" with the current round number large `(32px)` and the total small `(14px)`. A thin arc draws around it indicating overall progression.

**Alive player count**: Replace the plain text with a row of tiny avatar icons (6px) that go dark as players are eliminated, giving a quick visual glance at who's still in.

**Score display**: Each player's mini score in the slot gains a slow animation whenever it changes — the number briefly scales up then back to normal (2 frames of 1.3× size then normal).

**Category badge**: Rendered as a pill-shaped badge (fillRect with rounded ends approximated by the available renderer) with the category color as fill, white text. Gets a brief entrance animation (slide in from top over 100ms) when each new question appears.

**Final standings podium**: Top 3 positions get gold/silver/bronze colored vertical bars behind the rank text, heights proportional to score, creating a mini podium visualization.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Question appears | Short ascending 3-note fanfare: 523→659→784Hz | Triangle osc, gain 0.2→0, 60ms each | 180ms | Round start sting |
| Answer selected | Soft click: sine 800Hz | Gain 0.1→0 | 40ms | Tactile confirmation |
| Timer tick (final 5s) | Metronomic sine 1046Hz | Gain 0.3→0, once per second | 50ms per tick | Building urgency |
| Correct answer | Bright ascending chime 784→1047→1318Hz | Sine, gain 0.4→0 | 350ms | Clear success signal |
| Wrong answer | Descending buzz: saw osc 400→200Hz | Gain 0.35→0 | 300ms | Failure sting |
| Timeout (no answer) | Low tone blip: sine 220Hz | Gain 0.25→0 | 200ms | Time's up buzz |
| Elimination | Dramatic sting: noise burst + descending 400→50Hz | Gain 0.5→0 | 600ms | Player out |
| Round transition | Whoosh: noise through highpass 500→4000Hz sweep | Gain 0.3→0 | 250ms | Between rounds |
| Score update (points) | Quick high ping: 1760Hz sine | Gain 0.12→0 | 60ms | Score tick |
| Victory (player wins) | Triumphant fanfare: 523+659+784+1047Hz together | All sines, gain 0→0.5→0 | 1200ms | Winner celebration |
| Defeat (player out) | Somber two-note fall: 329→261Hz | Sine, gain 0.3→0 | 600ms | Elimination stinger |
| Timer critical pulse | Low warning thrum: sine 80Hz, pulsed 4Hz | LFO on gain 0→0.2, 3Hz pulse | continuous | Under timer bar |

### Music/Ambience

Between questions (reveal phase): A 2-bar tension loop using three oscillators — a bass drone at 55Hz (sine, gain 0.05), a mid harmonic at 220Hz (triangle, gain 0.03), and a high shimmer at 880Hz with a 0.5Hz amplitude LFO (gain 0.015). This plays during the answer reveal phase and stops on transition.

During question (question phase): The loop continues but the bass drone gets a subtle rhythmic pulse (gain envelope triggered at 2Hz: 0.05→0.08→0.05) simulating a heartbeat that increases with player tension.

Category-specific instrument coloring: Change the triangle osc filter cutoff based on category — Science=bright (2000Hz cutoff), History=warm (800Hz), Nature=open (no filter). A very subtle texture difference that reinforces the category feel.

## Implementation Priority
- High: Answer box reveal animation (left-to-right flood fill), elimination shockwave ring, timer segment bar with individual pulses, correct/wrong sound events
- Medium: Avatar glow auras, score update animation, category badge pill, question appear fanfare, critical timer tick sounds, floating score particles
- Low: Rotating spotlight background, round transition wipe, elimination character-type animation, ambient music loop, category-based sound coloring, final standings podium bars
