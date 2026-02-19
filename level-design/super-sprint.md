# Super Sprint — Level Design Notes

## Game Type
Top-down racing game (1 player vs 2 AI cars, 3 sequential tracks).

## Core Mechanics
- **Goal**: Finish all laps on each of 3 tracks in the top position (or at least not last) to progress. Win the overall tournament by scoring best across all tracks.
- **Movement**: Car with arcade physics — throttle, brake, turn. Off-track speed penalty: `speed *= 0.92` per frame.
- **Powerups**: Wrenches add `+0.4` to `maxSpeed` (up to 3 wrenches = `maxSpeed = 4.2`). Oil slicks cause `spinTimer = 30` frames of uncontrolled spinning.
- **Track progression**: Track 1 (Oval, 3 laps) → Track 2 (Figure-8, 2 laps) → Track 3 (Grand Prix, 2 laps). AI difficulty increases with each track.
- **Key interactions**: Hit wrenches for speed boost. Avoid oil slicks. Navigate tight corners. Stay on the track surface to avoid friction penalty.

## Controls
- **W / Arrow Up**: Accelerate (increases speed toward `maxSpeed = 3.0`, `acceleration = 0.08`)
- **S / Arrow Down**: Brake (`braking = 0.05` deceleration per frame)
- **A / Arrow Left**: Turn left
- **D / Arrow Right**: Turn right
- **No separate power-up activation**: Wrenches auto-apply on contact

## Difficulty Progression

### Structure
Three tracks played sequentially. Each track has fixed AI skill values that increase track-by-track. No difficulty ramp within a track (AI skill is constant per race). Laps: Track 1 = 3 laps, Tracks 2–3 = 2 laps each.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `maxSpeed` | 3.0 | Player base top speed |
| `acceleration` | 0.08 | Speed gain per frame |
| `braking` | 0.05 | Speed loss when braking |
| `friction` | 0.02 | Passive speed decay per frame |
| `turnSpeed` | 0.04 | Radians per frame turn rate |
| Off-track penalty | `speed *= 0.92` | ~8% speed loss per frame off-road |
| Oil `spinTimer` | 30 frames (0.5s) | Duration of spin-out |
| Wrench `speedBoosts` | up to 3, +0.4 each | Max `maxSpeed = 4.2` |
| AI car1 skill | `0.6 + currentTrack * 0.1` | Track 1: 0.6, Track 2: 0.7, Track 3: 0.8 |
| AI car2 skill | `0.5 + currentTrack * 0.1` | Track 1: 0.5, Track 2: 0.6, Track 3: 0.7 |
| Track 1 laps | 3 | Oval — introductory |
| Track 2 laps | 2 | Figure-8 — crossing paths |
| Track 3 laps | 2 | Grand Prix — complex layout |

### Difficulty Curve Assessment
- **AI skill progression is minimal**: AI car1 goes from 0.6 to 0.8 across three tracks — a 33% improvement. This is a small delta for a final-track challenge. Players who beat Track 1 easily will find Track 3 only slightly harder.
- **Track 1 with AI skill 0.6 is already competitive**: Skill 0.6 means the AI follows the racing line well. New players learning the controls on Track 1 while racing two skilled AI cars is a steep introduction for a racing game.
- **Wrench system is powerful but unpredictable**: Three wrenches increasing maxSpeed to 4.2 (40% faster than base) is a large buff. If the player collects all 3 early, the race becomes trivial. If AI cars collect them, the difficulty spikes unexpectedly. Wrench spawn location is fixed per track.
- **Oil slick duration of 30 frames (0.5s) feels too short to be meaningful**: At 60fps, 0.5 seconds of spinning is barely noticeable. The spin-out is more of a speed-loss event than a genuine hazard requiring recovery skill.
- **3 laps on Track 1 vs 2 laps on Tracks 2–3 is backwards**: The introductory track is the longest (3 laps), which means a slow first race. More complex tracks are shorter, giving the player less time to learn their layouts.

## Suggested Improvements

1. **Reduce AI car2 skill on Track 1 to 0.3** — change from `0.5 + currentTrack * 0.1` to `0.3 + currentTrack * 0.15` (Track 1: 0.3, Track 2: 0.45, Track 3: 0.6). Having one easy AI and one medium AI on the first track gives new players a win to build confidence. By Track 3, both AIs are still competitive (0.7 and 0.6).

2. **Increase Track 3 AI skill ceiling to 0.9** — change car1 formula from `0.6 + currentTrack * 0.1` to `0.5 + currentTrack * 0.15` (Track 1: 0.65, Track 2: 0.80, Track 3: 0.95). This creates a steeper curve that rewards skill improvement across tracks rather than a nearly flat challenge.

3. **Flip lap counts: Track 1 = 2 laps, Tracks 2–3 = 3 laps** — beginners get a shorter first race to learn the Oval's layout, while the more complex Figure-8 and Grand Prix have 3 laps to allow deeper engagement with their layouts. This also makes Track 3 feel more epic.

4. **Extend oil slick `spinTimer` from 30 to 60 frames (1 second)** — 0.5 seconds is insufficient to feel impactful. 1 second of spinning is a genuine hazard that requires active recovery (releasing throttle, steering into the spin). This makes oil avoidance a real skill rather than a cosmetic hiccup.

5. **Add a speed gauge and mini-map HUD** — display current speed and a small track overview with player/AI positions. Top-down racers without a map feel disorienting on complex layouts (Figure-8, Grand Prix). A mini-map allows strategic decisions like "the AI is right behind me" rather than "I have no idea where anyone is."

6. **Cap wrench collection at 2 per race** — limit `speedBoosts` to a maximum of 2 (max `maxSpeed = 3.8` instead of 4.2). Three wrenches at +0.4 each creates a 40% speed advantage that makes the race trivially easy when collected. Two wrenches gives a 27% advantage — still rewarding without breaking balance.
