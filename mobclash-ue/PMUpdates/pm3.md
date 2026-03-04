# PM3 — Menu/UX Plan (Tonight)

**Owner:** PM3 (Menu/UX)  
**Project:** MobClash Unreal  
**Scope tonight:** Deliver a usable front-end menu loop into board entry.

## 1) Menu Flow (Required)

```text
Main
 ├─ Play
 │   └─ Board (start match / board scene entry)
 ├─ Settings
 ├─ Roster
 └─ Progress
```

### Screen-by-screen intent

- **Main**
  - Primary hub with 4 clear options: Play, Settings, Roster, Progress.
  - Default focus lands on **Play**.

- **Play → Board**
  - Selecting Play transitions to Board entry.
  - If no blockers, user reaches board scene in one confirmation action.

- **Settings**
  - Basic options shell (audio, controls, display placeholders acceptable tonight).
  - Back returns to Main with focus preserved when possible.

- **Roster**
  - Shows current available units/heroes/cards list (placeholder data acceptable).
  - Back returns to Main.

- **Progress**
  - Shows player progression summary (level/XP/rank placeholders acceptable).
  - Back returns to Main.

---

## 2) Tonight Acceptance Criteria (Usable Menu)

Menu is **accepted tonight** when all criteria below pass:

1. **Launch path works**
   - App opens into **Main** menu without crash/hang.

2. **Core navigation works**
   - User can navigate Main options and open each screen: Settings, Roster, Progress.
   - User can return from each sub-screen back to Main.

3. **Play path works**
   - Selecting **Play** successfully enters **Board** scene (or board-loading handoff screen).

4. **Input support baseline**
   - Mouse/keyboard navigation works (click + confirm/back keys).
   - Controller support is a stretch for tonight unless already wired.

5. **Focus/selection clarity**
   - Current selected button/entry is visually obvious.

6. **No dead ends**
   - Every reachable menu screen has a functional back path.

7. **Stability baseline**
   - No critical errors in normal path: Main → each sub-screen → Main, and Main → Play → Board.

8. **Placeholder-friendly**
   - Settings/Roster/Progress can ship tonight with placeholder content if layout and navigation are functional.

---

## 3) Dev Subtasks (Assigned)

### pm3-dev1 — Main Menu Shell + Navigation Wiring
- Build Main screen with buttons: Play / Settings / Roster / Progress.
- Set default selection/focus behavior.
- Hook button events to route to target screens.
- Deliverable: Main menu blueprint/widget integrated in startup flow.

### pm3-dev2 — Play → Board Transition
- Implement Play action flow into board scene entry.
- Add lightweight loading/handoff state if scene load is not instant.
- Validate no-blocker transition from Main to Board.
- Deliverable: reliable Play-to-Board path.

### pm3-dev3 — Settings/Roster/Progress Screens + Back Flow
- Create each screen as functional shell (content can be placeholder).
- Ensure back action returns to Main correctly.
- Preserve/restore previous focus where feasible.
- Deliverable: all three screens reachable + escapable.

### pm3-dev4 — UX Polish + Smoke QA
- Add clear selected/hover/pressed visual states.
- Validate input baseline (mouse/keyboard required; controller optional stretch).
- Run smoke test matrix on full menu loop and log issues.
- Deliverable: pass/fail report against tonight acceptance criteria.

---

## 4) Notes / Risks

- If board scene is still unstable, fallback is a board-loading stub that proves transition wiring.
- Controller parity can be deferred if keyboard/mouse usability is complete tonight.
- Placeholder content is explicitly acceptable; navigation reliability is priority #1.
