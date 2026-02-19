# Flappy Bird

## Game Type
Endless side-scrolling reflex game

## Core Mechanics
- **Goal**: Fly through as many pipe gaps as possible without hitting a pipe or the ground
- **Movement**: The bird falls continuously under gravity; each input applies an upward velocity impulse
- **Key interactions**: Single-button flap (Space or Up arrow) to gain height; timing is everything

## Controls
- `Space` / `ArrowUp`: Flap (sets `bird.vy = FLAP_FORCE = -7.5`)

## Difficulty Progression

### Structure
There are no discrete levels. Difficulty increases continuously based on the player's score (pipes passed). The gap between pipe pairs narrows as the score rises. Pipe speed and spawn spacing are constant throughout.

### Key Difficulty Variables
- `GRAVITY`: fixed at `0.45` per frame
- `FLAP_FORCE`: fixed at `-7.5` (upward impulse)
- `PIPE_SPEED`: fixed at `3` pixels/frame (no scaling)
- `PIPE_SPACING`: fixed at `200` pixels between pipe pairs (no scaling)
- `PIPE_WIDTH`: fixed at `60` pixels
- Gap size: `Math.max(GAP_MIN, GAP_START - score * 5)` — starts at `GAP_START = 240px`, shrinks by `5px` per point scored, floors at `GAP_MIN = 130px`
- Gap reaches minimum (130px) at score = `(240 - 130) / 5 = 22` points

### Difficulty Curve Assessment
The gap shrinkage of 5px per point is very steep — the gap closes from 240px to 130px over just 22 pipes, which a skilled player can reach in under 30 seconds. For new players, however, the starting gap of 240px combined with `GRAVITY = 0.45` and `FLAP_FORCE = -7.5` makes the first few seconds feel bouncy and hard to control. The gap between "learning the rhythm" and "the gap is now 130px" is extremely short. Once at minimum gap, the game becomes pure reflex with very little margin.

## Level/Zone Definitions

Difficulty advances through score-based zones rather than discrete levels.

### Zone 1: Grace Period (pipes 1–5, score 0–4)
- Gap: **180px**
- Pipe spawn spacing: 240px (wider — extra breathing room)
- Pipe color: bright green (`#3a9a3a` body, `#4aba4a` cap)
- Purpose: Let new players learn the flap rhythm before obstacles get tight

### Zone 2: Early Game (score 5–9)
- Gap: **160px**
- Pipe spacing: 200px (standard)
- Pipe color: green (same as Zone 1)
- Notes: Gap shrinks to a comfortable challenge; players can make mistakes

### Zone 3: Mid Game (score 10–24)
- Gap: **140px**
- Pipe color: golden/brown (`#7a5a2a` body, `#ba8a4a` cap) — visual cue for zone change
- Notes: Requires more precise flap timing; 2 rows of maneuvering room

### Zone 4: Late Game (score 25+)
- Gap: **120px**
- Pipe color: purple/blue (`#2a2a7a` body, `#4a4aba` cap) — "danger zone" visual cue
- Notes: Pure reflex; one mistimed flap is fatal

### Sky Progression
The sky gradient transitions from bright day (blue) through golden hour to dusk as score increases, reinforcing zone changes with atmosphere:
- Score 0–9: Day sky — `#87ceeb` top, `#b0e2ff` bottom
- Score 10–24: Golden hour — `#f4a460` top, `#ff7f50` bottom
- Score 25+: Dusk — `#4b0082` top, `#9370db` bottom

## Suggested Improvements
- [x] Grace period for first 5 pipes: 180px gap and 240px spacing (wider on-ramp)
- [x] Discrete gap zones replacing continuous shrink (score-based: 160→140→120px)
- [x] Raise effective GAP_MIN from 130 to 120px (less brutal than `score*5` formula reaching 130 at score 22)
- [x] Sky gradient shifts with score zones as atmospheric difficulty indicator
- [ ] Reduce gravity for the first 5 pipes (progressive gravity ramp-up)
- [ ] Consider a brief "ready" delay (60 frames) where the bird hovers before first pipe
