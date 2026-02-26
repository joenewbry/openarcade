# Centipede Audit

## A) Works?
YES. Engine integration is clean. Arrow keys for movement, SPACE for auto-fire (hold). DOM refs `#score`, `#best`, `#lives` match v2.html. Canvas 480x600, grid is 24 columns by 30 rows at 20px cells. Centipede, spider, flea, and mushroom mechanics all implemented. `blendColor` helper handles particle alpha fading.

## B) Playable?
YES. Arrow keys move the player ship (restricted to bottom 7 rows). SPACE held down auto-fires with cooldown. Centipede moves in classic pattern: horizontal until hitting wall or mushroom, then drops a row and reverses. Shooting a segment splits the centipede. Spider weaves through player zone eating mushrooms. Flea drops from top leaving mushrooms when player area is sparse. Clearing all centipede segments spawns next wave with mushroom repair.

## C) Fun?
YES. Faithful to the classic Centipede formula. Good visual flair: mushrooms have dome/stem shapes, centipede has connected segments with head eyes/antennae and body legs animation, spider has 4 pairs of animated legs, flea has trail effect. Particles on hits. Score system matches classic (head=100, body=10, spider=distance-based 300/600/900, flea=200). Progressive difficulty with increasing segment count and flea speed per level.

## Issues Found
- **Minor**: No `best` score persistence across page loads (in-memory only).
- **Minor**: When centipede head wraps off bottom of screen (`s.y >= H`), it resets to y=0. This is functional but could be confusing visually -- standard behavior for the genre though.
- **Minor**: The `bulletHit` flag only breaks out of the inner centipede loop; the outer loop is also properly broken via the check after.

## Verdict: PASS
Excellent classic arcade port. Faithful mechanics, good visuals, fun progression with spider/flea enemies adding chaos.
