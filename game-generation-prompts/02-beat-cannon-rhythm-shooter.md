# Beat Cannon — Music-Driven Bullet Hell Rhythm Shooter

Build a **rhythm-based bullet hell shooter** as a single `index.html` file where the music drives everything: enemy spawn patterns, bullet waves, visual effects, and scoring all sync to a procedurally generated soundtrack.

## Core Requirements

### Audio Engine (Tone.js from CDN)
- Procedurally generate a full electronic music track with:
  - **Kick drum** on beats 1 and 3 (synthesized with pitch envelope)
  - **Snare/clap** on beats 2 and 4 (filtered noise burst)
  - **Hi-hat** pattern (8th or 16th notes, with open hat variations)
  - **Bass synth** playing a looping 4-bar pattern in a minor key
  - **Lead synth** playing a melody that evolves every 8 bars
  - **Pad/atmosphere** layer with slow filter sweeps
- Start at 120 BPM, increase by 5 BPM every 30 seconds (up to 180 BPM)
- Key changes every 60 seconds to keep the music fresh
- The music must keep perfect time — all gameplay events lock to the beat grid

### Gameplay
- Player ship at the bottom of a Canvas 2D screen, moves left/right with arrow keys or A/D
- **Shoot on the beat**: Player presses Space to fire. If the shot lands within 50ms of a beat, it's a "Perfect" (2x damage, score multiplier). Within 100ms is "Good" (1.5x). Outside that is "Miss" (1x, breaks combo).
- Combo counter that increases with consecutive on-beat shots. Multiplier: 1x → 2x → 4x → 8x at 10/25/50 consecutive hits.
- The player can hold Space to auto-fire, but it always counts as "Miss" timing — incentivizing manual rhythm play.

### Weapons (cycle with Q/E or 1-4)
1. **Pulse Cannon** — Single powerful shot, produces a bass note on fire
2. **Spread Shot** — 5 bullets in a fan, produces a chord stab
3. **Laser Beam** — Continuous beam while held, produces a sustained synth tone that pitch-bends
4. **Wave Bomb** — Clears all bullets on screen, produces a massive reverb crash (3-second cooldown)

Each weapon should add its sound to the music mix so the player is literally playing along with the track.

### Enemy Patterns (synced to music)
- **Wave enemies**: Spawn in formation on the downbeat of each bar. Move in sine-wave patterns.
- **Spiral enemies**: Spawn on beat 3, fire spiral bullet patterns that rotate in time with the music.
- **Bass Drop enemies**: Large enemies that appear every 16 bars during a "bass drop" section. The music builds tension for 4 bars before they arrive.
- **Rhythm Dancers**: Enemies that only move on the beat, zig-zagging in predictable patterns if you learn the rhythm.
- Bullet patterns should form geometric shapes (circles, spirals, figure-8s) and their rotation speed matches the current BPM.

### Boss Fights (every 2 minutes)
- Boss has 3 phases, each changing the music:
  - **Phase 1**: Steady beat, boss fires aimed shots on each beat
  - **Phase 2**: Music shifts to half-time, boss fires slow dense curtains of bullets
  - **Phase 3**: Music goes double-time, boss fires rapid patterns with safe lanes that shift with the melody
- Boss HP bar at top of screen with phase indicators
- Boss defeat triggers a musical flourish and explosion cascade

### Visual Effects (all beat-synced)
- Background pulses/flashes on each kick drum hit
- Screen-edge glow intensifies on snare hits
- Star field scrolling speed syncs to BPM
- Bullet trails have color based on the current musical key (each key = different color palette)
- Combo counter text scales up with a bounce on each increment
- Screen shake on bass drops and explosions
- Particle explosions on enemy death, size proportional to combo multiplier
- "Perfect" hits produce a golden ring expanding outward from the shot

### HUD
- Score (top-right) with animated multiplier display
- Combo counter (center-top) with timing feedback text ("PERFECT!" / "GOOD" / "MISS")
- Health as 3 hearts (top-left), lose one per hit, 3-second invincibility after
- Current weapon indicator (bottom-left)
- BPM display (bottom-right)
- Visual beat indicator — a pulsing circle or bar that helps the player feel the rhythm

### Scoring
- Base points per enemy kill, multiplied by combo
- Bonus points for Perfect timing
- End-of-run score screen showing: total score, max combo, perfect percentage, enemies destroyed, time survived

## Technical Constraints
- Single `index.html` file
- Tone.js loaded from CDN for audio synthesis
- Canvas 2D for all rendering
- All audio is synthesized — no sample files
- Must maintain 60fps with hundreds of bullets on screen
- Use object pooling for bullets and particles to avoid GC pauses
