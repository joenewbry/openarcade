# Capture the Flag Audit

## A) Works?
YES. Engine integration is correct. Uses mouse events on canvas for aiming/shooting/starting, keyboard for movement (WASD) and abilities (Q/E). DOM refs for scores/kills all match v2.html IDs. Class selection buttons wired up via `querySelectorAll('.class-btn')`. Map is 1200x800 with 600x400 viewport and camera follow.

## B) Playable?
YES. WASD movement, mouse aim + click to shoot, Q for class ability, E to pick up flag. 4v4 team game with AI teammates and opponents. AI has distinct roles (attacker, defender, medic support). Flag capture mechanics work: pick up enemy flag, return to own base to score. First to 3 captures wins. Respawn timer on death. Class selection (Scout, Heavy, Medic, Engineer) with different stats and abilities.

## C) Fun?
YES. Good tactical depth with 4 classes, each with a unique ability. AI is functional -- attackers go for flags, defenders patrol, medics heal. The minimap helps with situational awareness. Kill feed, HP bars, ability cooldown display, and capture progress indicators provide good feedback. Engineer turrets add strategic depth.

## Issues Found
- **Minor**: `mouseDown` is set true on click events but only set false on `mouseup`. If mouse leaves canvas while held, shooting continues until mouseup fires outside -- minor UX issue.
- **Minor**: `pendingMouseDown` array grows if clicks happen during non-playing states before they're consumed.
- **Minor**: Human flag pickup requires pressing E (while AI auto-picks up), which is documented in the overlay controls. This is intentional but could confuse players expecting auto-pickup.
- **Minor**: Kill feed uses hex color + alpha hex appended (e.g., `#4488ffcc`), which only works if the renderer supports 8-digit hex colors. Should work with WebGL renderer.
- **Minor**: No `best` score persistence (no localStorage).

## Verdict: PASS
Impressive scope for a browser game. Well-structured AI, good class variety, functional CTF mechanics with minimap and HUD.
