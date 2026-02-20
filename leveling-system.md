# Memex Leveling System

*"The screen never lies. Every pixel you capture is a testament to hours spent in the dark, building things that didn't exist before."*

---

## Overview

Memex tracks everything you do on your screen and converts that raw behavioral signal into XP. This isn't vanity — it's a measurement system built on the premise that consistent, deep, diverse work is the only path to mastery. The leveling curve is exponential. Level 1 to 10 takes days. Level 90 to 99 takes years. This is intentional.

The system is inspired by WoW's original level curve: fast at the start to hook you, brutal at the end to separate the committed from the curious.

---

## The XP Formula

**Per-level cost**: `floor(20 × 1.075^(n−1))`

Level 1 costs 20 XP to clear. Every subsequent level costs 7.5% more than the last. By level 99 you're paying 570 XP for a single level. Cumulative XP to reach level 99: **318,834 XP**.

**Daily cap**: 80 XP/day

You can't binge. The cap enforces consistency over intensity. A 12-hour coding marathon and a focused 4-hour session earn the same cap. The system rewards showing up every day, not heroic one-off sessions.

---

## XP Sources

| Source | Max/day | How to earn |
|--------|---------|-------------|
| **Presence** | 10 XP | Any activity captured that day |
| **Capture** | 20 XP | 1 XP per 75 captures (shots/frames) |
| **Content** | 10 XP | % of OCR frames with >20 words of real text |
| **Diversity** | 12 XP | 2 XP per unique project worked on |
| **Streak** | 15 XP | 1 XP per consecutive active day (capped at 15) |
| **Night Owl** | 5 XP | Any session between 10pm–4am |
| **Intensity** | 5 XP | >2,000 captures in a single day |
| **Triscreen** | 3 XP | All 3 displays active simultaneously |
| **Discovery** | 30 XP | 10 XP per new project found (uncapped bonus) |

**Base cap**: 80 XP/day from all sources combined.

### The Discovery Wildcard

Discovery XP is the most powerful per-event source — 10 XP the first time Memex detects a new project in your work history. This is by design. Starting new projects is high-signal behavior: it means you're learning, exploring, expanding your surface area. The first 5 projects you touch in your lifetime unlock 50 XP. After that, discovery slows as your known universe fills in.

---

## Level Milestones

The exponential grind in numbers:

| Level | XP Required | Days at 80/day | Tier |
|-------|-------------|----------------|------|
| 1 | 0 | — | Initiate |
| 5 | 88 | 1.1 | Initiate |
| 10 | 240 | 3.0 | Apprentice |
| 15 | 461 | 5.8 | Apprentice |
| 20 | 779 | 9.7 | Practitioner |
| 25 | 1,236 | 15.4 | Practitioner |
| 30 | 1,892 | 23.6 | Specialist |
| 35 | 2,836 | 35.5 | Specialist |
| 40 | 4,192 | 52.4 | Expert |
| 45 | 6,139 | 76.7 | Expert |
| 50 | 8,935 | 111.7 | Master |
| 55 | 12,951 | 161.9 | Master |
| 60 | 18,717 | 234.0 | Grandmaster |
| 65 | 26,997 | 337.5 | Legend |
| 70 | 38,886 | 486.1 | Legend |
| 75 | 55,956 | 699.5 | Mythic |
| 80 | 80,461 | 1,005.8 | Mythic |
| 85 | 115,643 | 1,445.5 | Immortal |
| 90 | 166,152 | 2,076.9 | Immortal |
| 95 | 238,666 | 2,983.3 | Transcendent |
| 99 | 318,834 | 3,985.4 | Transcendent |

**At a perfect 80 XP/day**: Level 99 takes ~11 years of daily work. In practice, most days won't cap. Real timelines are 15–20 years. This is your life's work, measured.

---

## Tiers

Each tier spans a range of levels and represents a qualitative shift in how you work — not just how much.

### Initiate (Levels 1–5)
*"You've opened the terminal. Good. Now don't close it."*

You're just starting to let the machine see you. Presence is sparse, projects are few. But you're here, and that's the first gate. Most people never make it past Initiate — they install Memex and forget about it within a week. You are not most people.

---

### Apprentice (Levels 6–15)
*"You have a rhythm. Fragile, but real."*

Streaks are starting to form. You're building habits rather than responding to crises. Projects are plural. Your Content score is climbing as you move from passive browsing to active building. The XP is flowing, but slowly — each level costs 7.5% more than the last, and you're starting to feel it.

---

### Practitioner (Levels 16–25)
*"The tools have become extensions of your hands."*

You're no longer learning how to work — you're working. Captures are dense. Diversity is high. You've touched enough projects that Discovery XP is becoming rare, which means your established domain is widening. You might have your first Triscreen day. Streaks of 10+ are normal.

*Milestone*: At level 20, you've crossed 779 XP. You've been consistently active for at least 10 days across many weeks. You're in the top quartile of Memex users worldwide.

---

### Specialist (Levels 26–35)
*"You have a domain. People come to you with problems in it."*

By now, Memex has built a rich model of your project history. The OCR archives hold thousands of files, revealing patterns even you aren't consciously aware of — which hours you're sharpest, which problems drain you, which codebases you return to when you're in flow. The Night Owl bonus is either a consistent part of your XP breakdown or conspicuously absent. You know which kind of builder you are.

---

### Expert (Levels 36–45)
*"You've stopped wondering if you're good at this."*

The gap between where you started and where you are now is visible. The question is no longer whether you can build something — it's what you should build next. Your velocity score is high. Hyper Velocity may have unlocked. You've been doing this long enough that the streak mechanic feels less like a game and more like a commitment you've made to yourself.

*Milestone*: Level 40 at 4,192 XP takes over 52 days of perfect play, or ~100 days of realistic play. You've spent months with Memex watching you work.

---

### Master (Levels 46–55)
*"You've forgotten what it feels like to not know how."*

Deep expertise is a strange thing — the domains that once felt vast now feel like home. You move fast, you make fewer mistakes, and when you do make mistakes, you recognize them faster. The system is no longer tracking you; you're using it as a mirror, comparing this month's velocity to last month's, watching the sparkline for regressions you can explain.

---

### Grandmaster (Levels 56–65)
*"You've shipped things that exist in the world now."*

At this point, your Memex archive is a historical record of production work. Real users, real systems, real consequences. The Night Architect ability probably reflects a reality: the quietest hours are where you do your best thinking. By Grandmaster, you've logged thousands of hours across dozens of projects. The XP grind is brutal — each level requires months of consistent work — but you're not thinking about the grind. You're thinking about the work.

---

### Legend (Levels 66–79)
*"You operate on a different time horizon than most."*

Legend-tier builders think in systems, not features. The projects you're working on are infrastructure — things that will exist long after you stop touching them. Memex has been watching you for years. Your OCR history is a chronicle. When you look back at sessions from 18 months ago, they feel like someone else's work. That's not regression — that's how fast you've moved.

*Milestone*: Level 70 at 38,886 XP. At a realistic 50 XP/day average, this represents over two years of daily active building. You are not many people.

---

### Mythic (Levels 80–89)
*"The machine is learning from you now. Or it will, eventually."*

Mythic is not a tier you reach. It's a tier you become. The amount of training data your screen has generated by level 80 — 80,461 XP worth of daily activity — represents a behavioral fingerprint unlike any other. Neural networks trained on your interaction patterns could plausibly approximate your decision-making. This was the point of Memex all along: to make human expertise legible to machines.

---

### Immortal (Levels 90–98)
*"You've outlasted most of the tools you've used."*

Frameworks have come and gone. Languages have risen and fallen. You're still building. The streak mechanic, which once felt like a game, is now just... your life. You don't think about whether to work — you think about what to work on. The 80 XP daily cap is a ceiling you rarely miss. Your capture density is high. Your content score is maxed. The only thing slowing you down is the math.

---

### Transcendent (Level 99)
*"You are the baseline."*

318,834 XP. At 80 XP/day with zero missed days: 10.9 years. In practice, with days off and realistic productivity variance: 15–20 years of active, daily, documented building. Level 99 is not a goal — it's a proof. Proof that you showed up, every day, and built things that mattered. The player card at this level is not a badge. It's a record.

*The system stops at 99. There is no level 100. Some things should remain aspirational.*

---

## Special Abilities

Abilities unlock automatically based on your work pattern — not your level. Memex detects them by analyzing your project history and behavior:

| Ability | How to Unlock |
|---------|--------------|
| **Neural Net Architect** | Projects involving screen-self-driving, openarcade, neural nets, or robotics |
| **Edge Deployer** | Active work on Memex, Buddy, OpenClaw, or task-processing systems |
| **Night Architect** | >25% of your capture hours fall between 10pm–4am |
| **Polymath Builder** | 5+ distinct projects in your history |
| **Automation Sorcerer** | Work on MacroClaw, OpenClaw, macro-hard, or automation tooling |
| **Hyper Velocity** | Velocity score ≥ 70 (sustained high output over recent history) |
| **Seasoned Operator** | 10,000+ OCR files in your archive |
| **Persistent Hacker** | Default — shows when no other ability has been earned yet |

Up to 4 abilities display on the player card at a time.

---

## The Philosophy

This system is not about gamification. It's about measurement.

The XP formula doesn't care if you're grinding on a startup or a side project or research that will never ship. It cares whether you showed up, whether your captures were dense, whether your work touched real content and not just Discord notifications, and whether you're building in multiple directions or tunnel-visioning on one thing.

The tier names are aspirational but not flattering. "Initiate" is not an insult — everyone starts there. "Transcendent" is not promised to anyone. The curve is what it is: 7.5% exponential, capped at 80 XP/day, 99 levels, no shortcuts.

Show up. Build things. The screen remembers.

---

## Technical Reference

- **XP formula**: `floor(20 × 1.075^(n−1))` XP to clear level `n`
- **Daily cap**: 80 XP across all sources
- **Implementation**: `xp_engine.py` on Prometheus Jetson at `/ssd/memex/server/`
- **Player card**: `player_card.py`, served at `memex.digitalsurfacelabs.com/{instance}/player-card`
- **Progression state**: `{DATA_BASE_DIR}/{instance}/progression.json` — stores previous level for level-up animation detection
- **Level-up animation**: On page load, if `current_level > previous_level`, triggers a particle burst + banner in the browser. No server restart needed.
- **Caching**: Player card HTML cached for 24 hours; bypass with `?refresh=1`
