# Trading Card MMO

## Game Type
Collectible card game with deck-building, trading, and tournament modes

## Core Mechanics
- **Goal**: Win battles against AI opponents to earn gold and card packs, build a powerful collection, and climb through tournament rounds.
- **Movement**: Turn-based card game — play creatures, spells, and equipment from hand; attack with field creatures each turn.
- **Key interactions**: Play cards from hand (costs mana), attack with field creatures, cast spells to deal damage or heal, equip items to buff creatures. Trade cards with AI using a value-matching system.

## Controls
Mouse only:
- Click hand card to play it (if affordable)
- Click own field creature to select it for attack
- Click enemy field creature or AI HP bar to attack
- Click "END TURN" button to pass
- Menu buttons: Quick Battle, Tournament, Buy Pack (50g), Collection, Deck Builder, Trade

## Difficulty Progression

### Structure
The game has no automatic difficulty escalation — it is session-based. Difficulty is determined by the AI opponent's deck composition at game start. In Quick Battle, `makeAICollection()` builds a 30-card AI pool with this rarity distribution:
- 50% chance Common, 30% chance Rare, 15% chance Epic, 5% chance Legendary

In Tournament mode, 4 opponents are generated with increasing rare-card probability controlled by `rc = 0.3 + i * 0.15` (where `i` = round 0–3), meaning later tournament opponents have higher Epic/Legendary card ratios.

Mana starts at 1 each turn and increases by 1 per turn (capped at 10), which is standard for card games of this type.

### Key Difficulty Variables
- `playerHP` / `aiHP`: both start at `20`, no regeneration
- `maxMana`: starts at `1`, increases by `1` per turn, capped at `10`
- `playerHand` initial draw: `4` cards
- `playerDeckPile`: 20-card deck (minimum 10 required to battle)
- Starter deck: `makeStarterDeck()` gives 20 copies cycling through the 10 Common card templates — all low-stat Common cards
- AI collection rarity (Quick Battle): 50% Common / 30% Rare / 15% Epic / 5% Legendary (AI starts stronger than player)
- Tournament round rare boost: `rc = 0.3 + (round * 0.15)`, so round 4 AI has dramatically more Epic/Legendary cards

### Difficulty Curve Assessment
The opening experience is harsh: the player starts with a pure Common starter deck of 20 cards cycling through only 10 templates, while the AI's Quick Battle collection already has a significant Rare/Epic component. A new player with no gold has no way to improve their deck before their first battle, making the first few games feel unwinnable. The progression path (win to get pack, buy pack for 50g starting gold) is too slow to catch up to the AI's initial card quality advantage.

## Suggested Improvements
- [ ] Give the player a starting gold of `150` instead of `100` so they can buy 1 pack (50g) before their first battle and have some variety in the starter deck.
- [ ] Reduce the AI Quick Battle Rare probability from `30%` to `15%` and Epic from `15%` to `5%` so the first battle uses a roughly Common-level opponent.
- [ ] Add a "Starter" AI difficulty that uses only Common cards (rarity pool locked to Common), selectable before Quick Battle.
- [ ] Make the starter deck include at least 2 copies of each Common card type rather than cycling 20 through 10 templates, giving more strategic variety from round 1.
- [ ] Cap tournament round 1 rare boost at `rc = 0.15` instead of `0.30` so the difficulty climbs more gradually across the 4 rounds.
- [ ] Add a win streak bonus or a loss consolation pack (free 1-card pack after 3 consecutive losses) to reduce frustration for new players.
