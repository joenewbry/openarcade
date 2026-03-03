# Browser-Based 1v1 FPS: Skill Progression & Balance Design

**Author:** Ikeda Design School (Challenge & Progression)  
**Status:** Draft v1  
**Last Updated:** 2026-03-02  
**Scope:** Competitive integrity, weapon balance, skill expression, map control, matchmaking

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Skill Ceiling Architecture](#2-skill-ceiling-architecture)
3. [Weapon System & Balance](#3-weapon-system--balance)
4. [Map Design Principles](#4-map-design-principles)
5. [Scoring & Performance Systems](#5-scoring--performance-systems)
6. [Matchmaking & Fair Play](#6-matchmaking--fair-play)
7. [Progression & Player Growth](#7-progression--player-growth)
8. [Anti-Frustration Design](#8-anti-frustration-design)
9. [Technical Constraints](#9-technical-constraints-browser)
10. [Balance Tuning Variables](#10-balance-tuning-variables)

---

## 1. Design Philosophy

### The Two-Game Principle (adapted from CAVE school)

In DoDonPachi, the casual player sees a survival game. The expert sees a scoring puzzle. Both play the same screen. **This 1v1 FPS must work the same way:**

- **The novice game:** Move, aim, shoot, don't die. Satisfying at the first minute.
- **The expert game:** Map control, resource timing, movement tech, weapon matchup decisions, economy management, positioning reads.

These are not two separate modes. They are layers of the same match that reveal themselves through play.

### Core Design Tenets

1. **Skill differentiation is multidimensional.** Aim is one axis. Movement, positioning, timing, economy, and prediction are equally deep. A player with 80th percentile aim and 95th percentile positioning should beat a player with 95th percentile aim and 50th percentile positioning.

2. **Every weapon is a sentence, not a word.** Each weapon should demand a different *style of play*, not just a different fire rate. Picking a weapon is a strategic commitment with tradeoffs, not a DPS comparison.

3. **Readability under pressure.** Borrowing from bullet hell: when the action is intense, every element must remain parseable. No "I died and don't know why." Clear audio/visual language for damage sources, weapon types, and threat direction.

4. **Risk/reward is the engine of excitement.** Safe play should be viable but suboptimal. Aggressive play should be rewarded but punishable. The skill expression lives in the boundary between "too safe" and "too reckless."

5. **Matches must tell a story.** No two rounds should feel identical. Resource spawns, map control shifts, weapon pickups, and momentum swings create a narrative arc within each match.

---

## 2. Skill Ceiling Architecture

### 2.1 Skill Axes (Dimensions of Mastery)

Competitive depth comes from having multiple independent skill axes. Here is the hierarchy:

| Skill Axis | Description | Skill Floor | Skill Ceiling |
|---|---|---|---|
| **Aim** | Raw crosshair accuracy, tracking, flick shots | Point and click | Subpixel-level tracking, predictive aim |
| **Movement** | Strafing, bunny-hop/air control, dodge timing | WASD walk | Strafe-jumping chains, air-strafe around corners |
| **Positioning** | Where you choose to fight from | Stand in the open | Pre-rotate to off-angles, play sight-line geometry |
| **Map Control** | Controlling resource spawns, denying areas | Wander randomly | Timed rotations, spawn control, area denial |
| **Weapon Selection** | Choosing the right tool for the engagement | Use whatever you have | Counter-pick based on range/map area/opponent tendency |
| **Economy/Resources** | Health, armor, ammo management | Pick up what you see | Deny opponent resources, time rotations to spawns |
| **Prediction** | Reading opponent patterns and tendencies | React to what you see | Predict rotations, pre-aim common positions, set traps |
| **Tempo** | Controlling the pace and initiative of the match | Fight when you meet | Disengage from bad fights, force engagements on your terms |

### 2.2 Mechanical Skill Expression

#### Movement System
Movement is the primary skill differentiator beyond aim. The system should include:

- **Base movement:** WASD, sprint (limited duration/cooldown), crouch, jump
- **Strafe acceleration:** Slightly faster than forward movement to reward side-stepping
- **Air control:** Moderate air-strafe ability. Not Quake-level bunny-hop, but enough that good players can curve their jump arc around corners
- **Crouch-slide:** Sprint → Crouch initiates a short slide (0.6s duration, 1.2× speed). Skilled players chain slides off slopes/ramps for mobility advantage
- **Jump accuracy penalty:** Reduced accuracy while airborne (25% spread increase) to prevent "jump peek" spam from being dominant

**Key variable:**
```
MOVE_SPEED_WALK     = 5.0 units/s
MOVE_SPEED_SPRINT   = 7.5 units/s  (1.5× walk)
MOVE_SPEED_CROUCH   = 2.5 units/s  (0.5× walk)
MOVE_SPEED_SLIDE    = 6.0 units/s  (decays over 0.6s to crouch speed)
STRAFE_MULTIPLIER   = 1.05         (strafing is 5% faster than forward)
AIR_CONTROL         = 0.35         (35% of ground acceleration while airborne)
JUMP_HEIGHT          = 2.2 units
SPRINT_DURATION      = 3.0s
SPRINT_COOLDOWN      = 1.5s        (begins after sprint ends)
```

#### Aim Mechanics
- **Hitscan primary weapons** with projectile-based specials (rockets, grenades)
- **No random spread on primary weapons.** Every bullet goes exactly where the crosshair points. Recoil patterns are fixed and learnable (CS-school)
- **Recoil recovery:** Weapon returns to center after sustained fire. Speed of recovery varies by weapon
- **Movement accuracy penalty:** Slight spread increase while moving (10% at walk, 25% at sprint). Standing still rewards precise aim
- **Headshot multiplier:** 2.0× for all hitscan weapons. This is the primary aim reward

```
HEADSHOT_MULTIPLIER  = 2.0
MOVE_SPREAD_WALK     = 1.10  (10% spread increase)
MOVE_SPREAD_SPRINT   = 1.25  (25% spread increase)
MOVE_SPREAD_CROUCH   = 0.90  (10% LESS spread — crouching improves accuracy)
JUMP_SPREAD          = 1.25  (25% spread increase)
```

### 2.3 Skill Expression Through Decision-Making

Beyond mechanics, the game rewards *decisions:*

- **Engagement distance:** Each weapon has an optimal range. Choosing to fight at YOUR weapon's optimal range (not theirs) is a skill
- **Disengagement:** Knowing when to back off a fight you're losing (vs. committing). Exiting a bad fight preserves HP for the next engagement
- **Resource denial:** Taking a health pack at 90 HP to deny it from a 30 HP opponent is a valid strategy
- **Sound cues:** Footsteps, weapon switches, and reload sounds provide information. Skilled players use audio to predict opponent position
- **Spawn timing:** Resources respawn on fixed timers. Controlling the timing is a deep strategic layer

---

## 3. Weapon System & Balance

### 3.1 Design Principles

Borrowed from Robin Walker's TF approach and refined:

1. **Each weapon owns a range band.** No weapon should be best at all ranges
2. **Each weapon has a clear weakness.** Counterplay must be obvious
3. **Skill ceiling varies by weapon.** Some weapons reward aim mastery, others reward positioning mastery
4. **No weapon is a strict upgrade.** Sidegrade philosophy — stronger in some situations, weaker in others
5. **Pickup-based, not loadout-based.** Weapons are map resources. Controlling weapon spawns is part of the strategy

### 3.2 Weapon Archetypes

The game should have **5 weapons**: 1 spawn weapon (always available) + 4 pickup weapons.

---

#### 🔫 Sidearm (Spawn Weapon)
**Role:** Reliable fallback. Always available. Competitive but not dominant.

| Property | Value |
|---|---|
| Type | Hitscan, semi-automatic |
| Damage | 18 body / 36 head |
| Fire Rate | 4 shots/sec (250ms between shots) |
| Magazine | 12 rounds |
| Reload | 1.4s |
| Optimal Range | Medium (15–25 units) |
| Spread | Minimal, +5% per shot (resets after 0.3s) |

**Skill ceiling:** Headshot consistency. Clicking heads at 4/sec with perfect accuracy kills in 3 shots (108 damage to 100 HP) = 0.5s TTK with perfect play. Body shots need 6 hits = 1.25s TTK.

**Design intent:** Never feel helpless. A skilled player with just the sidearm can outgun a sloppy player with any pickup weapon. But in an equal skill matchup, the pickup weapons have the advantage.

---

#### ⚡ Pulse Rifle (Pickup)
**Role:** Consistent medium-range dueling. The "all-rounder" that rewards tracking aim.

| Property | Value |
|---|---|
| Type | Hitscan, automatic |
| Damage | 12 body / 24 head |
| Fire Rate | 10 shots/sec (100ms between shots) |
| Magazine | 30 rounds |
| Reload | 2.0s |
| Optimal Range | Medium (12–30 units) |
| Spread | Low base, +2% per consecutive shot (up to +20%) |
| Recoil | Slight vertical climb, fixed learnable pattern |

**Skill ceiling:** Tracking aim + recoil control. Full-auto headshot tracking is devastating (240 DPS to head vs 120 DPS to body). Spray control allows extended bursts.

**Weakness:** Loses to burst damage weapons at close range. Extended spray becomes inaccurate.

---

#### 💥 Scattergun (Pickup)
**Role:** High burst damage at close range. Rewards aggressive positioning and movement.

| Property | Value |
|---|---|
| Type | Hitscan, 8 pellets per shot |
| Damage | 8 per pellet (64 max body / 128 max head) |
| Fire Rate | 1 shot/sec (1000ms between shots) |
| Magazine | 6 shells |
| Reload | 0.5s per shell (can interrupt reload to fire) |
| Optimal Range | Close (0–10 units) |
| Spread | Wide cone (15° half-angle) |

**Skill ceiling:** Movement to close distance. Flick aim at close range. Knowing when to peek/shoot vs. reposition. Partial reload management (fire 2, reload 2, fire again).

**Weakness:** Nearly useless past 15 units. Punished hard by backpedaling opponents. Slow fire rate means a miss = 1 full second of vulnerability.

**Risk/reward:** Full pellet headshot at point-blank = 128 damage (one-shot kill). But getting to point-blank alive against a skilled opponent is the challenge. This is the "chain" mechanic of the CAVE school — maximum reward requires maximum risk.

---

#### 🚀 Launcher (Pickup)
**Role:** Area control and splash damage. Rewards prediction and map knowledge over raw aim.

| Property | Value |
|---|---|
| Type | Projectile, arcing trajectory |
| Damage | 80 direct hit / 20–50 splash (falloff by distance from center) |
| Fire Rate | 1.2 shots/sec (833ms between shots) |
| Magazine | 4 rounds |
| Reload | 2.5s |
| Projectile Speed | 15 units/sec |
| Splash Radius | 5 units |
| Self-Damage | 50% of normal (allows rocket-jumping at cost) |

**Skill ceiling:** Prediction-based. Direct hits at medium range require leading the target. Splash placement for area denial. **Rocket-jumping:** self-damage for height advantage (jump + fire at feet = 40 self-damage, massive height boost). A deep mobility tool for experts.

**Weakness:** Slow projectile is dodgeable by alert opponents. Close-range self-damage makes CQC dangerous. Small magazine forces careful shot selection.

**Risk/reward:** Rocket-jumping costs 40% of your HP but grants unmatched vertical positioning. The expert calculates whether the positional advantage is worth the health trade.

---

#### 🎯 Rail (Pickup)
**Role:** Long-range precision. The ultimate aim-skill weapon.

| Property | Value |
|---|---|
| Type | Hitscan, single shot |
| Damage | 70 body / 140 head (instant kill) |
| Fire Rate | 0.67 shots/sec (1500ms between shots) |
| Magazine | 1 round (auto-reloads) |
| Reload | 1.5s (automatic, cannot be interrupted) |
| Optimal Range | Long (25+ units) |
| Trail | Visible tracer lasting 0.5s reveals shooter position |

**Skill ceiling:** Pure flick-shot accuracy. One shot to decide a fight. Headshot = instant kill. Body shot = 70 damage, enough to force a retreat.

**Weakness:** Miss = 1.5s of complete vulnerability. Tracer reveals your position. Terrible at close range (you get one shot, then they're in your face). Cannot quick-switch cancel.

**Risk/reward:** The highest-risk, highest-reward weapon. A perfect rail player dominates long sight-lines but is helpless in corridors. The tracer mechanic means every shot, hit or miss, gives the opponent information.

---

### 3.3 Weapon Balance Matrix

| Matchup | Sidearm | Pulse Rifle | Scattergun | Launcher | Rail |
|---|---|---|---|---|---|
| **vs. Sidearm** | Even | Slight advantage | Advantage (close) | Advantage (indirect) | Advantage (long) |
| **vs. Pulse Rifle** | Slight disadvantage | Even | Advantage (close) | Even | Advantage (long) |
| **vs. Scattergun** | Disadvantage (close) | Disadvantage (close) | Even | Even (both CQC danger) | Strong advantage (long) |
| **vs. Launcher** | Disadvantage | Even | Even | Even | Advantage (long) |
| **vs. Rail** | Disadvantage (long) | Disadvantage (long) | Strong advantage (close) | Disadvantage | Even |

**Key balance insight:** The weapon triangle is **Scattergun beats close-range → Rail beats long-range → Movement-based weapons beat Rail at close range → Scattergun**. The Pulse Rifle and Launcher sit in the middle as generalists.

### 3.4 Time-to-Kill (TTK) Analysis

Target: 100 HP player, all body shots unless noted.

| Weapon | Body TTK | Headshot TTK | Shots to Kill (body) | Shots to Kill (head) |
|---|---|---|---|---|
| Sidearm | 1.25s | 0.50s | 6 | 3 |
| Pulse Rifle | 0.80s | 0.40s | 9 | 5 |
| Scattergun | 1.00s (2 shots) | 0.00s (1 shot, point-blank) | 2 | 1 |
| Launcher | 0.83s (direct) | N/A (no headshot) | 2 direct | N/A |
| Rail | 1.50s (2 shots) | 0.00s (1 shot) | 2 | 1 |

**Design target:** Average engagement TTK should be 0.8–1.5s. Fast enough to feel snappy, slow enough for counterplay and decision-making. CS-like instant kills exist (Rail headshot, Scattergun point-blank) but require maximum skill expression to achieve.

---

## 4. Map Design Principles

### 4.1 Map Philosophy

Maps are the stage where skill expression performs. Bad maps flatten the skill gap; great maps amplify it.

**Core principles (the Minh Le / Walker synthesis):**

1. **Three-lane structure with verticality.** Not literally three lanes, but every map should have at least three distinct routes between any two points. This prevents "corridor shooters" and rewards map knowledge.

2. **Sight-line control.** Each area should have 1–2 long sight-lines (Rail territory) and 1–2 close-quarters flanks (Scattergun territory). The fight over WHICH sight-line to use is the strategic layer.

3. **Verticality as skill amplifier.** Height advantage matters: higher ground = easier headshots, harder to be headshot. But gaining height costs time or HP (stairs, jumps, or rocket-jumps).

4. **No dead ends.** Every position should have at least 2 exits. Getting trapped should be a positioning mistake, not a map design failure.

5. **Asymmetry in detail, symmetry in balance.** Maps can be asymmetric in layout (more interesting) as long as both sides have equivalent access to resources and positional advantages. Mirror-symmetric maps are acceptable for competitive purity but less memorable.

### 4.2 Map Geometry Language

| Element | Purpose | Skill Reward |
|---|---|---|
| **Long corridor** | Rail sight-line, info-gathering | Aim precision, peek timing |
| **Corner/90° turn** | Close-range ambush, defensive position | Pre-aiming, audio reads |
| **Ramp/stairs** | Vertical transitions | Height control, strafe-jumping up ramps |
| **Platform/ledge** | Height advantage position | Rocket-jump access, fall-off risk |
| **Pillar/cover** | Intermediate cover in open areas | Peek shooting, cover dancing |
| **Choke point** | Narrow passage between areas | Area denial (launcher), timing |
| **Open atrium** | Multi-angle engagement space | 360° awareness, movement skill |

### 4.3 Resource Placement Principles

Resources (health, armor, weapons) placed on the map are the **economy system** of arena FPS. Their placement defines the map's strategic landscape.

```
HEALTH_SMALL     = +25 HP     | Respawn: 15s  | Placement: 4-6 per map, near combat zones
HEALTH_MEGA      = +50 HP     | Respawn: 30s  | Placement: 1 per map, contested position
ARMOR_SMALL      = +25 Armor  | Respawn: 15s  | Placement: 2-3 per map, off-angle paths
ARMOR_MEGA       = +50 Armor  | Respawn: 30s  | Placement: 1 per map, contested position
WEAPON_PICKUP    = Weapon     | Respawn: 20s  | Placement: 1 of each type per map
AMMO_PACK        = Weapon ammo| Respawn: 15s  | Placement: Near weapon spawn location
```

**Maximum effective HP:** 100 HP + 100 Armor = 200 effective HP (armor absorbs 66% of damage, health takes 34%). This means a fully stacked player has ~2× the durability of a freshly spawned one, creating a meaningful advantage for map control without making comeback impossible.

**Armor damage reduction:**
```
ARMOR_ABSORPTION = 0.66   (armor absorbs 66% of incoming damage)
HEALTH_ABSORPTION = 0.34  (health takes remaining 34%)
MAX_ARMOR = 100
MAX_HP = 100
```
A fully armored player takes: 100 damage → loses 66 armor + 34 HP. Two Rail body shots (140 total) against a fully stacked player: 92 armor damage + 48 HP damage. Player survives with 8 armor + 52 HP. This rewards map control without making it oppressive.

### 4.4 Map Template: "Foundry" (Reference Design)

A concrete example map to illustrate the principles:

```
        ┌─────────────────────────┐
        │      UPPER CATWALK      │ (Rail spawn here)
        │   ┌───────────────┐     │
        │   │   ATRIUM      │     │
    ┌───┤   │  (open, multi- │   ┌─┤
    │   │   │   level)       │   │ │
    │ W │   └───┬───────┬───┘   │E│
    │ E │       │MEGA HP│       │A│ (Mega HP: center, exposed)
    │ S │   ┌───┴───────┴───┐   │S│
    │ T │   │  LOWER LEVEL  │   │T│
    │   │   │ (tunnels,     │   │ │
    │ W │   │  close-range) │   │ W│
    │ I │   └───────────────┘   │I│ (Scattergun spawns in tunnels)
    │ N │                       │N│
    │ G ├── CHOKE ──┬── CHOKE ──┤G│
    │   │           │           │ │
    └───┤  SPAWN A  │  SPAWN B  ├─┘
        │ (Sidearm) │ (Sidearm) │
        └───────────┴───────────┘
         Launcher spawn: West wing (elevated)
         Pulse Rifle spawn: East wing (ground level)
         Armor Mega: Upper catwalk (must rocket-jump or take stairs)
```

**Strategic reads:**
- **The Mega HP** is in the open atrium center — contesting it means exposure to Rail from the catwalk and Launcher from the west wing. Risk/reward personified.
- **The Armor Mega** is on the upper catwalk — reachable by stairs (slow, predictable) or rocket-jump (fast, costs 40 HP). The better player reaches it faster and cheaper.
- **Lower tunnels** are Scattergun territory — entering with a Rail is suicide. The map forces weapon-appropriate play.
- **Choke points** between wings create Launcher denial opportunities but can be flanked through the atrium.

### 4.5 Map Rotation & Variety

For a 1v1 browser game, **3 maps** at launch is sufficient:

1. **Foundry** — Balanced, teaches all mechanics. Medium size.
2. **Spire** — Vertically focused, small footprint, fast-paced. Rewards movement skill and close-range weapons.
3. **Expanse** — Larger, more open sight-lines, rewards positioning and Rail play. Slower tempo.

Each map should favor different skill axes to prevent one-dimensional players from dominating across all maps.

---

## 5. Scoring & Performance Systems

### 5.1 Match Format

**Best of 5 rounds** (first to 3 round wins). Each round is **3 minutes** or **first to 15 kills**.

```
ROUND_TIME_LIMIT    = 180s (3 minutes)
ROUND_KILL_LIMIT    = 15
MATCH_ROUNDS        = best of 5
```

**Why this format:**
- 3-minute rounds prevent camping/stalling
- 15-kill limit rewards aggressive play
- Best of 5 reduces variance and rewards adaptation
- Total match time: 9–15 minutes (appropriate for browser sessions)

### 5.2 Scoring Beyond Kills

The scoreboard tracks more than K/D to surface other skill axes:

| Stat | What it Measures |
|---|---|
| Kills | Fragging ability |
| Deaths | Survivability |
| Damage Dealt | Consistent aim (even if not finishing kills) |
| Damage Taken | Positioning / evasiveness |
| Headshot % | Aim precision |
| Mega Pickups | Map control execution |
| Control Time | Time spent in advantageous positions |
| Accuracy | Shot efficiency |

**Post-match performance rating** uses a weighted formula:
```
Performance = (Kills × 100) + (Damage × 0.5) + (Headshot% × 200) 
            + (MegaPickups × 150) - (Deaths × 50)
```

This is displayed but NOT used for matchmaking (see section 6). It's for self-improvement tracking.

### 5.3 The "Momentum" System (Ikeda School: Chain Mechanic)

Adapted from DoDonPachi's chain system — consecutive kills build **Momentum**, a visible indicator that rewards sustained aggression:

```
Momentum Level 0: Default state
Momentum Level 1: 2 kills without dying → +5% movement speed
Momentum Level 2: 4 kills without dying → +5% movement speed, +10% reload speed
Momentum Level 3: 6 kills without dying → +5% movement speed, +10% reload speed, slight glow effect (cosmetic + reveals position)

Momentum resets to 0 on death.
```

**Design reasoning:**
- **Small bonuses** (5% speed, 10% reload) are noticeable but not decisive. A skilled player at momentum 0 still beats a mediocre player at momentum 3.
- **The glow at level 3** is a risk/reward trade: you're faster and reload faster, but you're also more visible. Classic CAVE: the reward for playing well makes you a bigger target.
- **Dying resets momentum** — this punishes overconfidence and creates "push your luck" tension. Do you keep fighting with momentum 3 + 30 HP, or retreat to heal and lose your streak?

---

## 6. Matchmaking & Fair Play

### 6.1 Rating System

**Glicko-2** rating system (superior to Elo for 1v1 with infrequent play):

```
INITIAL_RATING       = 1500
INITIAL_RD           = 350   (rating deviation — uncertainty)
INITIAL_VOLATILITY   = 0.06
MIN_RD               = 30    (never fully certain)
RD_INCREASE_PER_DAY  = 5     (rating decays toward uncertainty without play)
```

**Why Glicko-2:**
- Handles rating uncertainty (new players don't have artificially stable ratings)
- Accounts for time between matches (returning players get wider uncertainty)
- Well-suited for 1v1 formats

### 6.2 Matchmaking Philosophy

**Axiom:** A fair match is one where both players believe they could win. A *great* match is one where both players believe they *should have* won.

```
MATCHMAKING_WINDOW_INITIAL  = ±100 rating points
MATCHMAKING_WINDOW_EXPAND   = +50 per 15 seconds of queue
MATCHMAKING_WINDOW_MAX      = ±400 rating points
MATCHMAKING_TIMEOUT         = 120s (offer bot match after timeout)
```

**Queue expansion logic:**
1. 0–15s: Search ±100 rating
2. 15–30s: Search ±150
3. 30–45s: Search ±200
4. 45–60s: Search ±250
5. 60–90s: Search ±350
6. 90–120s: Search ±400
7. 120s+: Offer AI opponent match (unrated)

### 6.3 Placement & New Player Protection

**Placement matches:** First 10 matches are "placement" — wider matchmaking window, higher rating adjustment per match, no visible rank badge.

```
PLACEMENT_MATCH_COUNT  = 10
PLACEMENT_RD           = 350  (high uncertainty, large swings)
POST_PLACEMENT_RD      = 100  (stabilizes after placement)
```

**New player pool:** Players with <5 matches are preferentially matched against other <5-match players if available (±200 rating window only in this pool). If no new player is available within 30s, normal pool is used.

### 6.4 Rank Tiers (Cosmetic)

Visible ranks for player motivation. These map to Glicko-2 rating ranges:

| Rank | Rating Range | % of Players (target) |
|---|---|---|
| Bronze | 0–1099 | Bottom 20% |
| Silver | 1100–1399 | 20–40% |
| Gold | 1400–1699 | 40–70% |
| Platinum | 1700–1999 | 70–90% |
| Diamond | 2000–2299 | 90–97% |
| Champion | 2300+ | Top 3% |

### 6.5 Anti-Cheat & Fair Play

Browser-based anti-cheat is limited but not hopeless:

1. **Server-authoritative hit registration.** All damage calculations happen server-side. Client sends input; server validates. No client-side HP manipulation.
2. **Input rate limiting.** Maximum fire rate enforced server-side. No rapid-fire exploits.
3. **Movement validation.** Server tracks player position with tolerance. Teleportation or impossible speeds are rejected.
4. **Statistical anomaly detection.** Flag accounts with impossible accuracy (>85% headshot rate over 50+ matches) or reaction times (<100ms consistent) for review.
5. **Report system.** Post-match report button. 3+ reports from unique players in 24h triggers review.
6. **Replay system.** Last 20 matches stored server-side for review. Critical for dispute resolution.

### 6.6 Anti-Griefing

1. **AFK detection:** No input for 15s = warning. 30s = auto-forfeit.
2. **Intentional feeding detection:** 5 deaths within 30s without dealing any damage = soft warning.
3. **Rage-quit penalty:** Disconnecting from a ranked match = automatic loss + 5-minute queue cooldown. Repeat offenders: 15 min → 30 min → 1 hour escalation.
4. **No all-chat during match.** Post-match lobby only. Reduces toxicity in the moment.
5. **Canned communication only during match:** Quick-chat wheel with pre-set phrases ("Good shot", "Nice round", "GG") — no free text during gameplay.

```
AFK_WARNING_TIME     = 15s
AFK_FORFEIT_TIME     = 30s
RAGEQUIT_COOLDOWN_1  = 300s   (5 minutes)
RAGEQUIT_COOLDOWN_2  = 900s   (15 minutes)
RAGEQUIT_COOLDOWN_3  = 3600s  (1 hour)
RAGEQUIT_DECAY       = Resets one level per 24 hours of clean play
```

---

## 7. Progression & Player Growth

### 7.1 Skill Progression Curve

The game should support four phases of player growth:

#### Phase 1: Orientation (Matches 1–10)
**What they're learning:** Controls, weapon feel, map layout, basic aim
**What the game provides:**
- Placement matches with wider tolerance
- Optional bot match before first PvP
- In-match tips triggered by context ("Press Shift to sprint", "Pick up weapons on the map")
- Simplified scoreboard (just kills and deaths)

#### Phase 2: Competence (Matches 11–50)
**What they're learning:** Weapon matchups, map flow, resource timing, basic positioning
**What the game provides:**
- Full scoreboard with all stats
- Post-match performance breakdown
- Map callout overlay (toggle-able)
- "Tip of the match" based on stats (e.g., "Your accuracy was 18% — try burst-firing instead of holding")

#### Phase 3: Proficiency (Matches 51–200)
**What they're learning:** Advanced movement, spawn timing, prediction, tempo control
**What the game provides:**
- Detailed accuracy breakdown by weapon
- Heatmap of deaths (where are you dying most?)
- Replay review capability
- Exposure to full strategy depth

#### Phase 4: Mastery (Matches 200+)
**What they're learning:** Opponent-specific adaptation, meta-game, optimization
**What the game provides:**
- Match history and stat trends over time
- Per-opponent stats (if rematched)
- Community features (leaderboards, seasonal rankings)

### 7.2 Cosmetic Progression (Non-Gameplay)

**No gameplay-affecting unlocks.** All weapons and mechanics available from match 1. Progression unlocks are purely cosmetic:

- **Weapon skins:** Earned through match milestones (50 kills with Scattergun, etc.)
- **Player trails:** Earned through achievement (first Momentum 3, 10 headshot kills in one match, etc.)
- **Rank badges:** Automatically reflect current rank
- **Title cards:** "Railgun Master" (500 Rail kills), "Marathon Runner" (100 matches played), etc.

**Why cosmetic-only:** Gameplay-affecting progression creates an unfair advantage for veteran players over new ones. In a 1v1 game, this is fatal to competitive integrity. The only advantage a veteran has should be *skill*.

### 7.3 Practice Modes

1. **Aim Trainer:** Target range with moving bots. Tracks accuracy stats. No stakes.
2. **Bot Match:** Full match against AI at selectable difficulty (Easy / Medium / Hard / Nightmare). Unrated.
3. **Free Roam:** Solo map exploration. Learn layouts, practice movement tech, time resource spawns.
4. **Replay Review:** Watch past matches from either player's perspective. Useful for learning from losses.

---

## 8. Anti-Frustration Design

### 8.1 Spawn System

Bad spawns create unfair deaths. The spawn system must prevent spawn-camping:

```
SPAWN_PROTECTION_TIME   = 2.0s   (invulnerable after spawn)
SPAWN_PROTECTION_BREAK  = On first shot fired (protection ends if you shoot)
SPAWN_DISTANCE_MIN      = 20 units from opponent
SPAWN_POINTS            = 4-6 per map, distributed across the map
SPAWN_SELECTION         = Farthest-from-opponent with ±1 random offset
```

**Spawn protection lasts 2 seconds or until you fire.** This prevents spawn-kills but doesn't allow spawn-camping IN protection (you can't shoot back risk-free forever).

### 8.2 Comeback Mechanics (Subtle)

Heavy comeback mechanics undermine competitive integrity. Light ones prevent blowouts from feeling hopeless:

1. **Resource respawn acceleration:** When the score gap is ≥5 kills, small health/armor pickups respawn 20% faster. This helps the losing player sustain but doesn't change the fundamental skill equation.
2. **Spawn weapon competitiveness:** The sidearm is deliberately viable enough that a player who just died (and lost their pickup weapon) isn't helpless. They can still compete while regearing.
3. **No score multipliers or damage buffs for losing players.** The comeback must come from skill, not mechanics.

```
COMEBACK_THRESHOLD       = 5 kill gap
COMEBACK_RESPAWN_ACCEL   = 0.80  (small pickups respawn at 80% of normal timer)
```

### 8.3 Visual & Audio Clarity

Borrowing from the CAVE school's "readability at density":

1. **Damage direction indicator:** On-screen arrow showing where damage came from. Fades over 1s.
2. **Distinct weapon audio:** Each weapon has a unique, learnable sound signature. Players should identify the weapon from sound alone.
3. **Kill feed:** Top-right, shows killer → weapon → victim for last 5 kills.
4. **Health/armor display:** Always visible, prominently placed. Color-coded (green → yellow → red).
5. **Hit confirmation:** Crosshair flash + sound on hit. Different sound for headshot vs body. 
6. **Death recap:** After dying, brief display showing: damage source, weapon, distance, your remaining HP at death.

### 8.4 Match Length Guardrails

Matches shouldn't drag or end too quickly:

- **Round timer (3 min):** If neither player reaches 15 kills, higher kill count wins the round. If tied, the round is a draw (neither player earns a round win) and an additional round is added.
- **Overtime:** If match score is 2-2, the final round has no kill limit — first to 15 or time, whichever comes first. If time expires with a tie, sudden death (next kill wins).
- **Maximum match duration:** ~18 minutes worst case (5 rounds × 3 min + transitions). Typical match: 10–12 minutes.

---

## 9. Technical Constraints (Browser)

### 9.1 Performance Budgets

```
TARGET_FPS            = 60 (minimum 30 for playability)
TICK_RATE_SERVER      = 64 Hz (server simulation rate)
TICK_RATE_CLIENT      = 60 Hz (client render/input rate)
UPDATE_RATE_NET       = 20 Hz (network update frequency — interpolate between)
INPUT_BUFFER          = 2 ticks (client-side prediction buffer)
MAX_LATENCY_PLAYABLE  = 150ms (above this, warn player)
MAX_LATENCY_REJECT    = 300ms (above this, pause match)
```

### 9.2 Netcode Approach

For browser WebSocket-based 1v1:

1. **Client-side prediction:** Client immediately applies movement locally, server validates
2. **Server reconciliation:** On server response, client corrects any prediction errors smoothly (interpolation, not snap)
3. **Lag compensation:** Server rewinds game state by client's ping to validate hits (favor-the-shooter within tolerance)
4. **Hit registration:** Server-authoritative, with lag compensation up to 150ms

```
LAG_COMPENSATION_MAX  = 150ms
INTERPOLATION_DELAY   = 50ms  (smooth out network jitter)
PREDICTION_TOLERANCE  = 2.0 units (snap correction if prediction diverges beyond this)
```

### 9.3 Three.js Rendering Considerations

- **Low-poly art style** to maintain 60fps on mid-range hardware
- **LOD system** for map geometry (not critical for small 1v1 maps but good practice)
- **Object pooling** for projectiles, particles, and decals
- **Baked lighting** with 1–2 dynamic lights (muzzle flash, explosions)
- **Instanced geometry** for repeated elements (pillars, crates, wall segments)

---

## 10. Balance Tuning Variables

All gameplay-critical values in one reference table for tuning:

### Player Stats
```yaml
HP_MAX: 100
ARMOR_MAX: 100
ARMOR_ABSORPTION: 0.66
MOVE_SPEED_WALK: 5.0
MOVE_SPEED_SPRINT: 7.5
MOVE_SPEED_CROUCH: 2.5
MOVE_SPEED_SLIDE: 6.0
SLIDE_DURATION: 0.6s
SPRINT_DURATION: 3.0s
SPRINT_COOLDOWN: 1.5s
JUMP_HEIGHT: 2.2
AIR_CONTROL: 0.35
STRAFE_MULTIPLIER: 1.05
HEADSHOT_MULTIPLIER: 2.0
```

### Weapons
```yaml
Sidearm:
  damage: 18
  headshot: 36
  fire_rate: 4/sec
  magazine: 12
  reload: 1.4s
  
Pulse_Rifle:
  damage: 12
  headshot: 24
  fire_rate: 10/sec
  magazine: 30
  reload: 2.0s
  
Scattergun:
  damage_per_pellet: 8
  pellets: 8
  fire_rate: 1/sec
  magazine: 6
  reload_per_shell: 0.5s
  spread_angle: 15°
  
Launcher:
  damage_direct: 80
  damage_splash_min: 20
  damage_splash_max: 50
  splash_radius: 5
  self_damage_mult: 0.5
  fire_rate: 1.2/sec
  magazine: 4
  reload: 2.5s
  projectile_speed: 15
  
Rail:
  damage: 70
  headshot: 140
  fire_rate: 0.67/sec
  reload: 1.5s (auto)
  tracer_duration: 0.5s
```

### Resources
```yaml
Health_Small:
  restore: 25
  respawn: 15s
  count_per_map: 4-6

Health_Mega:
  restore: 50
  respawn: 30s
  count_per_map: 1

Armor_Small:
  restore: 25
  respawn: 15s
  count_per_map: 2-3

Armor_Mega:
  restore: 50
  respawn: 30s
  count_per_map: 1

Weapon_Pickup:
  respawn: 20s
  count_per_map: 1 each type
```

### Match Rules
```yaml
Round_Time: 180s
Round_Kill_Limit: 15
Match_Format: Best of 5
Spawn_Protection: 2.0s
Spawn_Min_Distance: 20 units
Momentum_Threshold: [2, 4, 6] kills
Momentum_Speed_Bonus: 0.05
Momentum_Reload_Bonus: 0.10
```

### Matchmaking
```yaml
Rating_System: Glicko-2
Initial_Rating: 1500
Initial_RD: 350
Placement_Matches: 10
Queue_Window_Initial: ±100
Queue_Window_Expand: +50/15s
Queue_Timeout: 120s
```

---

## Appendix A: Design Rationale — Why These Numbers

### TTK Philosophy
The 0.8–1.5s body-shot TTK range was chosen to split the difference between tactical shooters (CS: ~0.3–0.5s) and arena shooters (Quake: ~1.5–3.0s). For a 1v1 browser game:
- Too fast (CS-like) → First-shot advantage dominates, feels random to new players
- Too slow (Quake-like) → Requires deep movement tech that's hard to learn in a browser context
- Our sweet spot → Fast enough to feel lethal, slow enough for outplay potential

### Weapon Count Philosophy
5 weapons (not 3, not 10):
- 3 is too few for strategic depth in weapon selection
- 10+ creates balance nightmares and makes each weapon less distinct
- 5 gives a clear archetype for each engagement range + a reliable fallback
- Each weapon can be thoroughly balanced with this count

### Map Count Philosophy
3 maps at launch (not 1, not 7):
- 1 map gets stale within a week
- 7+ maps scatter the player knowledge requirement too widely for a new game
- 3 maps give variety while allowing players to learn each one thoroughly
- Each map intentionally favors different skill axes

---

## Appendix B: Competitive Integrity Checklist

Before any change ships, verify:

- [ ] Does this change increase the gap between players of different skill levels? (Good)
- [ ] Does this change reduce randomness in determining the winner? (Good)
- [ ] Does this change create new decision points? (Good)
- [ ] Does this change make any weapon strictly better than another? (Bad)
- [ ] Does this change reduce the number of viable strategies? (Bad)
- [ ] Does this change make matches more uniform/predictable? (Bad)
- [ ] Does this change give unfair advantage to players with better hardware? (Bad)
- [ ] Does this change maintain "readability" — can players understand what happened and why? (Verify)

---

*"The casual player survives. The expert player scores. Both play the same game."*  
*— Adapted from the CAVE design philosophy, applied to competitive FPS.*
