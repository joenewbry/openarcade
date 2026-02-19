# Rocket League 2D — Visual & Sound Design

## Current Aesthetic

Orange-themed arena (`#f60` accent) with a dark blue-grey field (`#1a1a3e` background). Player is an orange car drawn as a filled polygon with a windshield rect. AI car is blue. Ball is a white circle with 5 rotating black soccer spot circles. Goals are white-bordered boxes on left and right sides with horizontal net lines. Boost pads are rotating yellow diamonds. Boost meter is an orange bar at the bottom. Score and time are displayed in a top HUD. Particles are small colored squares on collision. Explosion on goal is a circle burst.

## Aesthetic Assessment
**Score: 2/5**

The core car physics are fun but the visual presentation is extremely bare. The field has no surface texture or depth, the ball is a plain circle, the goals feel flat, and the boost pads are just spinning shapes. It looks like a placeholder rather than a finished game. The color scheme is there but untapped.

## Visual Redesign Plan

### Background & Environment

Replace the flat dark background with a proper **stadium interior**. Draw a dark green playing field with subtle grass texture (faint diagonal line hatching at very low opacity). Add bright white field markings: center circle, center line, and corner arcs. The sidelines get bright white borders with a thick neon orange glow matching the player color on the left, neon blue on the right. Behind each goal, render a crowd of dots in team colors (rows of small colored circles) suggesting stadium seating. Above the field, add a dark ceiling/roof silhouette with hanging stadium lights (small white glow circles at regular intervals along the top).

Add a subtle depth illusion: the field corners have a faint shadow vignette, and the center of the field has a slight lighter patch (spotlight from above).

### Color Palette
- Primary (player/orange team): `#ff6600`
- Secondary (AI/blue team): `#2266ff`
- Field surface: `#0a2010`
- Field markings: `#ffffff`
- Goal net: `#aaaaaa`
- Boost pad: `#ffdd00`
- Background/stadium: `#080810`
- Glow/bloom: `#ff6600`

### Entity Redesigns

**Player car (orange):** Redesign from simple polygon to a sleek rocket car silhouette. Draw the body as a low wide hexagonal shape. Add a translucent windshield (dark blue-tinted rectangle). Four wheel circles with slight perspective. Two exhaust nozzles at the rear — glowing orange ovals. When boost is active, draw a long orange rocket exhaust flame trail extending 30px behind the car, flickering randomly in length. Add a small team badge on the roof (orange diamond).

**AI car (blue):** Mirror design with blue colorway. Nozzles glow blue. Exhaust trail is blue-white when boosting. The AI car gets a slightly more angular body to visually distinguish it from the player.

**Ball:** Transform from plain circle to a proper soccer ball with panels. Draw the center circle in white, then overlay a hexagonal panel pattern using 6 small pentagon shapes arranged radially (alternating white and light grey). Add a subtle specular highlight (small white ellipse at top-left). The ball gets a motion blur streak (3 fading copies offset in movement direction) at high speed. At extreme speed, the ball glows white. On wall/floor contact, draw a brief contact flash ring.

**Goals:** Each goal gets proper depth — draw the back wall, top bar, and posts as 3D-ish shapes using lighter and darker shades. Net is a fine grid of thin lines inside the goal area. When a goal is scored, the entire goal cavity flashes in the scoring team's color with a bright strobe effect.

**Boost pads:** Replace spinning diamonds with glowing energy discs. Draw a circle with a double-ring border in yellow. Four small arrow triangles pointing inward/outward rotate around the ring. Add a subtle yellow light cone extending upward (very transparent triangle). When collected, burst of yellow sparkles radiates outward and the disc dims briefly before regenerating with a fill-up animation.

**Arena walls/ceiling:** Draw the boundary as thick neon-bordered lines with a slight inner glow. When the ball hits a wall, a brief ripple emanates from the impact point.

### Particle & Effect System

- **Goal scored:** Giant team-colored explosion from the ball's position. 30 confetti rectangles in team colors spiraling outward. Screen flash in team color for 4 frames. Camera shake 8px for 30 frames. Text "GOAL!" in giant bold font drops from above with a bounce.
- **Boost active:** 8–12 small orange flame particles trail from the car exhaust per frame, fading over 15 frames. Each flame is a small triangle that scales down.
- **Boost pad collected:** Ring of 8 yellow sparks shoots outward. Brief yellow light flash.
- **Ball hit:** White impact flash at contact point, size proportional to collision force. Velocity-proportional motion blur trail.
- **Car demolish:** (if velocity delta is extreme) Orange explosion burst from car, 12 metal fragment rectangles fly out.
- **Kickoff countdown:** Large numerals (3, 2, 1, GO!) drop from center-top with a bounce, each in team-split color (left half orange, right half blue).

### UI Polish

- Score display: Large centered numbers at top with team color backgrounds — left side orange panel, right side blue panel, score number in white. Animated when score changes (number slams down with scale bounce).
- Timer: Centered between scores with a circular countdown ring that depletes. Flashes red under 10 seconds.
- Boost meter: Replace flat bar with a segmented gauge — 5 segments that light up orange as boost fills. Each segment has a subtle glow. Flashes when full (ready for double-boost).
- Match winner banner: Full-width banner slides down from top with team color, "ORANGE WINS" or "BLUE WINS" in large text with sparkle particles.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Car engine idle | OscillatorNode, sawtooth | 120 Hz, gain 0.03 | Loop | Low rumble always present |
| Car engine boost | OscillatorNode, sawtooth | 120→280 Hz ramp | Loop | Pitch rises with boost |
| Ball hit (light) | OscillatorNode, sine | 440 Hz, fast decay | 0.06s | Soft thud |
| Ball hit (hard) | White noise + sine 120 Hz | Lowpass 800 Hz, gain 0.5 | 0.12s | Heavy impact thud |
| Ball wall bounce | OscillatorNode, triangle | 300→200 Hz | 0.08s | Hollow clank |
| Goal scored | OscillatorNode, sine chord | 523+659+784+1047 Hz stagger 50ms | 1.0s | Victory fanfare |
| Boost pickup | OscillatorNode, triangle | 880→1320 Hz sweep | 0.15s | Energy pickup chime |
| Boost active loop | OscillatorNode, sawtooth | 220 Hz + LFO 6 Hz on gain | Loop | Thruster hum |
| Kickoff whistle | OscillatorNode, sine | 1200 Hz steady | 0.3s | Sharp whistle tone |
| Countdown beep | OscillatorNode, sine | 440 Hz, 0.05s | 0.05s | Tick each second |
| Final beep (GO) | OscillatorNode, sine | 880 Hz, 0.1s | 0.1s | Higher pitch GO signal |
| Car skid | White noise bandpass 400 Hz | Gain decay 0.2s | 0.2s | Tire squeal |
| Match end win | Ascending chord | 523→659→784→1047 Hz 80ms each | 0.5s | Triumph sting |
| Match end lose | Descending chord | 440→330→220 Hz 100ms each | 0.4s | Defeat sting |
| Overtime | OscillatorNode, square | 300 Hz 3× pulse | 0.5s | Alert sting |

### Music/Ambience

Electronic stadium anthem: a driving 4/4 beat at 128 BPM. Kick drum: filtered noise burst at 60Hz lowpass, every beat. Snare: white noise 200Hz bandpass, beats 2 and 4. Hi-hat: 8kHz filtered noise, 30ms bursts, every 8th note. Bass line: sawtooth oscillator, 55 Hz root cycling through a 4-bar riff (root, fifth, octave, minor seventh). Lead synth: square wave, 440 Hz, playing a 4-note arpeggio over the chord changes with slight detune (±2 Hz) for width. Pad: triangle oscillators at 220+330 Hz, slow attack 500ms, sustain drone. Music tempo increases by 8 BPM for the final 30 seconds. On goal score, music dips in volume for 2 seconds then resumes. On overtime, add a second arpeggiated lead layer for tension.

## Implementation Priority
- High: Field surface with grass hatching and white markings; player car exhaust flame on boost; ball soccer panel pattern with motion blur at speed; goal scored screen flash and GOAL text drop; boost meter segmented gauge
- Medium: Stadium crowd dot rows behind goals; boost pad energy disc with arrow rotation; stadium light glow circles at ceiling; ball velocity-proportional contact flash; engine pitch modulation audio loop
- Low: Goal cavity 3D depth illusion; car demolish explosion particles; kickoff countdown visual; electronic stadium anthem music loop; corner crowd vignette
