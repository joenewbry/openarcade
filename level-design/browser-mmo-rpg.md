# Browser MMO RPG

## Game Type
Top-down action RPG / dungeon crawler

## Core Mechanics
- **Goal**: Level up your character, complete quests, defeat the Shadow Dragon boss, and accumulate score; explore a persistent world with 4 zones (Town, Forest, Dungeon, PvP Arena)
- **Movement**: WASD moves the player through a tile-based world; camera follows
- **Key interactions**: Auto-attack on nearby enemies, ability casting (1–4 keys), item collection and equipping, NPC interaction (shop, quest board, innkeeper, guild), party management

## Controls
- WASD: move player
- 1 / 2 / 3 / 4: use class ability (Slash, Shield Bash, Whirlwind, War Cry for Warrior; Firebolt, Ice Nova, Lightning, Heal for Mage; Arrow, Multi-Shot, Trap, Companion for Ranger)
- E: interact with nearby NPC or pick up item
- I: open inventory
- M: open world map
- Q: open quest log
- Mouse: aim ranged abilities toward cursor position
- Click: class selection on start screen

## Difficulty Progression

### Structure
Unlike most games in this collection, Browser MMO RPG has RPG-style character progression rather than level-based difficulty. Difficulty is determined by which zone the player visits and which enemies they engage. The world is open from the start — a level 1 character can immediately walk into the Dungeon and face Skeleton/Wraith/Dark Knight enemies, or even the Shadow Dragon boss.

Enemy types and stats are fixed (not scaling):
- **Town surroundings**: Slimes (HP 25, STR 4, XP 15)
- **Forest**: Wolves (HP 40, STR 7, XP 25), Goblins (HP 50, STR 9, XP 35), Bandits (HP 70, STR 12, XP 50)
- **Dungeon**: Skeletons (HP 60, STR 11, XP 45), Wraiths (HP 80, STR 15, XP 65), Dark Knights (HP 120, STR 18, XP 90)
- **Boss**: Shadow Dragon (HP 500, STR 30, XP 500, 100% drop rate)
- **PvP Arena**: Arena Champions (HP 150, STR 20, XP 100)

### Key Difficulty Variables
- **Starting gold**: 50 — enough for 3 health potions from the shop (~15g each)
- **XP to level**: starts at 100, scaling unknown (not visible in first 200 lines)
- **Player starting stats** by class: Warrior (HP 120, STR 14, DEF 12), Mage (HP 70, MP 100, STR 6, INT 16), Ranger (HP 90, STR 10, SPD 4)
- **Damage formula**: `Math.max(1, Math.floor(str * baseDmg - def * 0.4 + (Math.random() * 4 - 2)))` — linear with attacker STR, partially mitigated by DEF
- **Enemy respawn**: enemies have `respawnTimer` suggesting they respawn, though the timing wasn't visible in the read sections
- **Mage HP 70**: significantly lower than Warrior (120) with no defensive alternative — Mage is high-risk from the first encounter

### Difficulty Curve Assessment
The game suffers from a classic RPG problem: the world is fully open but nothing guides the player to appropriately-leveled content. A new player who immediately heads north or west from Town will encounter Forest enemies (Bandits, STR 12) that can two-shot a starting Mage. The Dungeon is accessible with no gate. The quest system provides some direction (Slime Cleanup → Wolf Menace → Goblin Camp) but it's opt-in. The Mage class starts with only 70 HP and no starting armor, making it punishing to learn with.

## Suggested Improvements
- [ ] Add a soft zone boundary indicator on the world map showing recommended player levels (e.g. "Forest: Level 3+", "Dungeon: Level 6+") to give players directional guidance without hard-locking zones
- [ ] Place 2–3 slimes directly in the town safe area that have halved stats (`HP 12, STR 2`) to serve as zero-risk tutorial enemies before the player leaves town
- [ ] Give Mage a starting `leather_armor` item (DEF 3) in addition to the oak staff, bringing starting effective HP closer to Warrior's durability
- [ ] Increase starting gold from 50 to 100 so players can afford both a weapon upgrade and healing supplies from the shop before venturing out
- [ ] Make the quest board NPC display a recommended zone and enemy tier for each quest (e.g. "Slime Cleanup — Town Area, Easy") so players know where to go and what to expect
- [ ] Add a visual danger indicator (skull icon or color-coded enemy health bar) that appears when a nearby enemy significantly outlevels the player, warning them to retreat before engaging
