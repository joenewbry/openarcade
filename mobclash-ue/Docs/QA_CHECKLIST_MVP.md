# QA Checklist (MVP Vertical Slice)

**Project:** MobClash (Unreal)  
**Focus:** Pre-dev QA guardrails for tonight’s vertical slice  
**Date:** 2026-03-03 (PST)

---

## 1) Board Movement Checklist

### A. Load + Spawn
- [ ] Board map loads from Main Menu -> **Start** without crash/hang.
- [ ] Creature pawn spawns in valid lane start point (no Z-fall / no overlap with blocking geometry).
- [ ] If RPG Monster Wave Bundle PBR is unavailable, placeholder mesh is used and blocker is logged.

### B. Lane Traversal
- [ ] Creature moves forward along assigned lane spline/nav path.
- [ ] Movement remains inside lane bounds (no drift into adjacent lane).
- [ ] Creature reaches lane endpoint and transitions to expected state (idle/despawn/next action).
- [ ] Multiple creatures in parallel lanes do not deadlock or push each other off-path.

### C. Stat-Driven Behavior (Distinct Characteristics)
- [ ] **Speed** differences are visible and measurable (fast creature arrival time < slow creature arrival time).
- [ ] **HP** differences are reflected in combat/validation logs.
- [ ] **Range** differences are reflected in engage distance and attack timing.
- [ ] Data table / config values match runtime behavior for at least 3 creature archetypes.

### D. Stability + Repro
- [ ] Run board movement sequence 10 times; no critical crash.
- [ ] Re-enter board map 3 times from menu; movement still initializes correctly.
- [ ] Verify no severe hitching during first creature spawn wave (baseline subjective check).

---

## 2) Menu Navigation Checklist

### A. Entry Flow
- [ ] Launch -> Main Menu appears within acceptable time.
- [ ] **Start** control is visible, selectable, and transitions to board map.
- [ ] Back/Cancel behavior returns to expected previous menu without soft lock.

### B. Input Coverage
- [ ] Keyboard navigation works (arrow/WASD + Enter/Esc) where intended.
- [ ] Mouse click targets align with visible buttons (no offset hitbox).
- [ ] (If controller wired) D-pad/stick focus and confirm/back behavior work.

### C. UX Guardrails
- [ ] Focus state is obvious (highlight/outline) for currently selected item.
- [ ] No duplicate button activations from single input press.
- [ ] Disabled/placeholder items are clearly labeled and non-interactive.

### D. Recovery
- [ ] From board map, returning to menu does not duplicate UI layers.
- [ ] Opening/closing menu repeatedly (5x) does not degrade responsiveness.

---

## 3) Progression Unlock Event Checklist

### A. Rank + Unlock Triggering
- [ ] Baseline rank value initializes correctly for new profile/session.
- [ ] Rank-up condition fires once per threshold crossing.
- [ ] Unlock event fires when rank requirement is met.
- [ ] Unlock does **not** fire when requirement is unmet.

### B. Data Integrity
- [ ] Unlock table placeholder keys resolve to valid in-game references.
- [ ] Duplicate unlocks are prevented (idempotent behavior).
- [ ] Save/reload preserves rank and unlocked state.

### C. Event + UI Signaling
- [ ] Player receives visible feedback for unlock (toast/modal/log).
- [ ] Event order is correct: rank update -> unlock grant -> UI feedback.
- [ ] Progression debug logs include rank, unlock id, timestamp.

### D. Negative/Edge Cases
- [ ] Invalid unlock row is handled gracefully (error logged, no crash).
- [ ] Rapid XP/rank gain does not skip intermediate unlock checks.
- [ ] Existing unlocked item remains unlocked after map transition.

---

## 4) Top 5 Risks (Severity + Mitigation)

| Risk | Severity | Why it matters tonight | Mitigation |
|---|---|---|---|
| 1) Lane movement desync (spline/nav mismatch) | **High** | Core vertical slice loop fails if creatures drift/stall | Lock one canonical movement path source; add debug lane gizmos + assertions for lane bounds |
| 2) Menu flow soft-lock between Start/Back transitions | **High** | Demo cannot reach board reliably | Add explicit state machine for menu states; test Start->Board->Back loop 10x |
| 3) Progression event double-fire or no-fire | **High** | Unlock credibility breaks; can block content validation | Enforce one-shot unlock guard by unlock id + rank threshold; add event tracing logs |
| 4) Data table mismatch (creature stats vs runtime) | **Medium** | “Distinct characteristics” requirement appears broken | Add quick stat verification command/log dump at spawn; validate 3 sample archetypes each run |
| 5) Asset dependency gap (RPG Monster Wave Bundle PBR missing/import issues) | **Medium** | Visual validation blocked, may delay movement checks | Use placeholder meshes immediately + log blocker in PM/GM updates; keep gameplay testable without final assets |

---

## 5) Exit Criteria for Tonight QA Sign-off
- [ ] Menu -> Board path is repeatable and stable.
- [ ] At least 3 creature archetypes show distinct speed/HP/range behavior in runtime.
- [ ] Rank + unlock trigger path validated with save/reload persistence check.
- [ ] No critical crash in 10-run smoke loop.
- [ ] Known blockers (if any) documented with owner + next action.
