# Gradius — Visual & Sound Design

## Current Aesthetic

Classic horizontal space shooter with a scrolling star field (80 stars), terrain corridors on top and bottom (`#0f3460` fill, `#2af` glow edge), a light-blue player ship (`#8ef`) with orange engine glow, and six distinct enemy types in purple, red, yellow, orange, cyan, and violet. Bullets come in three flavors. A boss has a glowing red core. Power capsules are orange. The power bar sits at the bottom. The aesthetic is functional dark-space shooter but the star field is static in color, terrain is single-tone, and enemies lack particle auras or screen-space effects.

## Aesthetic Assessment

**Score: 3/5**

Solid foundation with good color variety across enemy types and a working glow on the terrain edge. The ship is recognizable. However the background is flat, terrain lacks depth layers, enemy movement patterns lack visual emphasis, and the boss lacks dramatic presence. Explosions are not detailed. The power bar is functional but plain.

## Visual Redesign Plan

### Background & Environment

Replace the static star field with a three-layer parallax system:
- Layer 1 (far): 100 tiny stars `#99aacc`, 1px, scroll at 10% game speed
- Layer 2 (mid): 40 medium stars `#ccddf0`, 1.5px, slight twinkle, scroll at 30% speed
- Layer 3 (near): 12 large bright stars `#ffffff`, 2px with 4px glow, scroll at 60% speed

Add a deep nebula gradient across the canvas: left `#050510` → right `#0d0a25`, with a faint purple cloud shape `rgba(80,40,120,0.06)` drifting slowly rightward.

Terrain top and bottom corridors: Keep `#0f3460` base but add an inner glow gradient fading from edge inward — `rgba(40,170,255,0.25)` → transparent over 20px. The terrain edge line glows `#2af` with 6px bloom. Add subtle circuit-board texture lines `rgba(40,100,180,0.1)` drawn inside the terrain.

### Color Palette

- Primary (ship/laser): `#88eeff`
- Secondary (engine/power): `#ffaa00`
- Background deep: `#050510`
- Background mid: `#0a0820`
- Nebula accent: `#4a1a7a`
- Terrain fill: `#0f3460`
- Terrain glow: `#2299ff`
- Enemy grunt: `#9988ff`
- Enemy red: `#ff4444`
- Enemy sine: `#ffee00`
- Enemy turret: `#ff8800`
- Enemy fast: `#00ffee`
- Enemy heavy: `#cc44ff`
- Boss body: `#445566`
- Boss core: `#ff3300`
- Power capsule: `#ff9900`
- Explosion core: `#ffffff`

### Entity Redesigns

**Player Ship:** Polygon outline `#88eeff` with a soft 6px bloom. Engine exhaust: animated 3-segment flame in `#ffaa00` → `#ff6600` → transparent, length scaling with boost. Add a subtle hull detail — a darker centerline `#446677` and a bright cockpit dot `#ffffff`. On damage: full ship flashes red `#ff4444` with a 0.2s shake.

**Enemy — Grunt (`#9988ff`):** Add a faint purple aura (2px glow). On death, explode into 8 angular shards that spin outward. Movement trail: 3 ghost copies fading to transparent.

**Enemy — Red (`#ff4444`):** Pulsing red glow (glow oscillates 2–8px). Drops a glowing orange capsule that sparks as it falls.

**Enemy — Sine Wave (`#ffee00`):** Yellow with 4px glow. Draw sine motion as a faint yellow trail `rgba(255,238,0,0.2)` behind it.

**Enemy — Turret (`#ff8800`):** Static base with rotating barrel. Muzzle flash white circle on fire. Base has an orange rim light.

**Enemy — Fast (`#00ffee`):** Cyan with strong 8px glow. Speed trail: 6 ghost copies in rapid succession, fading cyan → transparent.

**Enemy — Heavy (`#cc44ff`):** Large, violet with pulsing shield aura. When damaged, shield arc appears and sparks.

**Boss:** Multi-segment body in dark steel `#334455` with riveted detail circles `#223344`. Core: bright red `#ff3300` pulsing with glow 4–12px cycling at 2Hz. When core exposed: inner white `#ffffff` flash and orange aura. Boss enters with a dramatic horizontal screen sweep + screen shake.

**Bullets — Player laser:** Elongated capsule `#88eeff` with 4px glow, 2px inner white core.
**Bullets — Missile:** Orange `#ffaa00` with flame trail 4 particles.
**Bullets — Enemy:** Red `#ff4444` or yellow `#ffee00` round dots with glow.

**Power Capsule:** Orange sphere `#ff9900` with slow rotation animation (internal cross-lines spin), strong 8px glow, gentle bob up-down 4px. On collect: burst of 8 star particles.

### Particle & Effect System

- **Explosion (small):** 12 triangular shards + 8 spark dots, colors from enemy palette, life 0.5s, fade + decelerate
- **Explosion (large/boss):** 3-wave detonation: wave 1 (frame 0) 16 shards, wave 2 (0.15s) 8 secondary sparks, wave 3 (0.3s) screen flash `rgba(255,180,50,0.4)` decaying over 0.5s
- **Engine exhaust:** 3 particles per frame, orange-yellow gradient, life 0.2s
- **Laser impact:** 4 spark dots at hit point, `#88eeff`, life 0.1s
- **Power-up collect:** 8 star particles + ring ripple `#ff9900`
- **Shield hit (heavy enemy):** 6 arc sparks along shield perimeter
- **Terrain scrape:** Dust particles `#557799`, 4 per frame on wall contact
- **Boss core damage:** Red spark burst 12 particles + camera shake 3px for 0.3s

### UI Polish

- Power bar: Dark track `#0a0820`, 6 distinct capsule slots in the Gradius style: outlined squares, unlit `#223344`, lit with enemy-color spectrum — capsule 1 `#88eeff` (speed), 2 `#ffaa00` (missile), 3 `#ff4444` (laser), etc. Each slot glows when active.
- Lives indicator: Ship silhouette icons `#88eeff` with glow
- Score: Large neon numerals `#88eeff`, top-center, combo multiplier in gold `#ffaa00`
- Stage banner: Full-width text swipe at stage start — `#88eeff` text, dark glass panel, sweeps from left
- Boss health bar: Wide horizontal bar top-center, fill `#ff3300` → `#ff8800` gradient, depletes left-to-right

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Square wave, fast decay | 800Hz → 400Hz, gain 0.3 | 0.1s | Classic zap |
| Laser beam | Sawtooth + highpass | 1200Hz, cutoff 2000Hz, gain 0.25 | 0.08s | Sharp beam |
| Missile fire | Sawtooth, lowpass sweep | 300Hz → 600Hz, cutoff 800→4000Hz | 0.3s | Whoosh |
| Enemy bullet | Triangle, short | 500Hz → 200Hz, gain 0.2 | 0.12s | Soft enemy shot |
| Small explosion | White noise + bandpass | center 300Hz, Q 1, gain 0.7 | 0.4s | Punchy pop |
| Large explosion | White noise + lowpass | cutoff 400Hz, gain 1.0 | 0.8s | Deep boom |
| Enemy spawn | Ascending blip | 200Hz → 600Hz triangle, gain 0.2 | 0.2s | Incoming signal |
| Power-up collect | Major arpeggio | C5-E5-G5, sine, gain 0.5 | 0.3s | Rewarding chime |
| Power bar select | Blip | 800Hz triangle, gain 0.3 | 0.05s | UI click |
| Boss enter | Low rumble | 60Hz triangle + 80Hz sine, gain 0.6 | 2.0s | Dramatic drone |
| Boss hit (core) | Distorted square | 200Hz, waveshaper distortion, gain 0.5 | 0.2s | Impact crunch |
| Boss death | Multi-layer explosion | Three noise bursts at 0s/0.3s/0.7s + sine 100→20Hz | 2.5s | Epic detonation |
| Player hit | Low thud | 100Hz sine, gain 0.8, fast attack | 0.3s | Hull impact |
| Player death | Descending noise | White noise gain 0.6, cutoff 1000→100Hz | 1.0s | Defeat sting |
| Speed boost | Rising whine | 200Hz → 800Hz sine, gain 0.25 | 0.4s | Acceleration |
| Stage clear | Ascending fanfare | G4-B4-D5-G5 arpeggio, sine | 0.8s | Victory |

### Music/Ambience

Driving, pulsing space synth track generated procedurally:
- Bass: square wave at 55Hz (A1), gain 0.2, rhythmic on-off pattern at 120BPM (on for 1/8 note, off for 1/8)
- Lead: sawtooth at 220Hz (A3) with vibrato LFO (5Hz, ±8Hz), melodic loop over 8-bar sequence
- Pad: triangle wave chord cluster (110Hz, 138Hz, 165Hz — A2, C#3, E3), gain 0.12, slow attack 2s
- Hi-hat: white noise burst, bandpass 8000Hz, gain 0.15, every 1/8 note
- Tempo increases by 2BPM per stage for escalating tension
- Boss fight: drop pad, raise bass gain to 0.35, add distortion (waveshaper) on bass

## Implementation Priority

- High: Three-layer parallax star field, terrain inner glow gradient, player ship engine exhaust particles, explosion shard system, all player/enemy weapon sounds
- Medium: Enemy-specific auras and trails, power capsule bob + collect burst, boss multi-wave explosion, power bar capsule glow, ambient music loop
- Low: Terrain circuit-board texture, nebula gradient, boss rivet details, per-stage tempo increase, stage-clear fanfare
