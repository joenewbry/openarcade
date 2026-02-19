# Rocket League 2D

## Game Type
2D physics-based car soccer / PvP vs AI

## Core Mechanics
- **Goal**: Score 5 goals before the AI opponent, or have more goals when the 3-minute timer expires
- **Movement**: Car drives left/right on the ground, can jump and double-jump, and uses a limited boost meter to accelerate and fly; gravity pulls the car down constantly
- **Key interactions**: Hit the ball into the opponent's goal using the car body; boost gives a burst of forward thrust; aerial maneuvers require precise jump timing

## Controls
- Arrow Left / Right — drive left or right
- Arrow Up / Space — jump (press again in air for double jump; also Space for boost)
- Space — boost (consumes boost meter)
- (No separate brake control; releasing drive slows the car naturally)

## Difficulty Progression

### Structure
Single fixed match: first to `WIN_SCORE = 5` goals or winner by score after `MATCH_SECS = 180` seconds. No escalating difficulty — the AI has fixed behavior throughout the match. There are no rounds or levels. Boost starts at `40` out of a max of `100` and replenishes via boost pads on the field.

### Key Difficulty Variables
- `WIN_SCORE`: `5` goals to win
- `MATCH_SECS`: `180` seconds (3 minutes)
- `GRAVITY`: `0.4` per frame — affects all airborne objects
- `JUMP_VEL`: `-7.5` — initial jump velocity
- `DOUBLE_JUMP_VEL`: `-6` — second jump while airborne
- `BOOST_FORCE`: `0.55` per frame — acceleration added while boosting
- `MAX_SPEED`: `8` — maximum ground speed without boost
- `MAX_BOOST_SPEED`: `12` — maximum speed while boosting
- Starting boost: `40` (out of 100) — player begins with less than half boost

### Difficulty Curve Assessment
Because there is no difficulty progression within a match, the challenge is entirely about the AI tuning. The main pain point is the starting boost of only 40 — a player who does not yet understand boost management will be unable to contest early aerials, making the first 30 seconds feel punishing before they've collected any boost pads. The 3-minute clock is short enough that a 2-0 AI lead in the first minute is nearly unrecoverable.

## Suggested Improvements
- [ ] Raise starting boost from `40` to `60` so the player can attempt one aerial or aggressive play immediately, teaching the mechanic without a frustrating first-30-seconds deficit
- [ ] Add a brief countdown (3-2-1-GO) before kickoff to prevent the AI from nudging the ball before the player has reacted — currently both cars start simultaneously
- [ ] Reduce the AI reaction speed or add a small decision delay (~10 frames) in the first 60 seconds of the match so new players can get a feel for the physics before the AI is at full effectiveness
- [ ] Show the boost meter as a visible on-screen bar with a numeric value; without it, players do not know when they are out of boost versus when they are simply slow
- [ ] Add a best-of-3 or best-of-5 series mode so a single bad match does not feel definitive — the current single-match format amplifies early mistakes disproportionately
- [ ] Allow `WIN_SCORE` and `MATCH_SECS` to be configurable from a pre-match screen so experienced players can play to 7 goals or shorter matches
