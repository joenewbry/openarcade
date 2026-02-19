# Wesnoth Lite (Battle for Wesnoth Lite)

## Game Type
Hex-grid turn-based tactics with recruitment, terrain bonuses, and day/night cycles

## Core Mechanics
- **Goal**: Kill the enemy Leader unit before your own Leader falls. Secondary goals: capture villages for income, recruit new units each turn.
- **Movement**: Select a unit, click a highlighted hex to move (movement points vary by unit type and terrain cost). After moving, click an enemy unit in range to attack.
- **Key interactions**: Recruit units from castle hexes adjacent to your Leader; capture villages by occupying them (heals 4 HP/turn); combat uses attack/defense counts modified by terrain defense bonuses and a day/night alignment multiplier.

## Controls
- Mouse click on own unit: select it, shows movement highlights (blue) and attack highlights (red)
- Mouse click on blue hex: move selected unit there
- Mouse click on red hex: attack the enemy unit there
- Mouse click on empty castle hex: open recruit menu
- Escape: cancel selection / close recruit menu
- Space or "END TURN" button: end player turn
- Recruit menu: click a unit row to recruit (costs gold)

## Difficulty Progression

### Structure
The game runs turn by turn with no fixed end point — it ends only when a Leader dies. There is no difficulty escalation; the AI behaves identically on turn 1 and turn 30. The day/night cycle repeats every 6 turns: day (turns 1, 2) → dusk (3) → night (4, 5) → dawn (0).

Both sides start with `playerGold = 100`, `aiGold = 100` and earn income of `2 + countOwnedVillages(owner)` gold per turn. The player begins with a Leader, 1 Swordsman, and 1 Archer. The AI begins with the same composition at the opposite corner.

The AI recruit logic (`aiRecruit()`) runs each turn and attempts up to 3 recruits, following a priority order: at least 1 Swordsman, then 1 Archer, then 2 Mages at night, then 2 Cavalry, then random. The AI move/attack (`aiActUnit`) evaluates all reachable positions and targets, with a significant +60 bonus for attacking the player Leader.

### Key Difficulty Variables
- Starting gold (both sides): `100`
- Income base: `2` gold/turn + `1` per owned village
- Village heal: `+4` HP/turn when occupying village or castle hex
- Unit costs: Swordsman `14g`, Archer `15g`, Cavalry `18g`, Mage `16g`
- AI max recruits per turn: `3` attempts (limited by gold)
- Player starting units: Leader (HP 42), Swordsman (HP 38), Archer (HP 30)
- AI starting units: identical to player
- Terrain defense bonuses: Grass `0%`, Village `10%`, Forest `20%`, Castle `20%`, Hills `30%`, Water `0%`
- Day/night alignment multiplier: lawful units `+25%` atk during day / `-25%` at night; chaotic units inverse; neutral unchanged
- AI Leader attack bonus: `+60` scoring weight when targeting player Leader

### Difficulty Curve Assessment
The starting conditions are symmetric and fair, which is good. However, the AI's `+60` Leader-hunting bonus means AI units aggressively beeline toward the player's Leader from turn 1, which can result in a loss before the player understands the recruitment system or terrain mechanics. The 100 gold starting bank is generous but the recruit menu is not immediately obvious to new players. With no tutorial prompts and an AI that punishes exposed leaders harshly, the first game is commonly a loss due to a misunderstood mechanic rather than a difficult strategic decision.

## Suggested Improvements
- [ ] Reduce the AI Leader-hunting bonus from `+60` to `+30` for the first 5 turns so the AI plays more balanced territory-control tactics early, giving new players time to learn before the enemy converges.
- [ ] Reduce the AI max recruits per turn from `3` to `1` for the first 3 turns, then `2` for turns 4–6, then `3` thereafter, so the army build-up is gradual rather than immediate.
- [ ] Add an in-game prompt on turn 1 highlighting the castle hexes and recommending the player recruit a unit, since the recruit mechanic (click empty castle hex) is not discoverable without trial and error.
- [ ] Increase the player's starting army by 1 unit — add a Cavalry (cost `18g`, deducted from starting gold, leaving `82g`) at position `(2, 7)` — so the player has a faster unit available from the start to contest mid-map villages.
- [ ] Make the map generate with at least 2 guaranteed villages in the player's half (bottom-left quadrant) so new players have reliable income-capture targets within short movement range of their starting position.
- [ ] Add a soft lose condition warning when the player's Leader HP drops below 30%: show a flashing indicator and a tip "Protect your Leader — retreat to the castle for defense bonus", since many new players don't realize the Leader's importance until it's too late.
