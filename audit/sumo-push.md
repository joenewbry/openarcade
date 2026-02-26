# Audit: Sumo Push

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate(dt)`, `onDraw(r, t)`, `start()`.
- State machine: `waiting` -> any key -> `playing` -> match end -> `over` -> any key -> restart.
- `showOverlay` used at init and match end. `setScoreFn` wired.
- DOM refs (`score`, `aiScore`, `roundInfo`) guarded with null checks.
- Canvas 500x500, v2.html has all required elements and correct overlay.
- Physics system: friction, acceleration, max speed, collision resolution, edge resistance near ring border.
- Particle system for impacts and dodges.

## B) Playable?
**PASS**

- Controls: Arrows=Move, Space=Push, Z=Charge, X=Dodge. All documented in HTML.
- Best-of-5 match format with round transitions.
- Push mechanic requires stamina and proximity. Charged push does more damage.
- Dodge grants invincibility frames and reflects push force back at attacker.
- Stamina management is a real strategic element.
- AI makes decisions every 10-25 frames with reasonable tactics (edge avoidance, opportunistic pushing, dodge reactions).

## C) Fun?
**PASS**

- Physics feel good -- momentum-based pushing with edge resistance creates satisfying ring-out moments.
- Charge/push/dodge triangle creates rock-paper-scissors dynamics.
- Visual feedback is strong: impact particles, ring pulse, stun stars, stamina/charge bars.
- Best-of-5 format keeps sessions short but competitive.
- AI is challenging enough to be interesting without being unfair.

## Issues
- `setTimeout(() => { player.isPushing = false; }, 200)` (line 312) and similar for AI (line 443) -- uses real-time timeout instead of game-loop timer. If the game is paused or running at variable framerate, this could desync. Minor issue in practice.
- `input.isDown(' ')` for push means holding space continuously fires pushes as fast as the cooldown allows. Could be `wasPressed` to require re-pressing, but `isDown` with cooldown is a valid design choice.

## Verdict: PASS
Well-implemented fighting game with good physics, responsive controls, and satisfying gameplay.
