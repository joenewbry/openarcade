# Trivia Royale

## Game Type
Battle royale trivia — last player standing wins

## Core Mechanics
- **Goal**: Survive all 25 rounds by answering questions correctly. Each wrong answer costs a life (3 lives total); lose all 3 and you are eliminated.
- **Movement**: No movement — click one of 4 answer buttons before the 15-second timer expires.
- **Key interactions**: Answer questions quickly for a time bonus (up to +150 points on top of the base 100); survive longer than all 7 AI opponents.

## Controls
Mouse click on answer choice boxes (A/B/C/D) during the question phase.

## Difficulty Progression

### Structure
The game runs for a fixed `totalRounds = 25` or until only 1 player survives. The 60-question pool is shuffled at the start and cycled (`currentRound % questionPool.length`). There is no question difficulty scaling — hard and easy questions are distributed randomly throughout all 25 rounds.

AI opponents have fixed accuracy values assigned at init:
- NEXUS: `0.90` accuracy
- CIPHER: `0.80`
- BLAZE: `0.72`
- ECHO: `0.65`
- NOVA: `0.55`
- PHANTOM: `0.45`
- VORTEX: `0.40`

All 7 AIs are alive and playing from round 1. Scoring per correct answer: `100 + timeBonus` where `timeBonus = Math.max(0, Math.floor((timerMax - answerTime) * 10))` — a perfect-speed answer adds up to 150 bonus points. Surviving to the end with no eliminations adds `500` points.

### Key Difficulty Variables
- `totalRounds`: `25` (fixed)
- `timerMax`: `15` seconds per question (fixed, never changes across rounds)
- Player lives: `3` (fixed, no way to regain lives)
- AI accuracies: `[0.90, 0.80, 0.72, 0.65, 0.55, 0.45, 0.40]` (fixed, no escalation)
- Reveal delay: `2200 ms` (3000 ms if any eliminations)

### Difficulty Curve Assessment
The fixed `timerMax` of 15 seconds and unchanging question pool mean difficulty is entirely dependent on question content and player knowledge — there is no mechanical difficulty ramp. NEXUS at 90% accuracy is extremely hard to beat on points alone (it will score ~125 points per question on average). However, since the goal is survival not leaderboard rank, casual players are not meaningfully pressured until NEXUS eliminates itself or scores high enough to make the player feel behind. The game starts immediately difficult for trivia novices because all question categories (including Math and Technology edge cases) appear from round 1.

## Suggested Improvements
- [ ] Introduce a warm-up block of 5 rounds that only draws from easier categories (Science, Geography, Pop Culture) before opening the full question pool to give players early confidence.
- [ ] Reduce NEXUS accuracy from `0.90` to `0.80` and shift all AI accuracies down by `0.05` to make early rounds less punishing when the player inevitably gets an unlucky wrong answer.
- [ ] Increase `timerMax` from `15` to `20` seconds for the first 8 rounds, then reduce to `15` for rounds 9–17 and `12` for rounds 18–25, creating a genuine time pressure ramp.
- [ ] Allow the player to regain 1 life at the halfway point (after round 12) if they have 0 lives remaining by substituting elimination with a 1-life "resurrection" — this prevents a single bad question in round 2 from ending the run immediately.
- [ ] Add a difficulty toggle (Easy / Normal / Hard) that adjusts AI accuracy values: Easy shifts all AIs down by `0.15`; Hard shifts them up by `0.10`.
