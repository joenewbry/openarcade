# Tactical Card Battler

## Game Type
Turn-based card strategy (Hearthstone-style)

## Core Mechanics
- **Goal**: Reduce the AI hero's HP from 30 to 0 before your own HP reaches 0
- **Movement**: Cards are dragged from hand and dropped onto one of three lanes; minions stay in their lane
- **Key interactions**: Play minion cards to lanes, play spell cards on targets, end turn to trigger combat — minions in the same lane fight each other automatically; minions in uncontested lanes deal damage directly to the opponent hero

## Controls
- Mouse drag cards from hand area to lane zones
- Click "END TURN" button to commit turn and trigger AI response
- Overlay click to start / restart

## Difficulty Progression

### Structure
The game is a single match with no escalating waves or levels. Difficulty is entirely determined by the AI opponent's quality of play and the randomness of card draws from a 15-card deck. Both player and AI start with 0 mana and gain 1 max mana per turn, capping at 10 — this is the standard Hearthstone mana ramp.

### Key Difficulty Variables
- `player.maxMana` / `ai.maxMana`: both start at 0, increase by 1 each turn, cap at `Math.min(10, p.maxMana + 1)`
- `player.hp` / `ai.hp`: both start at 30
- `CARD_POOL`: 20 card templates, costs 1–7 mana; deck is 15 randomly selected cards shuffled
- AI evaluates moves with `evaluateMinion` and `evaluateSpell`, plays all affordable cards greedily, then attacks immediately

### Difficulty Curve Assessment
The AI plays optimally from turn 1 — it greedily evaluates and plays every card it can afford, then immediately attacks. A new player, still learning the drag-drop UI and mana system, faces a competent opponent with no grace period. The random deck composition means the match can swing wildly on the first draw.

## Suggested Improvements
- [ ] Give the player a guaranteed opening hand of cheap (1–2 mana) minions by ensuring the first 3 dealt cards cost ≤ 2 mana, avoiding a dead hand on turn 1
- [ ] Add an AI difficulty setting: in "Easy" mode, add noise to `evaluateMinion` scores (e.g. `s += (Math.random() - 0.5) * 5`) so the AI occasionally misplays, giving new players room to learn
- [ ] Show a brief tutorial overlay on first game explaining mana ramp — players need to understand why they can't play 5-cost cards until turn 5
- [ ] Add a "draw 1 extra card on your first turn" advantage for the player (first-player disadvantage is real in card games)
- [ ] Increase starting hand size from 1 card (cards are drawn one per turn) to 3 cards for turn 1 to reduce early turns of doing nothing
- [ ] Add a "Practice vs. Passive AI" mode where the AI only plays defensive cards for the first 5 turns, letting beginners learn the UI without immediate aggression
