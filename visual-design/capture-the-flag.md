# Capture the Flag — Visual & Sound Design Plan

## Current Aesthetic

The game features a 600x400 viewport over a 1200x800 tile map with a dark navy background `#0d0d1a` and grid lines `#1a1a2e`. Blue team uses `#4488ff` and red team uses `#ff4444`. Four unit classes: scout=`#6cf`, heavy=`#f66`, medic=`#6f6`, engineer=`#ff6`. Units are circles with a facing direction line. Flags, turrets, HP bars, a minimap, and a kill feed are present. The map has wall tiles that block movement. The overall look is clean but clinical — flat colored circles on a grid. The game should feel like a covert military/sci-fi tactical operation, with team territory feeling visually distinct and charged.

## Aesthetic Assessment: 2.5 / 5

The dual-color team system is well established. The minimap and kill feed are good HUD elements. But the flat circles give no sense of unit weight or class identity. The map feels like a blank grid. Floor tiles, cover objects, and environmental atmosphere are absent. Bullet/projectile effects are minimal.

---

## Visual Redesign Plan

### Background & Environment

- **Floor tile system**: replace flat `#0d0d1a` background with a **tactical grid floor**. Each tile: dark charcoal base `#0c0e14` with 1px border lines `#141820`. Every 4th tile gets a subtly lighter cross-mark `#181c24` for a subtle military blueprint feel.
- **Wall tiles**: redesigned as **concrete barrier blocks** — fill `#2a2e3a`, top highlight `#3a4050`, bottom shadow `#1a1c24`. Shadow cast rightward: thin dark triangle `rgba(0,0,0,0.4)`.
- **Team territory visual**: the half of the map controlled by each team gets a very faint color wash — blue team's base area has `rgba(68,136,255,0.04)` overlay, red team's has `rgba(255,68,68,0.04)`. This fades at the center.
- **Flag base zones**: circular marking on the ground — two concentric rings drawn on the floor in the team's color at 0.15 alpha, with a crosshair style (4 arc segments, not full circle).
- **Cover objects**: beyond just wall tiles, add visual prop polygons — sandbags as clustered rounded rectangles in `#5a4a30`, barrels as circles in `#3a3a4a` with a bright stripe.
- **Camera edge vignette**: dark radial gradient overlay at screen edges, `rgba(0,0,0,0.3)`, to focus attention on the center of the viewport.

### Color Palette

| Role | Old | New |
|---|---|---|
| Floor base | `#0d0d1a` | `#0c0e14` |
| Grid lines | `#1a1a2e` | `#141820` |
| Wall fill | flat dark | `#2a2e3a` |
| Wall highlight | none | `#3a4050` |
| Blue team player | `#4488ff` | `#4488ff` (keep, enhance with glow) |
| Red team player | `#ff4444` | `#ff4444` (keep, enhance with glow) |
| Scout class | `#6cf` | `#60ccff` light blue |
| Heavy class | `#f66` | `#ff5544` warm red |
| Medic class | `#6f6` | `#44ee66` bright green |
| Engineer class | `#ff6` | `#ffcc44` warm gold |
| Blue flag | team color | `#4488ff` waving polygon, white `F` label |
| Red flag | team color | `#ff4444` waving polygon |
| Bullet | white dot | `#ffffc0` tracer streak |
| HP bar (friendly) | none | `#44ee66` |
| HP bar (enemy) | none | `#ff4444` |
| Minimap bg | dark | `#080c12` with team color borders |
| Kill feed text | white | team-colored names, white verb |

### Entity Redesigns

**Units (all classes)**
- Body: filled circle in team color, now with `setGlow(teamColor, 8)` at all times.
- Direction indicator: replaced simple line with a small equilateral triangle pointing in movement direction, filled in team color, outlined in bright white `#ffffff` at 0.5 alpha.
- Class identifier ring: thin circle stroke inside the main circle (r-4) in the class color. Gives instant visual read: scout = pale blue ring, heavy = no ring (bold solid), medic = bright green ring, engineer = gold ring.
- Human player unit: slightly larger (r+2), brighter glow, a small crown/star marker above.
- Dead unit: circle shrinks to 0 over 0.5s with an expanding ring death pulse.

**Class-specific shapes**
- Scout: smaller radius (r=8), faster-looking, small motion trail behind (2 ghost circles at 0.2 alpha when moving fast).
- Heavy: larger radius (r=14), slight armor polygon layered over circle (hexagon outline in darker team shade).
- Medic: standard radius (r=10), small cross symbol (+) drawn inside circle in white.
- Engineer: standard radius, small wrench icon (two perpendicular rectangles) drawn inside.

**Flags**
- Pole: 2px vertical line in `#a0a0a0` silver.
- Flag cloth: animated waving polygon — 5-point bezier curve simulating a flag in wind (sine offset on X for each point over time). Filled in team color with bright highlight on leading edge.
- When carried: flag appears behind carrying unit, smaller, with a visible trail.
- At base: flag base zone circle pulses subtly when team's own flag is present (safe).

**Turrets (engineer)**
- Square base in dark metal `#2a3040`.
- Rotating barrel: rectangle pointing in aim direction, colored in engineer gold `#ffcc44`.
- Alert mode (targeting enemy): glows red `#ff4444`.
- Firing: brief muzzle flash — bright white circle at barrel tip, 3 frames.

**Bullets / Projectiles**
- Not just a dot — a **tracer streak**: draw the current position as a bright `#ffffc0` circle (r=2) with a line of 4 decreasing-alpha dots behind it showing travel path (trail length = 6px per dot).
- Heavy's bullets: larger (r=4), orange tinge `#ffaa44`.
- Medic healing pulse: expanding green ring (no bullet, just a wave).

### Particle & Effect System

| Effect | Description |
|---|---|
| Bullet impact (wall) | 4 spark lines radiating from impact, `#ffffc0`, 2px, 150ms |
| Bullet impact (unit) | Blood/spark: 6 particles in hit unit's team color + white, radial, 300ms |
| Unit death | Circle expands from death point (team color, fade alpha 0 over 400ms) + 8 spark particles |
| Flag capture | Large ring pulse expands from flag base (capturing team's color), 3 expanding rings, 1s each |
| Flag drop | Flag bounces: scale 1.3 → 1.0, dust puff of 4 particles |
| Medic heal | Green sparkles orbit target unit: 3 `#44ee66` particles spiral inward |
| Turret fire | Muzzle flash: white filled circle r=8 at barrel tip, 3 frames |
| Territory flash | Score event: brief color wash over team's side (0.2 alpha, 0.3s) |
| Kill feed entry | New kill feeds slide in from right, held 4s, slide out |

### UI Polish

- **Minimap** (bottom-right): background `#080c12`, team-colored border (blue left half, red right half of border). Units shown as 2px dots in team color. Flags as 3px star. Minimap has a subtle scan-line overlay (every other row `rgba(0,0,0,0.1)`).
- **Kill feed** (top-right): each entry: [attacker name in team color] [white "killed"] [victim name in team color]. Monospace font. Newest at top, max 5 visible.
- **Score display** (top center): blue score | red score in large bold. Team flags shown as small icons next to scores.
- **Class selector** (pre-game): styled as military dossier cards — dark card with class icon, name, stat bars.
- **Respawn timer**: large countdown number in team color, centered on screen, with circular progress ring.
- **Flag status indicator**: top bar shows flag icons — when flag is captured, icon blinks in captor's color.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Gunshot (scout) | noise burst | — | A:0 D:0.05 | highpass 1000Hz | sharp crack |
| Gunshot (heavy) | noise + sine | — + 80Hz | A:0 D:0.15 | lowpass 600Hz | heavy boom |
| Bullet impact (wall) | noise | — | A:0 D:0.04 | bandpass 2000Hz Q=2 | ricochet ping |
| Bullet impact (unit) | noise | — | A:0 D:0.08 | lowpass 800Hz | wet thud |
| Unit death | noise + sawtooth | — + 220→80Hz | A:0 D:0.3 | lowpass sweep | death thud |
| Flag pickup | sine arpeggio | 523→659→784Hz | A:0 D:0.08 per | none | ascending chime |
| Flag capture | sine chord | 523+659+784+1047Hz | A:0.01 D:1.0 S:0.5 R:0.5 | reverb | triumphant fanfare |
| Flag dropped | sine descend | 784→523→392Hz | A:0 D:0.1 per | none | descending warning |
| Medic heal | triangle | 880Hz warble (LFO 6Hz) | A:0.01 D:0.0 S:0.5 R:0.2 | lowpass 2000Hz | healing hum |
| Turret fire | noise + sine | — + 120Hz | A:0 D:0.08 | lowpass 500Hz | mechanical clank |
| Respawn | sine | 440→660Hz sweep | A:0 D:0.3 | none | reentry tone |
| Match win | sine chord | major chord + arpeggio | A:0 D:2.0 | reverb | victory fanfare |
| Match lose | sawtooth | minor chord | A:0 D:1.5 | lowpass 800Hz | defeat sting |

### Music / Ambience

- **Ambient base**: constant low filtered noise (bandpass 100Hz, gain 0.02) suggesting distant conflict. Occasional distant explosion: noise burst at lowpass 100Hz, D:0.8, every 8–20s randomly.
- **Game music**: driving 4/4 electronic-military feel. Kick drum (noise + 60Hz, D:0.15) on beats 1+3. Snare (noise, bandpass 1500Hz, D:0.1) on 2+4. Hi-hat pattern (noise, highpass 5000Hz, D:0.03) on every 8th note. Bass synth: sawtooth at 80Hz, playing [C, C, G, A-flat] four-bar loop. Melody: simple square oscillator at 4x frequency (320Hz) playing a tense 8-note pattern. Tempo: 140 BPM.
- **Flag captured (ally)**: music adds a triumphant brass-like sawtooth chord stab, once.
- **Flag captured (enemy)**: music drops to just drums + bass, slightly slower feel for 8 bars (tension mode).
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Unit class rings and directional triangles
- Tracer bullet streaks
- Unit death expanding ring pulse
- Flag capture ring pulse effect
- Floor tile grid texture
- HP bar colors (friendly green, enemy red)

**Medium**
- Wall tile concrete 3D effect with shadows
- Flag waving polygon animation
- Team territory color wash overlay
- Minimap scan-line overlay
- Kill feed slide-in animation
- Turret muzzle flash
- Gunshot and bullet impact sounds

**Low**
- Scout motion trail
- Sandbag/barrel prop details
- Camera vignette overlay
- Generative military percussion loop
- Ambient distant explosion sounds
- Flag base zone pulsing animation
