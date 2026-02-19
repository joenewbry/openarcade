# Top-Down Shooter — Visual & Sound Design

## Current Aesthetic

A 4-player arena shooter on a 600x600 canvas — 1 human player and 3 AI bots. Players are colored circles: green `#44ff44`, blue `#4444ff`, yellow `#ffff44`, magenta `#ff44ff`. Four weapon types: pistol, SMG, shotgun, rocket. Bullets are small filled circles in weapon-specific colors. The map has procedurally generated rectangular wall covers in dark gray `#2a2a2a`. The floor is a plain dark background. A 3-minute match timer counts down. Health bars appear below each player.

## Aesthetic Assessment
**Score: 2/5**

The arena shooter format is solid and functional — weapon variety, AI bots, cover objects, pickups. But visually it is entirely featureless. Players are indistinct colored balls. The floor is empty dark space. Cover walls are uniform gray rectangles. There is no sense of a battle arena — no detail, no personality, no spectacle when a player is eliminated. A top-down arena shooter should feel kinetic and chaotic.

## Visual Redesign Plan

### Background & Environment

The arena floor should have a tactical grid texture: dark charcoal `#111118` base with a grid of thin lines `#1a1a22` every 20px, creating a floor grid reminiscent of a tactical map or military compound. At the center of the arena, draw a large dark circle (radius 100px, `#0d0d14`) as a center ring — a visual focal point and subtle danger zone indicator.

Along the canvas border, draw a thick arena wall: 8px filled rectangles in dark concrete `#252520` on all four sides, with corner supports (slightly lighter squares at each corner). This defines the battle arena boundary clearly.

Cover walls should look like actual obstacles — not bare rectangles but styled objects. For rectangular covers: draw a slightly lighter face `#2e2e38` with a 2px top highlight strip `#444450` (the top surface) and a 2px darker shadow strip `#1a1a1e` on the bottom (the shadow). Rounded corners on each wall cover (approximate with a slightly inset polygon).

Add environmental detail: at fixed positions around the arena, draw faint dark markings — tire track patterns (two parallel curved lines), crate corner indicators (L-shapes at corners), and spraypainted X marks. These exist purely as floor art and add visual interest without affecting gameplay.

### Color Palette
- Primary: `#44ff44` (player green), `#4444ff` (blue bot), `#ffff44` (yellow bot), `#ff44ff` (magenta bot)
- Secondary: `#ffaa00` (bullet/rocket), `#00ffff` (SMG shots), `#ff3300` (shotgun pellets)
- Background: `#111118` (arena floor), `#252520` (walls/cover)
- Glow/bloom: Player colors for glow, `#ffaa00` for explosions, `#fff` for muzzle flashes

### Entity Redesigns

**Players:** Give each player a distinct tactical silhouette instead of a plain circle. Draw a body as a slightly elongated oval (wider than tall by 4px). On the oval, draw a direction indicator — a wedge notch at the front of the oval showing the facing direction. Add a small armor ring (1px lighter circle at radius +3px from body edge) as a shield indicator.

Each player has a visible weapon — a small rectangle extending from the front of the body in the facing direction, sized appropriately: pistol=6px long, SMG=10px long, shotgun=8px with a slightly wider barrel, rocket=12px long narrow.

Player name tags appear as small bright text labels above the health bar (P1, BOT1, BOT2, BOT3).

When a player takes damage, they flash white for 3 frames and get a brief red ring expanding outward from the body (radius 12→20px, fading).

**Bullets:** Replace plain circles with directional elements:
- Pistol: A small elongated oval (3x7px) aligned to velocity direction, bright white with yellow trail
- SMG: Tiny but fast — 2x5px cyan-white ovals leaving a 3-frame fade trail
- Shotgun: Wedge-shaped pellets (3x3px triangles) in orange-red
- Rocket: A proper rocket shape — 4x10px rectangle with a pointed front and flame trail behind it (4-6 orange particle trail segments)

**Pickups:** Replace simple shapes with recognizable icons:
- Weapon pickup: Draw a top-down weapon silhouette matching the weapon type (pistol outline, SMG outline, etc.) in bright yellow
- Health pickup: Red cross shape (two overlapping rectangles) with a soft green `#00ff88` glow
- Ammo pickup: Stack of small rectangles suggesting ammo boxes, in amber `#cc8800`

### Particle & Effect System

- **Muzzle flash:** 3-frame bright ellipse at barrel tip aligned to firing direction, in white with the bullet color glow. Lasts 3 frames then vanishes.
- **Bullet impact on wall:** 4-6 spark particles in gray/white radiating from impact point. A small scorch mark (dark circle, 4px) appears on the wall face at impact.
- **Player hit:** Directional blood/damage splatter — 3-4 small red `#dd2222` particles arc away from the hit direction. Red flash ring expands from player.
- **Player elimination:** Large explosion burst at the player position — 12-16 particles in the eliminated player's color arc outward, plus 4-6 white spark particles. Player circle scales to 0 over 15 frames while fading. A "ELIMINATED!" text floater appears in the player's color.
- **Rocket explosion:** Large radius blast — 8 orange particles radiate outward, a bright white core circle appears at frame 0 (radius 20px) and fades to 0 over 12 frames. All players within the blast radius get a shockwave ring effect.
- **Pickup collected:** Brief starburst at pickup position in appropriate color. The weapon/health icon scales up to 150% and fades over 10 frames.
- **Kill leader indicator:** When a player gets their 3rd kill, a small crown icon appears above their HP bar for the remainder of the match.

### UI Polish

- **HP bars:** Styled health bars positioned below each player character (not in DOM). Dark background rectangle, colored fill matching player color, white specular strip at top. HP bar shrinks as damage is taken; at 25% HP it pulses red.
- **Kill feed:** Top-right corner shows recent eliminations as text log entries: "[PLAYER] eliminated [PLAYER]" in the attacker's color. Each entry fades after 5 seconds.
- **Match timer:** Center-top of screen in large, bold format. When under 30 seconds, the timer turns red and pulses. Under 10 seconds, pulses faster.
- **Score panel:** Each player's kill count shown as a row of small skull icons (simple skull polygon: circle head + rectangular jaw) in their color. Alternatively a bold number in player color.
- **End game:** Screen briefly dims, a victory banner slides in from the top with the winning player's color and "VICTORY" text. The winner's icon/circle is shown large, surrounded by the kill count.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pistol fire | Sharp pop | Sine 800→200 Hz + noise | 80ms | Single shot crack |
| SMG fire | Fast pop | Same as pistol, shorter | 50ms | Rapid fire burst |
| Shotgun fire | Loud boom | Noise burst + sine 100 Hz | 150ms | Spread blast |
| Rocket fire | Whoosh | Sawtooth 200→80 Hz | 200ms | Launch sound |
| Rocket explode | Boom | Sine 60 Hz + broadband noise | 400ms | Large explosion |
| Bullet hit wall | Tick | Noise highpass 1.5kHz | 30ms | Ricochet |
| Player hit | Impact thud | Sine 300 Hz + noise | 100ms | Damage sound |
| Player eliminated | Explosion | Sine 80 Hz + noise, peak gain | 300ms | Death burst |
| Pickup weapon | Power chime | Sine 660+880 Hz | 120ms | Weapon ready |
| Pickup health | Healing tone | Sine 528+660 Hz | 150ms | Recovery sound |
| Pickup ammo | Click | Triangle 400 Hz | 50ms | Ammo grab |
| Match start | Countdown beeps | Sine 880 Hz × 3, then 1200 Hz | 400ms | 3-2-1-GO |
| Match end | End fanfare | Sine 523+659+784 Hz | 500ms | Victory chord |
| Reload | Click-clack | Two triangle pulses at 400+600 Hz | 150ms | Magazine swap |

### Music/Ambience

An aggressive electronic combat track using synthesis: a driving bass pattern on sawtooth at 55 Hz hitting in a 4/4 rhythm at 140 BPM (gain 0.05), with a sharp snare substitute (noise burst 40ms, bandpass at 600 Hz, gain 0.06) on beats 2 and 4. A repeating synth melody on square wave plays a short 4-note aggressive riff in A minor (A3, G3, F3, E3 = 220, 196, 174, 165 Hz), 2 beats each, looping. The kick drum volume increases slightly as the match timer decreases, creating urgency. The last 30 seconds add a faster hi-hat pattern (highpass noise, 30ms, every 0.125 seconds, gain 0.02) suggesting tension.

## Implementation Priority
- High: Directional weapon extension rendering on player bodies, muzzle flash effect, rocket explosion particle burst, player elimination burst
- Medium: Bullet trail rendering (directional ovals), wall impact sparks, HP bar polish with pulse at low health, kill feed text log
- Low: Arena floor grid texture, cover wall 3D shading, environmental floor markings, driving combat music synthesis
