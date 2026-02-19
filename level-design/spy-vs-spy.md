# Spy vs Spy — Level Design Notes

## Game Type
Stealth/collect-and-escape game vs AI opponent, single-player (1 vs 1 against AI).

## Core Mechanics
- **Goal**: Collect all 4 documents before the AI does and reach the exit room, or have collected more documents than AI when the timer expires.
- **Movement**: Navigate a 4×3 grid of rooms (COLS=4, ROWS=3 = 12 rooms total). Move between rooms through doors.
- **Searching**: Enter a room and press Search (or auto-trigger) to find hidden documents. Player search: 600 frames, AI search: 800 frames.
- **Combat**: If both spies are in the same room, rock-paper-scissors combat triggers. Loser is stunned for 3000ms. Each combatant has a 2-second window to choose.
- **Key interactions**: Collect 4 docs → proceed to the exit room. Combat can steal time even if you have docs.

## Controls
- **Arrow keys / WASD**: Move between rooms (one room per press)
- **Space / E**: Search current room for documents
- **1 / 2 / 3**: Choose rock / paper / scissors in combat
- **Timer**: 180000ms (3 minutes) total match time displayed as countdown

## Difficulty Progression

### Structure
Single fixed session with a 3-minute timer. No levels, no escalation. The AI uses a fixed patrol strategy from the first second. Match ends at timer expiry (most docs wins) or when a spy exits with all 4 documents.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `timerMs` | 180000 (3 minutes) | Total match duration |
| Player `speed` | 2.5 | Tiles per move (instant room transitions) |
| Player search duration | 600 frames (~10s at 60fps) | Time to search one room |
| AI search duration | 800 frames (~13.3s) | AI is slower at searching |
| AI move interval | `600 + Math.random() * 400` ms | 0.6–1.0 second between AI moves |
| Combat choice timer | 2000ms | Window to pick rock/paper/scissors |
| Stun on combat loss | 3000ms | Time lost to a combat defeat |
| Documents to collect | 4 | Required for full-clear win |
| Map size | 4 cols × 3 rows | 12 rooms total |

### Difficulty Curve Assessment
- **No difficulty ramp**: The AI moves and searches at fixed rates for all 3 minutes. There is no phase where it gets faster or smarter.
- **AI has a meaningful handicap**: AI search takes 800 frames vs player's 600. This is the primary balancing lever and it works, but the fixed random move interval means AI can sometimes cluster decisions awkwardly.
- **Rock-paper-scissors is purely random**: Combat has no skill component. A new player losing 2 combats in a row (losing 6 seconds total to stuns) can easily lose the 3-minute game through no fault of play skill.
- **3 minutes can feel too long or too short**: With only 12 rooms and 4 documents, a skilled player can clear all docs in ~90 seconds, leaving 90 seconds of "waiting at the exit" feeling. A struggling player may find 3 minutes impossibly short.
- **No feedback on where documents are**: Players must search every room by trial-and-error, which feels luck-dependent. The AI may find documents faster or slower by coincidence of its patrol path.

## Suggested Improvements

1. **Shorten player search time from 600 to 360 frames** (~6 seconds at 60fps). The current 10-second search per room means visiting all 12 rooms takes 2 minutes just in search time — the entire map can barely be cleared in a 3-minute game. Reducing to 6 seconds makes the pacing feel responsive and rewards systematic exploration.

2. **Add a "room memory" hint system** — after a player searches an empty room, mark it with a small visual indicator (e.g., greyed-out door icon) so they don't re-search it. This reduces the luck element and rewards planning over random wandering.

3. **Replace rock-paper-scissors combat with a skill-based minigame** — e.g., a "button mash" or "timing" duel (press Space when the bar hits the target zone). A 2000ms combat window for RPS is already there — repurpose it as a reaction-speed contest. The loser stun of 3000ms has too large an impact on a 3-minute game to be purely random.

4. **Add document count UI for both spies** — show a "Spy 1: X/4 docs" vs "Spy 2: X/4 docs" indicator at all times. Currently the player may not know how urgently they need to move, making the 3-minute timer feel abstract.

5. **Add a short-game mode with `timerMs = 90000` (1.5 minutes)** — a faster match option that forces more decisive play. Shorter matches also reduce the impact of unlucky RPS losses (3 seconds of stun is 3.3% of 1.5 minutes vs 1.7% of 3 minutes in relative terms, but the game ends before the lucky AI snowballs).

6. **Introduce a stealth mechanic** — if the player is in a room the AI just entered, give the player a 1-second "hidden" window before combat triggers (showing a "!" warning). This rewards awareness and adds agency to what is currently an unavoidable encounter.
