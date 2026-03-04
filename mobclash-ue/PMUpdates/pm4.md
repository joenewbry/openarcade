# PM4 — Progression / Unlocks (MVP)

Date: 2026-03-03  
Project: **MobClash (Unreal)**

## 1) Rank / XP / Unlock Table (MVP)

This is the initial progression shell for the prototype. Values are intentionally lightweight and can be rebalanced after first playtests.

| Rank | Title | Cumulative XP Required | XP to Next Rank | Unlock (MVP) |
|---|---|---:|---:|---|
| 1 | Rookie | 0 | 100 | Starter loadout (already owned) |
| 2 | Brawler | 100 | 150 | Creature Unlock: **Sproutling Scout** |
| 3 | Raider | 250 | 200 | Cosmetic Unlock: **Bronze Lane Banner** |
| 4 | Tamer | 450 | 250 | Creature Unlock: **Ember Pup** |
| 5 | Tactician | 700 | 300 | System Unlock: **Loadout Slot #2** |
| 6 | Warden | 1000 | 350 | Creature Unlock: **Moss Golem** |
| 7 | Hunter | 1350 | 400 | Cosmetic Unlock: **Profile Emblem: Claw Mark** |
| 8 | Commander | 1750 | 450 | Creature Unlock: **Storm Bat** |
| 9 | Champion | 2200 | 500 | Cosmetic Unlock: **Lane VFX: Arc Trail** |
| 10 | Warlord | 2700 | — | Creature Unlock: **Bone Hydra** + Prestige Placeholder |

### MVP XP Awards (for prototype testing)
- Match Win: **+100 XP**
- Match Loss: **+60 XP**
- First Match of Session Bonus: **+40 XP** (once per game launch)

---

## 2) Acceptance Criteria — Unlock Feedback After Match

### AC-01: Post-match XP Summary
**Given** a match ends, **when** results screen opens, **then** gained XP is shown numerically and progress bar animates from pre-match XP to post-match XP within 2.5s.

### AC-02: Rank-Up Visibility
If earned XP crosses a rank threshold, results flow must show:
1. Previous rank -> new rank
2. Rank-up callout (visual + SFX cue)
3. Updated rank badge in same results flow

### AC-03: Unlock Card Presentation
For each newly unlocked item, show an unlock card with:
- Item name
- Type (Creature/Cosmetic/System)
- Icon (or placeholder icon if asset pending)
- "Unlocked" state confirmation

### AC-04: Multi-Unlock Handling
If one match grants multiple rank-ups/unlocks, cards are queued and shown sequentially (next/continue). User can skip animation but cannot skip final state confirmation.

### AC-05: No-Unlock Case
If no unlock is gained, unlock card step is omitted and results continue normally (no empty modal).

### AC-06: Persistence
After leaving results screen and reopening the game/profile, unlocked items remain available and are not re-awarded.

### AC-07: Equip/Use Availability
Any newly unlocked creature/system feature is immediately selectable in loadout/menu after results flow completes.

### AC-08: Missing Asset Fallback
If a specific unlock asset/icon is missing, flow still completes with fallback icon/text and logs a non-fatal warning.

### AC-09: Input Compatibility
Unlock feedback flow is fully operable via mouse/keyboard and gamepad (focus order + confirm/back behavior).

### AC-10: Telemetry Eventing
On rank-up/unlock, emit telemetry event(s):
- `progression_rank_up`
- `progression_unlock_granted`
with player id, previous/new rank, unlock id, and match id.

---

## 3) Dev Subtask Assignments (pm4-dev1..pm4-dev4)

### pm4-dev1 — Progression Data Authoring
- Create progression data source (DataTable/DataAsset) with ranks 1–10 and unlock IDs.
- Define canonical unlock IDs and item types.
- Add config comments for quick rebalance.
- Deliverable: data file + short doc in `PMUpdates/dev/pm4-dev1.md`.

### pm4-dev2 — XP Award + Rank Resolution Logic
- Implement post-match XP grant pipeline (win/loss/bonus).
- Resolve rank transitions from pre-match XP -> post-match XP.
- Return list of newly unlocked IDs (including multi-threshold crossing).
- Deliverable: progression logic module + test notes in `PMUpdates/dev/pm4-dev2.md`.

### pm4-dev3 — Results UX: Rank/Unlock Feedback
- Build results-screen XP bar animation + rank-up callout.
- Implement unlock card sequence UI (single and multi-unlock cases).
- Add input support for KBM + gamepad.
- Deliverable: UI flow demo + edge-case checklist in `PMUpdates/dev/pm4-dev3.md`.

### pm4-dev4 — Persistence, Fallbacks, Telemetry, QA Hooks
- Persist unlocked state and prevent duplicate grants.
- Add fallback behavior for missing icons/assets.
- Emit telemetry events for rank-up and unlock grant.
- Provide debug command/test hook to simulate XP gains rapidly.
- Deliverable: integration notes + QA verification steps in `PMUpdates/dev/pm4-dev4.md`.

---

## Notes / Risks
- Final XP curve likely needs rebalance after first 5–10 internal playtests.
- Creature unlock IDs depend on content naming consistency from creature pipeline.
- If RPG Monster Wave Bundle PBR assets are delayed, placeholder visuals are acceptable for unlock cards in MVP.
