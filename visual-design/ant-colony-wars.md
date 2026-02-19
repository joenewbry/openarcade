# Ant Colony Wars — Visual & Sound Design

## Current Aesthetic
The game renders a layered background of sky `#1a2a3e` and dirt `#3a2815`/`#1a1208` with grass blades and rocks at the surface. Player tunnels are `rgba(100,70,40,0.7)` and AI tunnels `rgba(90,50,50,0.7)`. Individual ants are drawn as two-circle bodies (head + thorax) with tiny leg lines. The queen has a crown shape and HP bar. Food nodes are green circles.

## Aesthetic Assessment
The underground layered soil aesthetic has real potential — it's a genuinely novel visual space for a strategy game. The grass and rock details at the surface show good attention to world-building. But the ants themselves are nearly invisible at small sizes, the tunnel system is hard to read (color difference between player/AI tunnels is too subtle), and the soil layers look painted-on rather than geological. The food sources need more visual appeal. This could be a genuinely beautiful and eerie underground world — it just needs more craft.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Three distinct geological zones, each with texture:

**Sky zone** (top 15% of canvas): Gradient from `#1a3a5e` (horizon) to `#0a1a2e` (upper sky). Grass surface is a jagged edge polygon in `#2a6a1a` with a bright `#44aa22` upper highlight. Individual grass blades as thin triangles (6–10px tall) with slight random lean.

**Topsoil zone** (next 20%): Rich dark brown `#2a1a08` with embedded lighter flecks (`#4a3018`, 2px circles, scattered) and root strands (thin irregular lines in `#3a2810`, 1px, 20–40px long) threading through.

**Deep soil zone** (remaining 65%): Darker `#1a0e04` base. Occasional rock veins — thick irregular lines in `#3a3530` suggesting mineral deposits. Rock formations: irregular polygons in `#4a4040` with a lighter highlight edge on the upper surface. Scattered bioluminescent dots (`rgba(100,255,100,0.15)`) near food sources, giving an eerie underground glow.

**Tunnels**: Player tunnels — bright amber `rgba(200,140,60,0.8)` outline (2px stroke) with an inner lighter fill `rgba(180,120,40,0.3)`. AI tunnels — bright crimson `rgba(200,60,60,0.8)` outline with inner `rgba(160,40,40,0.3)`. Tunnels should clearly contrast against soil.

### Color Palette
- Sky: `#1a3a5e` to `#0a1a2e`
- Topsoil: `#2a1a08`, fleck `#4a3018`
- Deep soil: `#1a0e04`, rock `#3a3530`
- Grass: `#2a6a1a`, bright edge `#44aa22`
- Player tunnels: `rgba(200,140,60,0.8)` outline
- AI tunnels: `rgba(200,60,60,0.8)` outline
- Player ants: `#ffcc44` (golden amber)
- AI ants: `#ff4422` (red-orange)
- Queen (player): `#ffdd88` with gold crown `#ffcc00`
- Queen (AI): `#ff6644` with dark crown `#cc2200`
- Food: `#44ff66` with `#22cc44` center
- Bioluminescent: `rgba(100,255,100,0.15)`

### Entity Redesigns
**Worker ants**: At normal scale, draw a 3-segment body — oval abdomen, smaller oval thorax, small circle head. Head faces the movement direction. Six legs as thin lines (1px) extending from thorax, 3 per side, angled appropriately. Antennae: two thin lines from head, curving outward (3–4px each). Player ants in golden `#ffcc44`, AI ants in red `#ff4422`. At very small world scales (zoomed out), fall back to simple 3px circles to maintain readability.

**Soldier ants**: Larger body (1.5× worker scale), enlarged head with visible mandibles — two small triangular projections from the front of the head. More saturated color: player soldiers `#ffaa00`, AI soldiers `#dd2200`.

**Queen**: Large oval body (3× worker) with an ornate crown polygon above the head — 5-point crown in `#ffcc00`. Visible egg-laying visual: tiny white oval appears at abdomen every N frames and drifts into the tunnel. HP bar as a segmented arc around the queen.

**Food nodes**: Layered circles — outer ring `#22aa44` (2px stroke), middle fill `#44ff66`, small bright center `#aaffaa`. A subtle pulse (radius ±2px at 0.4Hz) makes them look alive. Small ants nearby orient toward food nodes.

**Eggs**: Tiny white ovals (4×6px) clustered near queen, with a faint `rgba(255,255,220,0.3)` glow.

### Particle & Effect System
**Ant death**: 4 small particles in ant color burst outward (2px squares), fade over 15 frames. The ant body briefly flashes white (2 frames) before disappearing.

**Digging**: When ants dig new tunnel sections, emit 3–4 small soil-colored particles (`#4a3018`) drifting downward and fading over 20 frames per tunnel segment created.

**Combat**: When two ants fight, a small cluster of 6 white spark particles appears at the contact point, fading over 10 frames. A tiny dust cloud (4 grey circles, expanding and fading over 15 frames) follows.

**Food collected**: When an ant picks up food, the food node shrinks with a brief scale-down animation, and a small green sparkle burst (6 particles) emits from the pickup point.

**Queen spawn egg**: Each egg spawn emits a very soft `rgba(255,255,200,0.4)` flash at the queen's abdomen.

**Tunnel construction**: A brief animated line (drawing from start to end over 8 frames) traces the new tunnel segment as it's dug, in a brighter version of the tunnel color.

### UI Polish
Resource count (food) in top-left as a green circle icon + number. Army strength as a small bar in faction color. Queen HP as an arc progress bar near the queen on-screen. Minimap in bottom-right showing tunnel network as colored lines (amber for player, red for AI) on dark background. Turn indicator or real-time indicator at top-center. Alert flash when queen is under attack: the queen's region on the minimap pulses red. Wave/round counter if applicable.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Ant movement (colony) | Noise + bandpass 800Hz | Faint continuous scurry | 50ms/loop | Very low gain, suggests mass movement |
| Digging | Noise + lowpass 200Hz | Brief scraping | 80ms | Earth-moving sound |
| Combat (ant fight) | Noise burst + bandpass 1kHz | Short clash | 60ms | Tiny clicking battle sound |
| Food collected | Sine ping | 660Hz brief | 40ms | Light collection chime |
| Queen hurt | Oscillator (sine) + noise | 220Hz drone + harsh noise | 300ms | Alarming deep damage sound |
| Queen death | Noise + lowpass 100Hz | Long decay 1200ms | 1200ms | Catastrophic defeat sound |
| Tunnel complete | Oscillator (triangle) | 440→330Hz | 100ms | Hollow tunneling sound |
| New egg laid | Sine ping | 880Hz very soft | 40ms | Subtle birth sound |
| Soldier spawn | Oscillator (square) | 220Hz brief | 80ms | Deeper spawn sound |
| Victory | Sine fanfare | 330→440→550→660Hz, 80ms ea | 350ms | Colony triumph |
| Defeat | Sine descend | 440→330→220→110Hz, 200ms ea | 800ms | Colony collapse |
| Alert (queen attacked) | Oscillator (square) | 880Hz rapid pulse | 400ms | Alarm signal |

### Music/Ambience
Deep underground ambience: a sub-bass drone at 30Hz (barely audible — more felt than heard) representing the weight of earth above. Layer bandpass-filtered noise (200–600Hz, gain 0.03) suggesting the constant activity of thousands of ants moving through soil. Occasional random low-frequency rumbles (noise burst through lowpass 80Hz, gain 0.15, every 8–15 seconds) suggest geological activity or distant surface sounds. A slow LFO (0.1Hz) gently modulates the noise layer's gain, giving a breathing quality. The total ambience is intentionally quiet and eerie — the sound of the underground.

## Implementation Priority
- High: Geological zone rendering (topsoil texture, rock formations, bioluminescent dots), tunnel color redesign (amber vs crimson outlines), ant multi-segment body
- Medium: Food node pulse animation, combat particle sparks, digging dirt particles
- Low: Root strand details, egg spawn visual, bioluminescent proximity glow
