# Nidhogg-Like

## Game Type
1v1 side-scrolling fencing / fighting (player vs AI)

## Core Mechanics
- **Goal**: Push the opponent toward the right edge of a 9-screen-wide world and reach the P1 goal zone on the far right, OR kill the AI enough times to advance past the AI goal zone on the left.
- **Movement**: Horizontal run (3.2 px/frame), jump (-11 vy), blocking, and attacking. After killing the opponent, the winner automatically advances in their goal direction for ~70 frames.
- **Key interactions**: Three attack stances (high/mid/low via Z/X/C); block matching the attacker's stance to parry; throw sword (D) for a ranged kill; unarmed fist fighting when sword is lost; pick up dropped swords by walking over them.

## Controls
- **Arrow Left / Right**: Move horizontally
- **Arrow Up**: Jump
- **S** (hold): Block
- **Arrow Up / Down** (while blocking): Set block stance to high / low (default mid)
- **Z**: Attack high stance
- **X**: Attack mid stance
- **C**: Attack low stance
- **D**: Throw sword
- **Click / any key**: Start or restart

## Difficulty Progression

### Structure
This is a single-match, continuous game with no escalating levels. The AI opponent is fixed-difficulty throughout. The game ends when P1 or P2 reaches their respective goal zone. Score equals player kill count (`kills1`). There are no waves, levels, or timers.

### Key Difficulty Variables
- `runSpeed`: 3.2 px/frame for both P1 and AI (identical)
- `GRAVITY`: 0.55 px²/frame
- Jump velocity: -11 vy (identical for both)
- `SWORD_RANGE`: 48 px; `FIST_RANGE`: 22 px
- `SWORD_THROW_SPEED`: 11 px/frame
- `attackTimer`: 14 frames per attack; hit window: frames 4–8 (5-frame window)
- `stunTimer` after block-parry: 18 frames (attacker); after clash: 14 frames each
- **AI reaction to attack**: 65% chance to block with matching stance when player attacks within 90px; 30% chance to jump away instead
- **AI attack frequency**: when within 55px, 65% of AI decisions include attacking (sampled every 6–16 frames)
- **AI sword throw chance**: 12% when within 55px with sword; 15% when 55–130px away
- **AI advance speed multiplier**: 1.2x `runSpeed` when advancing after a kill
- **AI `skill` parameter**: `0.7 + Math.random() * 0.25` — randomized at match start (0.70–0.95)
- **Respawn**: loser respawns 280px ahead of the winner's position after 100 frames (1.67s)

### Difficulty Curve Assessment
The AI is quite competent and will feel difficult for most players. The 65% block rate means skilled attacks frequently get parried, and the AI immediately counter-attacks. The stance system requires the player to learn that only the right stance breaks a block, but the AI randomly selects stances when blocking — creating a 67% chance the AI's block stance matches the player's attack. There's no easy-mode or warmup; the match begins immediately at full AI difficulty. The advancing mechanic after a kill means the AI rapidly closes ground after each victory, compressing the playfield.

## Suggested Improvements
- [ ] Lower AI block success rate from 65% to 45% on new matches (could add a `difficulty` variable that starts at 0.45 and scales up based on player kill count)
- [ ] Add a short "en garde" pause of 90 frames (currently 50) at match start to give the player more time to read the AI stance and plan an opening
- [ ] Display the attack stance system controls (Z=High, X=Mid, C=Low) as a brief on-screen tutorial for the first 10 seconds of the first match — the stance mechanic is completely invisible to new players
- [ ] Reduce AI `aiTimer` minimum from 6 to 10 frames so the AI makes decisions slightly less frequently, giving the player more opportunities to act between AI responses
- [ ] Add a score-based difficulty progression: after P1 scores 3 kills, increase AI `skill` by 0.1; at 6 kills by another 0.1, up to a cap of 0.95
- [ ] Show the current stance indicator (H/M/L) above P1's head during play, not just when blocking — this helps players understand what stance they're currently in
