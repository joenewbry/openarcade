# Wrestling Physics

## Game Type
Physics sandbox / ragdoll wrestling simulation (best of 3 rounds)

## Core Mechanics
- **Goal**: Pin the opponent (hold their shoulders within 14px of the mat for 180 frames / 3 seconds) or force them out of the ring (hip x-position outside RING_L-25 to RING_R+25, i.e., outside x=30..470) to score; first to 2 wins or best of 3 rounds wins the match
- **Movement**: Indirect ragdoll control via 8 motor keys that apply forces to arm/leg joints; the body is a 13-point Verlet physics simulation with 16 bone constraints solved at 6 iterations per frame
- **Key interactions**: Arm motors pull/push toward or away from the opponent; leg motors walk or kick; the physics collision system handles grappling automatically when body parts overlap; the grab system (`applyGrab`) transfers momentum when a hand is within 10px of an opponent's body part

## Controls
- Q: Left arm up (motor aL = -1)
- W: Left arm down (motor aL = 1)
- O: Right arm up (motor aR = -1)
- P: Right arm down (motor aR = 1)
- A: Left leg back (motor lL = -1)
- S: Left leg forward (motor lL = 1)
- K: Right leg back (motor lR = -1)
- L: Right leg forward (motor lR = 1)
- Any of the above / Space / Enter: Start or continue the match

## Difficulty Progression

### Structure
There is no difficulty ramp — the game is a fixed best-of-3 match format (`maxRounds` = 3, win at `score >= 2`). The AI uses the same logic for every round with no escalation between rounds.

### Key Difficulty Variables
- `aiTimer` tick rate: AI re-evaluates phase every 6 ticks and makes random adjustments with 12% probability (`Math.random() < 0.12`) outside recover phase
- Motor strength: `s` = 3.2 applied to all motor-driven forces; same value for both player and AI
- `GRAVITY` = 0.38 per frame (applied equally)
- `FRICTION` = 0.93 per frame (applied equally)
- Pin duration needed: `pinTimer >= 180` frames (3 seconds at 60fps)
- Pin decay when not pinning: `pinTimer -= 3` per frame (decays 3× faster than it accumulates)
- Ring-out boundary: hip x outside [30, 470] on a 500px wide canvas
- AI phase thresholds: approach when `dist > 60`, attack when `dist <= 60`, flee when hip is within 50px of ring edge, recover when `shouldersDown` (both shoulders within 14px of mat)

### Difficulty Curve Assessment
The AI is always active and makes reasonably effective decisions; a completely new player unfamiliar with the control scheme (8 keys for 4 limbs) will struggle to stay upright, let alone execute a pin, while the AI immediately approaches and attacks. The control learning curve is very steep with no tutorial or practice mode. There is no handicap option or easier opponent setting.

## Suggested Improvements
- [ ] Add a 3-second "FIGHT STARTS IN 3..." grace period at round start where the AI uses `aiPhase = 'recover'` (random motor inputs only) to give the player time to learn the controls before aggression
- [ ] Reduce AI motor strength `s` from 3.2 to 2.0 in round 1, escalating to 2.6 in round 2 and 3.2 in round 3 to create a progression within the match
- [ ] Reduce pin duration requirement from 180 to 120 frames in round 1 to give new players a realistic win condition to discover
- [ ] Add a brief on-screen key guide that persists for the first 10 seconds of round 1 (QWOP-style labels showing which key moves which limb)
- [ ] Reduce the ring boundary leniency — currently the AI will flee when its hip is within 50px of the edge (`RING_L + 50` or `RING_R - 50`); for round 1, consider reducing flee threshold to 25px so the AI is easier to ring-out
