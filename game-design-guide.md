# OpenArcade Game Design Guide

This document is the master checklist used by the Game Builder AI to guide conversations toward a complete game specification. Claude works through these sections naturally in conversation, marking each as complete when enough information has been gathered to generate quality code.

---

## Section 1: Core Concept

**Goal**: Establish the fundamental identity of the game.

Checklist:
- [ ] Game name (or working title)
- [ ] Genre (arcade shooter, platformer, puzzle, card game, strategy, etc.)
- [ ] Theme / setting (space, fantasy, modern, retro, abstract, etc.)
- [ ] One-sentence pitch: what makes this game fun/unique?
- [ ] Inspirations or "like X but with Y" references

**Prompts if missing**:
- "What do you want to call it, or shall we name it once we know more?"
- "What genre are you going for — action, puzzle, strategy, something else?"
- "Is there a game this reminds you of?"

---

## Section 2: Core Mechanics

**Goal**: Define exactly how the game is played.

Checklist:
- [ ] Player controls (keyboard, mouse, touch, gamepad)
- [ ] Core loop (what does the player do over and over?)
- [ ] Primary objective / win condition
- [ ] Fail state / game over condition
- [ ] Scoring system (points, time, levels?)
- [ ] Key rules (gravity? collision? resource management?)

**Prompts if missing**:
- "How does the player control their character or interact with the world?"
- "What's the main thing a player does on their turn / in a loop?"
- "How do you win? How do you lose?"
- "Is there a score or just survival?"

---

## Section 3: Tech Requirements

**Goal**: Determine rendering complexity, physics needs, multiplayer model, and AI behavior so the library ontology can auto-select the stack.

Checklist:
- [ ] Rendering: 2D simple, 2D physics-heavy, 3D, or HTML/DOM?
- [ ] Physics: none, basic (gravity/bounce), complex (joints/soft body)?
- [ ] Multiplayer type: none, local same-keyboard, local split-screen, online P2P, online server-authoritative?
- [ ] AI / NPC: none, simple (rule-based), medium (state machine), complex (pathfinding/trees)?
- [ ] Turn structure: real-time, turn-based, or pause-and-select?
- [ ] Audio: none, SFX only, SFX + music?

**Auto-resolved from answers to Sections 1–2. Confirm if borderline.**

---

## Section 4: Tech Stack Selection

**Goal**: Output the selected library stack in game.md. Transparent to user; shown as a summary.

Resolution table:

| Scenario | Rendering | Physics | Multiplayer | Audio |
|----------|-----------|---------|-------------|-------|
| 2D arcade/puzzle, no physics | Canvas 2D | none | — | Web Audio API |
| 2D platformer | Canvas 2D | Matter.js 0.19 | — | Howler.js 2.2 |
| 2D physics sandbox | Canvas 2D | Planck.js 0.3 | — | Web Audio API |
| Card/board/DOM game | HTML/CSS | none | — | Web Audio API |
| 3D / FPS | Three.js r134 | built-in | — | Howler.js 2.2 |
| Turn-based strategy | Canvas 2D | none | Socket.io 4.6 | Web Audio API |
| Online real-time | Canvas 2D | varies | Colyseus 0.15 | Web Audio API |
| Local P2P co-op | Canvas 2D | none | PeerJS 1.4 | Web Audio API |

CDN allowlist (vetted, with SRI hashes available):
- Three.js r134 — jsDelivr
- Matter.js 0.19.0 — jsDelivr
- Planck.js 0.3.x — jsDelivr
- Socket.io-client 4.6.x — CDN.socket.io official
- Colyseus.js 0.15.x — jsDelivr
- PeerJS 1.4.x — jsDelivr
- Howler.js 2.2.x — jsDelivr
- Tone.js 14.x — jsDelivr (only for music/synthesis games)

Every loaded CDN lib must include a 2-second timeout fallback that shows an error message rather than silently breaking.

---

## Section 5: Visual Design

**Goal**: Capture enough to generate good-looking code and a useful Grok concept art prompt.

Checklist:
- [ ] Art style: pixel art, vector/geometric, hand-drawn, neon/glow, realistic, abstract?
- [ ] Color palette: primary background color, accent/highlight colors, entity colors
- [ ] Key visual entities: what does the player look like? enemies? environment?
- [ ] Camera / perspective: top-down, side-scrolling, isometric, first-person?
- [ ] Special visual effects: particles, trails, screen shake, scanlines?

**Prompts if missing**:
- "What's the visual vibe — neon arcade, cute pixel art, clean geometric?"
- "Any specific colors you love or hate for this?"
- "Describe what the player character looks like."

---

## Section 6: World / Level Design

**Goal**: Understand the spatial structure of the game.

Checklist:
- [ ] Single screen or scrolling world?
- [ ] Number of levels / stages (or infinite/procedural?)
- [ ] Level progression / difficulty curve
- [ ] Special areas: shops, safe zones, boss rooms?
- [ ] Procedural vs hand-crafted levels?

**Prompts if missing**:
- "Does the world scroll, or is each level a single screen?"
- "How many levels do you envision, or is it endless?"
- "Does difficulty ramp up gradually or in discrete jumps?"

---

## Section 7: Audio Design

**Goal**: Specify SFX and music needs precisely enough to generate Web Audio API code.

Checklist:
- [ ] Sound effect categories (jump, shoot, hit, collect, death, level-up, UI click)
- [ ] Background music style: none, procedural chiptune, ambient, pulsing beat?
- [ ] Audio library: Web Audio API (native, default) or Howler.js (if using asset files)

**Default**: Web Audio API with procedurally generated tones (no external files).

---

## Section 8: Multiplayer Dynamics

**Goal**: Detail the multiplayer model if any.

Checklist (only if multiplayer selected):
- [ ] Player count (2, 4, up to N?)
- [ ] Same device (split keyboard) or networked?
- [ ] Competitive, cooperative, or both?
- [ ] Room/lobby needed?
- [ ] Spectator mode?
- [ ] Server-authoritative or client-side prediction?

Skip this section if single-player.

---

## Section 9: AI / NPC Behavior

**Goal**: Define enemy/NPC intelligence if present.

Checklist (only if AI needed):
- [ ] AI entity types (enemies, allies, neutral NPCs?)
- [ ] Behavior model: patrol, chase, flee, attack patterns
- [ ] Difficulty levels (easy/medium/hard or scaling?)
- [ ] Pathfinding complexity: line-of-sight, grid, or full A*?

Skip this section if no AI entities.

---

## Section 10: Concept Art Prompt

**Goal**: Synthesize a Grok image generation prompt from sections 1–9.

Output format:
```
[Art style] game scene: [setting description]. [Key entities described].
Color palette: [colors]. [Mood/atmosphere]. [Camera angle].
Game UI elements: [HUD description if any]. Detailed, game-ready illustration.
```

Generate 3 variations with different emphasis:
1. Wide establishing shot (world/environment focus)
2. Action shot (player + primary enemy/challenge)
3. Close-up UI/character detail sheet

---

## Completion Criteria

A game spec is ready for code generation when ALL of the following are true:
- [x] Sections 1–3 are complete
- [x] Section 5 (Visual Design) is at least partially defined
- [x] Section 6 (Level Design) has basic structure
- [x] Concept Art Prompt (Section 10) has been generated

Sections 7–9 have sensible defaults and can be inferred. Never block generation waiting for audio details.

---

## game.md Template

When the conversation is complete, write a `game.md` in this format:

```markdown
# Game: [Name]
**Created**: [date]  **Version**: 1.0  **Status**: generating

## Core Concept
[From section 1]

## Mechanics
[From section 2]

## Tech Stack
- Rendering: [lib or "vanilla Canvas 2D"]
- Physics: [lib or "none"]
- Multiplayer: [lib or "none"]
- Audio: [lib or "Web Audio API"]

## Visual Design
- Style: [art style]
- Background: [hex color]
- Accent: [hex color]
- Key entities: [descriptions]

## Level Design
[From section 6]

## Audio Design
[From section 7]

## Generation Prompts
- concept_art_prompt: [from section 10]

## Concept Art
- [path or URL after generation]

## Chat History Reference
chat.jsonl (in same folder)

## Changelog
### v1.0 ([date]) — initial generation
```
