# Pixel Fighter

## Game Type
1v1 fighting game (player vs adaptive AI, best of 3 rounds)

## Core Mechanics
- **Goal**: Deplete the opponent's HP to zero in each round. Win 2 of 3 rounds (60 seconds each). If time expires, the player with more HP wins the round.
- **Movement**: Arrow Left/Right to walk, Arrow Up to jump. Arrow Down to crouch. Z, X, C for attacks; S to block.
- **Key interactions**: Attacks have startup, active, and recovery frame windows. Blocking reduces incoming damage. Combos scored within a 30-frame window grant bonus damage. Special attack has a 180-frame (3-second) cooldown. The AI uses an `aiAdapt()` function between rounds that adjusts its personality weights based on what the player did in the previous round.

## Controls
- Arrow Left / Right: walk
- Arrow Up: jump
- Arrow Down: crouch
- Z: jab (punch)
- X: kick
- C: special attack
- S: block

## Difficulty Progression

### Structure
3 rounds with a fixed 60-second timer. No mid-match difficulty scaling — all move damage and AI parameters are set at game start. The AI does adapt its personality weights between rounds via `aiAdapt()`, which tracks how often the player used each move and adjusts the AI's countering tendencies accordingly. This creates a soft escalation in rounds 2 and 3 without changing raw numbers.

### Key Difficulty Variables
- `MAX_HP`: `100` per fighter
- `ROUND_TIME`: `60` seconds
- `MAX_ROUNDS`: `3`
- `COMBO_WINDOW`: `30` frames
- `SPECIAL_COOLDOWN`: `180` frames (3 seconds at 60fps)
- `GRAVITY`: `1400` px/s² (physics constant for jump arcs)
- Move frame data:
  - Jab: `6` dmg, `4` startup / `3` active / `6` recovery frames
  - Kick: `10` dmg, `7` startup / `4` active / `10` recovery frames
  - Special: `22` dmg, `14` startup / `6` active / `18` recovery frames
  - Jump Kick: `12` dmg
  - Crouch Punch: `7` dmg
  - Crouch Kick: `9` dmg
- AI base personality: `aggression = 0.5`, `reactionSpeed = 12` frames, `specialPref = 0.15`, `blockPref = 0.3`, `jumpPref = 0.15`, `adaptRate = 0.1`
- AI adapts between rounds via `aiAdapt()` tracking player move usage

### Difficulty Curve Assessment
Round 1 is well-balanced at the default AI personality settings. The `reactionSpeed = 12` frames gives the player a visible window to punish AI mistakes. The adaptation mechanic in rounds 2 and 3 is the primary difficulty escalation — if the player relies heavily on one move (e.g. kick spam), the AI will counter-weight that move in subsequent rounds, effectively closing the player's winning strategy. The special attack at 22 damage (22% of max HP per hit) is very powerful relative to its 3-second cooldown but has a 14-frame startup that skilled AI can interrupt. New players may not understand the frame data system and will eat punishes for using kick or special at close range.

## Suggested Improvements
- [ ] Reduce AI `aggression` from `0.5` to `0.35` in round 1 only, then allow `aiAdapt()` to push it higher in later rounds — this gives new players a cleaner round 1 to learn move timing
- [ ] Reduce `reactionSpeed` from `12` frames to `8` frames (make it slower, i.e. increase the value) so the AI has a longer reaction delay and punishes player mistakes less consistently
- [ ] Lower `SPECIAL_COOLDOWN` from `180` frames to `120` frames (2 seconds) so the powerful special is available more often and new players can use it as a meaningful comeback tool
- [ ] Display move damage numbers briefly on hit (e.g. "+10") so new players learn the value of each move through feedback rather than guesswork
- [ ] Add a round-start 60-frame buffer where neither fighter takes damage, giving players time to orient and recognize the round-start state before taking a hit
- [ ] Show a brief "AI adapted" indicator between rounds when `aiAdapt()` changes a parameter by more than 0.05, so players know the AI is responding to their style
