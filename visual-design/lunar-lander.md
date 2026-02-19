# Lunar Lander — Visual & Sound Design

## Current Aesthetic

A 500x500 canvas depicting a lunar landing scenario. The ship is a polygon in `#48f` (blue). The lunar surface is filled `#16213e` with outline `#48f`. Landing pads glow `#0f8` (green). 120 stars are drawn as white/grey points. Thrust flame renders as two triangles: outer `#f80` (orange), inner `#ff0` (yellow). Explosion particles are multi-color. The HUD shows velocity, fuel, and altitude. The look is a clean wireframe-inspired aesthetic but lacks polish — the terrain feels flat, the ship is basic, and the atmosphere feels empty rather than vast.

## Aesthetic Assessment

**Score: 3/5**

Better than most — the wireframe-inspired style has genuine character that echoes the original vector game. The flame effect is reasonable. However, the terrain needs more lunar character, the starfield is too sparse and uniform, and the HUD could feel more like a real spacecraft instrument panel. The landing pad could be far more dramatic. The overall scene needs the feeling of cold, silent, infinite space.

## Visual Redesign Plan

### Background & Environment

Commit fully to a deep space aesthetic. Replace the blank background with a true deep-space void: `#000005` (near black with the faintest blue tint). The starfield needs three layers for parallax depth:
- **Far stars** (40): 0.5–1px, colors ranging through `#ffffff`, `#ffe8e0`, `#e0e8ff` (white/warm/cool mix). Very slow twinkle (brightness varies ±20% over 2–4s each, random phase).
- **Mid stars** (50): 1px, slightly brighter, faster twinkle cycle.
- **Near "bright" stars** (10): 1–2px, occasional brief lens flare (tiny 4-point cross at peak brightness).

The lunar terrain fill should shift from `#0f0f1f` (deep valleys) to `#1a1a30` (ridgelines) with a subtle gradient from bottom edge. Add a distant mountain silhouette layer in the far background (simplified polygon, `#080818`, to give sense of depth).

A faint Earth or large planet in the upper corner — just a partial disc, soft blue-white gradient, very translucent `#3a5a8a` at 0.3 alpha. Fixed in place, beautiful but non-distracting.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary (ship) | Cold steel blue | `#6ab4ff` |
| Ship outline | Bright white-blue | `#c8e0ff` |
| Terrain fill | Moon rock dark | `#0f1020` |
| Terrain outline | Pale moon outline | `#4a6090` |
| Terrain highlight | Ridgeline glow | `#7a9ac8` |
| Landing pad base | Brushed steel | `#8899aa` |
| Landing pad glow | Safe green | `#00ff88` |
| Flame outer | Deep orange | `#ff6600` |
| Flame inner | Bright gold | `#ffee00` |
| Flame core | White hot | `#ffffff` |
| Explosion | Multi-color burst | varied |
| Background void | Space black | `#000005` |
| Glow/bloom (pad) | Green beacon | `#00ff88` |
| Glow/bloom (ship) | Thruster blue | `#4488ff` |
| Danger HUD | Alert red | `#ff4444` |
| Earth (bg) | Pale blue orb | `#3a5a8a` |

### Entity Redesigns

**Ship** — Elevate the polygon design with detail. Render the ship in two parts: the body polygon in `#6ab4ff` with a 1px bright outline `#c8e0ff`, plus internal detail lines suggesting hull panels (2–3 short diagonal lines inside the polygon at 40% alpha). Add landing legs — two small triangular outriggers at the bottom corners, visible when above 100px altitude. Add a tiny viewport window (small filled circle `#88ccff` on the body). Apply `setGlow('#4488ff', 0.6)` to give the ship a cold thruster-ready emission.

**Thrust Flame** — Three-layer cone below the ship nozzle: (1) outer wide cone `#ff6600`, (2) mid cone `#ffee00`, (3) narrow inner core `#ffffff`. Flame length scales with thrust input (0.5x to 2x normal). Add slight random width variation each frame (±15%) for flicker. Side thrusters: tiny flame sparks when rotating.

**Landing Pad** — Upgrade from a simple line to a proper landing platform. Draw a rectangular pad with alternating light/dark striping (like a runway). Corner markers: small vertical posts with a flashing green light (`#00ff88`, blink 2Hz). Apply strong `setGlow('#00ff88', 2.0)` around the pad — it's a beacon calling you home. Add a "safe zone" indicator column of soft green light rising from the pad (4px wide, alpha gradient to 0 at top).

**Terrain** — Add crater detail: random ellipses on the terrain surface, slightly lighter than terrain (`#1a2040`), with a slightly darker rim. 3–6 craters per level for lunar realism.

### Particle & Effect System

- **Thrust exhaust**: Per-frame while thrusting: 3–5 particles emitted downward from nozzle. Colors cycle through `#ff6600`, `#ffee00`, `#888888` (exhaust gasses). Each particle decelerates and fades over 0.4s. They drift sideways slightly with ship rotation.
- **Successful landing**: 20 dust particles radiate outward from contact point (lunar dust `#8899aa`), low angle, low gravity. Lifetime 1.2s. Plus a brief green flash from the pad.
- **Crash explosion**: 20–25 particles from impact point. Colors: `#ff6600`, `#ffee00`, `#ff4444`, `#888888` (fire and debris). Random velocities, gravity-affected, lifetime 0.8–1.5s. Screen flash white for 2 frames.
- **Fuel pickup** (if applicable): Cyan sparkles `#00eeff`.
- **Star twinkle**: Not particles, but programmatic brightness fluctuation on the bright stars.
- **Engine startup**: Brief puff of particles when thrust first engaged from rest.

### UI Polish

Transform the HUD into a proper spacecraft instrument panel aesthetic:

- **Velocity meter**: Vertical gauge on left side. Dark panel `#0a0a14`, needle fills from bottom, green `#00ff88` when safe, transitioning to yellow `#ffee00` then red `#ff4444` based on descent speed. Label `V-SPEED` and `H-SPEED` stenciled above.
- **Fuel gauge**: Horizontal bar at top. Decreasing fill in `#00ccff`. Flashes when < 20%.
- **Altitude**: Digital numeric display, large monospace font in `#6ab4ff`. Reads in meters.
- **Score/bonus**: Top right, gold numerals `#ffcc44`.
- Panel borders use thin lines in `#1a2a40` with corner brackets to suggest a cockpit frame.
- When velocity is safe for landing, a green "SAFE" indicator pulses. When too fast, red "ABORT" pulses.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine thrust | Filtered noise | Low-pass noise 300 Hz, with volume envelope | loop | Rumble that varies with throttle — louder/brighter at full thrust |
| Engine startup | Noise ramp up | White noise, volume 0→0.4 over 0.2s | 0.2s | Engine igniting |
| Engine cutoff | Noise ramp down | Volume 0.4→0 over 0.15s | 0.15s | Sudden silence of space |
| Rotation thruster | Short puff | High-pass noise 2k Hz, brief burst | 0.08s | Tiny attitude jets |
| Successful landing (soft) | Triumphant tone | Sine 523+659+784 Hz chord | 1.0s | C major chord, warm |
| Successful landing (hard) | Mixed tone + thud | Chord + low sine 80 Hz impact | 0.8s | Close call landing |
| Crash explosion | Deep boom + noise | Sine 60 Hz + white noise, full amplitude | 0.8s | Powerful, visceral crash |
| Pad proximity beep | Ascending ping | Sine 440 Hz, 2 beeps/s at distance | loop | Gets faster closer to pad |
| Low fuel warning | Urgent beep | Square 880 Hz, 1/s | loop | Alarm when fuel < 20% |
| Altitude chime (passing 100m) | Soft ping | Sine 660 Hz | 0.1s | Navigational awareness |
| Ground proximity alert | Rapid beeping | Square 1200 Hz, 4/s | loop | Below 50m, fast descent |
| Score bonus (smooth landing) | Jingle | 4-note ascending sine arpeggio | 0.5s | Musical reward for precision |

### Music/Ambience

Space is silent — the ambience should reflect this. Use a near-silence approach with occasional very subtle sounds: a low sub-bass hum (sine at 35 Hz, gain 0.03) suggesting deep space vibration, and rare distant "space pings" (sine tone at random 400–800 Hz, slow fade-in/out over 3s, occurring every 15–30 seconds). This creates unease without distraction.

When the engine is running, the thrust audio IS the music — let it dominate. When thrust cuts, immediate silence returns, which itself is dramatic.

Optional: a gentle 8-bar ambient synthesizer loop using filtered sawtooth waves (heavy low-pass, 300 Hz cutoff) at very low volume (gain 0.04). Cold, minimal, space-like. Think vangelis-lite.

## Implementation Priority

**High**
- Three-layer flame render (outer/mid/inner cones with flicker)
- Engine thrust audio (noise-based, throttle-responsive)
- Crash explosion particles (multi-color burst + white flash)
- Landing pad glow beacon (`setGlow` high intensity)
- Ship detail lines (hull panels + viewport window)
- Successful landing particles (lunar dust)
- Pad proximity beep (gets faster when close)

**Medium**
- Three-layer parallax starfield (far/mid/near)
- Star twinkle animation (brightness oscillation)
- Landing pad striping + corner posts + beacon flash
- Velocity/fuel HUD instrument panel styling
- Earth orb in background
- Low fuel and ground proximity alarms
- Thrust exhaust particle trail

**Low**
- Terrain craters (ellipse details)
- Distant mountain silhouette background
- Rotation thruster puff particles + sound
- Engine startup/cutoff sound transitions
- Near-star lens flare effect
- Sub-bass space ambience drone
- Landing leg render on ship at altitude
