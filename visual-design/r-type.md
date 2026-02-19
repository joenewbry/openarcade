# R-Type — Visual & Sound Design

## Current Aesthetic

A 512×400 horizontal scrolling shooter with a dark background and parallax star layers. The player ship is a polygon (`#dde`) with a cyan cockpit (`#4ef`) and orange thruster (`#f80`). The Force Pod (detachable weapon) is pink-white (`#f8e`). Enemy types: scouts (`#4f4`), drifters (`#48f`), chargers (`#f80`/`#f44`), turrets (`#f44`), snakes (`#a4f`). Bosses: Dobkeratops (`#f44`) and Gomander (`#4f4`). Three weapon modes: normal (`#f8e`), wave (`#4ef`), bounce (`#a4f`). Terrain at top and bottom with a sinusoidal profile. Charge beam mechanic. The aesthetic has good variety in enemy colors but lacks the biomechanical horror atmosphere of the original R-Type.

## Aesthetic Assessment
**Score: 3/5**

The structure is solid — parallax stars, varied enemies, charge mechanic, multi-part bosses. However, the enemies look like colored geometric shapes rather than alien creatures. The terrain is undetailed. The Force Pod doesn't pulse or glow convincingly. The charge beam is a plain line. There's no sense of the dark, alien-infested space dungeon that defines R-Type's identity.

## Visual Redesign Plan

### Background & Environment

Embrace the biomechanical alien architecture of R-Type. The background transitions from deep space black (`#000005`) at the left edge to a slightly warmer charcoal with subtle alien-organic color wash (`#050510` with a faint `#001133` tint) toward the right (direction of travel). Three parallax star layers:
- Far layer: 60 dots, 1px, white at 0.3 alpha, scroll at 0.2×
- Mid layer: 30 dots, 1px, white at 0.5 alpha, scroll at 0.5×
- Near layer: 12 dots, 1–2px, white at 0.8 alpha, scroll at 0.8×

**Terrain:** The top and bottom terrain strips get an alien-organic upgrade. Base fill in dark teal (`#001a1a`). On the face (the visible vertical face toward the play area), draw horizontal banding: alternating 2px lines of `#002a2a` and `#003333` at 4px intervals, giving an alien ribbed/segmented look. Along the terrain edge (the curve), add a thin bright line (`#00ffcc` at 40% alpha) — like bioluminescent edging on alien flesh. Every 80px along the terrain, place a small "organic nodule" (ellipse in `#004422`, radius 6×3px) — a bump suggesting alien growth.

**Background detail panels:** Behind the terrain (deeper background), occasionally draw large semi-transparent alien structural elements: dark hexagonal grids (`#000a22` at 15% alpha), wide rectangular mechanical panels with grid lines, organic vein-like curves — all scrolling at 0.1× speed, creating a sense of deep alien architecture.

### Color Palette
- Player ship: `#ddeeff` (light blue-white steel)
- Cockpit: `#44eeff`
- Thruster: `#ff8800`
- Force pod: `#ffccee` with `#ff88cc` glow
- Background: `#000005`, `#050510`
- Terrain: `#001a1a`, bioluminescent edge `#00ffcc`
- Normal shot: `#ffddee`
- Wave shot: `#44eeff`
- Bounce shot: `#aa44ff`
- Charge beam: `#ffffff` core, `#aaddff` glow
- Enemy scout: `#22ff66`
- Enemy drifter: `#4488ff`
- Enemy charger: `#ff8800` / `#ff4422`
- Enemy turret: `#ff4422`
- Enemy snake: `#aa44ff`
- Boss: `#ff4422` (Dobkeratops), `#22ff44` (Gomander)

### Entity Redesigns

**Player ship:** The polygon outline becomes a filled, detailed ship silhouette. Use the same vertices but add internal detail: a thin line along the ship's spine (center ridge, `#aabbcc` at 60% alpha), cockpit rendered as a gradient-filled teardrop (bright `#aaffff` at center fading to `#44eeff` at edges), thruster glow upgraded to a bloom effect (`shadowBlur = 15` in `#ff8800`, with animated flicker ±10% every 3 frames). Add a thin wing-sweep highlight line on each wing (brighter `#ffffff` at 30% alpha) along the leading edge.

**Force Pod:** The Force Pod pulses with a heartbeat rhythm: size oscillates ±1.5px over 40 frames (sine wave). A continuous particle ring orbits it — 8 small particles (`#ff88cc`, size 2px) orbit at radius 12px, rotating 3°/frame. When attached to ship front/rear, a thin connecting "energy beam" links pod to ship (`#ff88cc` dashed line at 40% alpha, dashes scrolling at 1px/frame). When charging, the pod's orbit accelerates and intensifies in brightness.

**Charge beam:** The current plain line becomes a layered beam effect. Draw three overlapping rectangles: (1) outer glow: beam width ×4, white at 8% alpha; (2) mid beam: ×2, charge color at 40% alpha; (3) core beam: ×1, white at 90% alpha. The beam origin (muzzle) emits a bright muzzle flash ellipse (2 frames). Add charge-up animation: while holding the button, the ship accumulates a growing orb at the muzzle — a circle growing from 2px to 10px radius in the charge color, with increasing brightness and a spiral of 6 particles orbiting it.

**Enemy - Scout:** Upgrade from a plain triangle to a small dart-shaped creature. A pointed body with two wing fins. Eye — small red dot with a white glint. Wing trailing edges get a thin `#22ff66` glow line.

**Enemy - Drifter:** Amoeba-like pulsing blob. Draw as an irregular polygon with 8 vertices slightly randomized each frame (±1px using sine waves at different phases per vertex). A translucent fill with a brighter center creates a jellyfish feel.

**Enemy - Snake:** Draw each snake segment as a connected series of circles, each with a scale texture (concentric arc at 30% alpha). Bright red pupils in the head segment. The snake's body segments undulate using sine displacement.

**Bosses:** Dobkeratops and Gomander get articulated segments with glowing weak-point cores. The Dobkeratops' eye (weak point) pulses between dim red and bright red-orange over 60 frames. When hit, the hit segment briefly flashes white. Destroyed segments emit a chain of 20 particles and a screen flash (`rgba(255,68,34,0.08)` for 6 frames).

### Particle & Effect System

- **Player shot (normal):** Small white trailing dots (2 ghost circles at prior positions, alpha 0.4, 0.2), giving the shot a comet tail.
- **Explosion (enemy destroyed):** 12–20 particles in the enemy's color, radial burst, lifetime 20 frames, size 4→1px. Plus a ring flash (expanding circle, alpha 0.7 → 0 over 10 frames). Screen briefly tints the enemy's color at 3% alpha for 4 frames.
- **Charge shot fire:** Muzzle flare: 8 particles radiate backward from ship (recoil effect), lifetime 6 frames. The beam expands from 0 to full width over 3 frames. At the beam's leading edge, a bright "cutting" sparkle — 4 particles at the tip each frame.
- **Player hit (shield down):** Screen flash `rgba(255,255,255,0.25)` for 4 frames. 16 particles radiate from player position. Player blinks (alternating visibility) for 120 frames of invincibility.
- **Boss segment destroyed:** Screen shake (±3px offset for 15 frames, decaying). Large explosion: 24 particles, ring flash, `shadowBlur` burst.
- **Force pod attach/detach:** Brief pulse of light at the connection point, 6 particles.

### UI Polish

- **Weapon indicator:** Three small weapon icons (normal/wave/bounce) in the bottom HUD. Active weapon has a bright border + glow. Switching animates: active icon scales from 0.8 → 1.2 → 1.0 over 10 frames.
- **Charge meter:** A thin arc around the player ship's muzzle area (rather than a separate bar) filling clockwise as charge builds, in the current weapon color. At full charge, the arc pulses.
- **Health/lives:** Rendered as ship silhouette icons in the corner, with a slash through destroyed ones rather than just a number.
- **Boss health bar:** A wide bar at the top of the screen (for bosses only), gradient-filled from green → yellow → red, with a pulse animation at low health. Boss name displayed above it.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Normal shot | OscNode (square) + noise | 800 Hz + white noise 0.2 vol | 60 ms | Sharp laser zap |
| Wave shot | OscNode (sine) wavy | 600 Hz + LFO at 20 Hz modulating ±100 Hz | 80 ms | Wavy energy pulse |
| Bounce shot | OscNode (triangle) | 500 Hz, slightly flat | 70 ms | Rubbery boing |
| Charge buildup | OscNode (sawtooth) rising | 110 Hz → 880 Hz over charge duration | continuous | Hold note |
| Charge fire | BiquadFilter (bandpass) noise | 2kHz bandpass, wide Q, 0.8 vol | 200 ms | Explosive discharge |
| Enemy destroyed (small) | OscNode (sine) + noise | 440 Hz + noise 0.3 vol | 100 ms | Small pop |
| Enemy destroyed (large) | OscNode (square) + noise | 220 Hz + noise 0.5 vol | 200 ms | Heavier explosion |
| Boss hit | OscNode (sine) thud | 150 Hz, strong decay | 120 ms | Deep boss damage |
| Player hit | OscNode (triangle) + noise | 300 Hz + noise 0.6 vol | 300 ms | Painful buzz |
| Force pod attach | OscNode (sine) chime | 880 + 1108 Hz | 150 ms | Attachment lock |
| Boss destroyed | Ascending chord + noise | 262+330+392 Hz + noise burst | 600 ms | Dramatic destruction |
| Weapon switch | OscNode (sine) up | 660 → 880 Hz | 100 ms | UI select |

### Music/Ambience

Dark, tense alien-space atmosphere. A continuous low-frequency alien drone: two sine waves slightly detuned (`56 Hz` and `58 Hz`) playing together at 0.04 volume, creating a slow beating interference pattern (2 Hz beat = eerie pulsation). Layer over this a filtered noise "alien wind" (`BiquadFilter` bandpass at 300 Hz, Q=0.5, white noise at 0.015 vol) for constant ambient texture. Every 4–8 seconds, a distant mechanical clank (triangle wave at `80 Hz`, 150ms, 0.05 vol, panned slightly). On boss entry, shift the drone from `56/58 Hz` up to `88/92 Hz` and increase volume from 0.04 to 0.07 — the ambient threat level rises noticeably without a music change. The drone's beat frequency (2 Hz) doubles to 4 Hz during boss fights using a slight frequency divergence increase.

## Implementation Priority
- High: Layered charge beam effect with charge-up orb animation, player ship thruster glow + wing highlights, enemy explosion particle burst + ring flash
- Medium: Force pod orbit particle ring + energy tether, terrain bioluminescent edge + ribbing, drifter amoeba pulsing vertices
- Low: Background alien architecture panels, alien drone ambience, boss health bar, weapon icon UI, snake segment undulation
