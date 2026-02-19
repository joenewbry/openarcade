# Speed Typing Racer

## Game Type
Typing skill game — race 3 AI opponents by typing a passage faster and more accurately than them

## Core Mechanics
- **Goal**: Finish typing a randomly selected passage before all 3 AI opponents do; score = player's WPM at finish
- **Movement**: No spatial movement — progress is measured by characters typed correctly through the passage
- **Key interactions**: Type each character of the passage in sequence; any correct keystroke advances the cursor; incorrect keystrokes must be corrected with Backspace before progress resumes; AI opponents advance continuously at their set WPM rates

## Controls
- `Keyboard (all printable characters)` — type passage characters; correct characters advance cursor position
- `Backspace` — delete last typed character to correct errors
- `Space` — start race from lobby screen; spaces in the passage are typed normally during the race

## Difficulty Progression

### Structure
Fixed single-race format. One of 12 passages is selected at random. A 3-second countdown plays before typing begins. Three AI opponents race simultaneously: Rookie at `35` WPM, Pro at `55` WPM, and Elite at `72` WPM. The race ends when any racer (player or AI) completes the passage. Player score is their WPM at the moment of finishing or when all AIs finish.

### Key Difficulty Variables
- `AI_WPMS`: `[35, 55, 72]` — three AI opponents representing beginner, intermediate, and expert typing speeds
- `AI_VARIANCE`: `0.15` — AI speed fluctuates ±15% each character, so Rookie ranges roughly 30–40 WPM and Elite ranges roughly 61–83 WPM
- `AI_ERROR_RATE`: `[0.04, 0.03, 0.02]` — Rookie makes an error on 4% of characters, Pro on 3%, Elite on 2%; errors cause brief delay before auto-correction
- Passage pool: 12 passages of varying length and character complexity; selection is random each race, so a player may get a long dense passage or a short easy one by chance
- Player WPM calculation: based on characters typed divided by elapsed seconds × 60 / 5 (standard 5-char word), updated live during the race
- Error penalty: player errors require Backspace; there is no time penalty beyond the physical time lost correcting — the cursor simply does not advance until the correct character is typed
- No lives or race restarts — a single race ends when any racer finishes; the player cannot retry the same passage

### Difficulty Curve Assessment
The difficulty depends almost entirely on the player's actual typing speed: a player who types 40 WPM will beat Rookie but lose to Pro and Elite immediately, with no way to practice up to their level within the game. The Elite AI at 72 WPM (with ±15% variance peaking at ~83 WPM) is beyond the average adult typing speed of ~40 WPM, meaning most new players will finish in last place on their first several attempts. There is no warm-up passage or difficulty selection, so the gap between a new player and the Elite AI is apparent from the very first race.

## Suggested Improvements
- [ ] Add difficulty selection before the race (Easy: AI WPMs `[25, 35, 45]`, Normal: `[35, 55, 72]`, Hard: `[60, 80, 100]`) so players can choose a challenge level appropriate for their typing speed
- [ ] Reduce Elite's starting `AI_WPMS[2]` from `72` to `65` — 72 WPM is above the ~40 WPM average typing speed, making last place the default outcome for most new players even on their first race
- [ ] Add a practice mode that lets the player type through the passage once at their own pace before the race begins — the random passage pool means players never know if they are getting a long technical passage or a short simple one
- [ ] Show a per-character accuracy tracker (e.g., "Accuracy: 94%") on the HUD during the race — currently the only feedback is the cursor position, and players have no sense of how their error rate is affecting their WPM
- [ ] Highlight upcoming difficult character sequences (numbers, punctuation, capital letters) in a distinct color in the passage text so players can prepare rather than stumble mid-race
- [ ] After the race ends, show a results screen with the player's WPM, accuracy percentage, and the AI WPMs side-by-side — currently the race ends with only a leaderboard position, and players get no actionable feedback on what to improve
