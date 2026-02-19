# Peggle — Visual & Sound Design

## Current Aesthetic

Dark space background with faint blue grid lines. Pegs are colored circles (orange, blue, green) with glow and a small inner highlight. The launcher at the top is a solid blue circle with a barrel line and dashed aim guide. The ball is white with glow and a simple trail. The bucket at the bottom is an outlined trapezoid. Fever particles are multi-colored circles scattered on level clear. Hit pegs glow brightly then persist until the ball exits.

## Aesthetic Assessment
**Score: 3/5**

The core visual loop is satisfying — pegs glowing on hit and the anticipation during ball flight reads well. But the background is empty, the launcher lacks character, the bucket feels generic, and the fever celebration is underwhelming. The overall atmosphere is cold and sterile. Peggle's charm comes from a joyful, colorful, almost carnival quality that's completely absent here.

## Visual Redesign Plan

### Background & Environment

The background should tell a story unique per level. Build it from layered elements: a deep cosmos background with nebula color washes (large soft gradients in purple and blue), distant small star clusters, and a subtle scan-line texture at 3% opacity for a retro premium feel. Add decorative side panels — ornate gothic/baroque style column silhouettes framing the play area, rendered as very dark shapes with gold edge highlights. A spotlight effect from the launcher position should cast a soft cone of light down into the play field.

### Color Palette
- Primary (orange peg): `#ff7800`
- Secondary (blue peg): `#3388ff`
- Green peg: `#00dd44`
- Background: `#05030f`, `#0e0820`
- Nebula wash: `#2a0a5a`, `#0a1a4a`
- Launcher: `#ffcc44`
- Bucket: `#44aaff`
- Ball: `#ffffff`
- Glow/bloom: `#ff7800`, `#3388ff`

### Entity Redesigns

**Pegs:** Give each peg a 3D sphere illusion — a lighter highlight at upper-left (specular circle at ~40% of peg radius), a darker shadow at lower-right. Hit pegs should not just glow but visibly crack apart — add hairline crack lines radiating from center when hit. The glow intensifies over the glowTimer duration. Orange pegs should have a subtle flame-like flicker when hit. Green pegs (extra ball) should pulse with a small orbiting spark.

**Launcher:** Transform the simple circle-and-barrel into a proper Peggle-style unicorn cannon or ornate ball launcher. At minimum: the barrel becomes an elaborate mechanical tube with two side struts, and the base has gear-wheel details. Golden color scheme with green gem in the barrel. Aiming guide becomes multiple short dashed segments with a small ball ghost at the end.

**Ball:** Increase radius slightly. Add a longer motion trail — 4 ghost positions fading from 60% to 0% opacity. The ball itself should have a bright specular highlight and subtle rainbow sheen when traveling fast (color shifts based on velocity direction).

**Bucket:** The catch bucket becomes a wooden barrel with metal band stripes. When the ball lands in it, it briefly glows yellow-gold and a coin-collect animation plays.

**Level clear / Fever:** The EXTREME FEVER celebration deserves a full multi-second event: screen flashes white, then rainbows of confetti particles stream from both sides, a large flaming "EXTREME FEVER!" text scales in from small to large and pulses. Stars orbit the text. Individual pegs blink out one by one in sequence.

### Particle & Effect System

- **Peg hit:** Spiral of 6 particles in peg color, tiny star shape, 30-frame life
- **Ball hitting wall:** Small wall-impact spark (3 particles, bright white, 8-frame life)
- **Bucket catch:** Cascade of gold coin particles falling upward from bucket (gravity inverted briefly)
- **Orange peg hit (fever moment):** Large flame burst — 10 particles in orange/yellow, lingering trail
- **Green peg hit:** Orbiting sparkle trail + floating "EXTRA BALL" text
- **Multi-hit bonus:** Radiating ring wave emanating from last peg hit, golden color
- **Level complete:** Full confetti storm — 80 particles from top, random colors, gravity-affected

### UI Polish

The HUD strip at the top should look like a theater marquee — dark background with gold decorative borders, ball count shown as glowing orbs, orange peg counter with a flame icon. Score displayed in large ornate numerals. Between shots, brief hint text appears in the aiming area about trajectory.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Peg hit (blue) | Xylophone strike | Sine wave, 523Hz (C5), fast attack slow decay | 200ms | Light, wooden quality |
| Peg hit (orange) | Brighter strike | Sine 659Hz (E5) | 200ms | Slightly warmer, more prominent |
| Peg hit (green) | Bell tone | FM synth, 880Hz carrier, 440Hz mod | 400ms | Resonant, special feel |
| Multi-hit | Rising arpeggio | Each peg hit raises pitch by semitone | per hit | Thrilling escalation |
| Ball launch | Whoosh | Filtered noise + pitch rise 200→600Hz | 300ms | Quick and energetic |
| Wall bounce | Soft thud | 200Hz sine, very fast decay | 50ms | Subtle, not intrusive |
| Bucket catch | Coin collect | Rising sine 600→900Hz | 200ms | Joyful reward tone |
| Fever | Triumphant fanfare | C major chord: C+E+G+C sine waves | 2s | Swelling and celebratory |
| Shot end (no bucket) | Soft thud | 150Hz sine, slow decay | 300ms | Gentle "missed" sound |
| Ball in air | Subtle whistle | Very quiet sine 800Hz tied to ball vy | Looping | Creates tension |

### Music/Ambience

A lively circus/carnival background track built purely from synthesized instruments: pizzicato-style plucked sine waves for melody, a simple oom-pah bass pattern, and a light triangle-wave counter-melody. 30 BPM per bar feel at ~130 BPM. Volume ducks during fever celebration to let the fanfare shine.

## Implementation Priority
- High: Peg 3D sphere highlight+shadow, multi-hit pitch arpeggio, fever confetti storm, ball motion trail
- Medium: Launcher ornate redesign, bucket barrel style, barrel-catch coin particles, orange peg flame flicker
- Low: Background nebula and column silhouettes, spotlight cone, carnival background music, crack effect on pegs
