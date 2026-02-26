# Dino Run - Audit

## A) Works?
**PASS** - Uses engine API correctly: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. DOM elements `#score`, `#best`, `#overlay`, `#overlayTitle`, `#overlayText` all present. Canvas is 600x300. `setScoreFn` is called. Clean ES module export with `createGame()`.

## B) Playable?
**PASS** - Space/ArrowUp to jump, ArrowDown to duck. Ducking while jumping causes fast fall. Two obstacle types: cacti (ground, varying sizes) and pterodactyls (two flight heights requiring different dodge strategies). Speed progressively increases over time (`4 + min(frameCount/600, 5)`). Collision detection uses AABB with fairness padding (4px inset). Score accumulates continuously based on distance traveled.

## C) Fun?
**PASS** - Clean Chrome Dino clone with additions. Pterodactyls at two heights add strategic depth -- head height requires ducking, mid height allows jumping or ducking. Progressive speed ramp creates escalating tension. Fast-fall mechanic (hold down during jump) adds skill expression. Visual polish includes scrolling starfield, ground texture parallax, cactus arms detail, pterodactyl wing animation, and running leg animation. The dino sprite has good character with eyes, mouth, arms, and tail detail.

## Issues
- **Minor**: `best` is not persisted to localStorage.
- **Minor**: Obstacle spawn gap calculation (`minGap = max(80, 160 - speed * 8)`) could theoretically create impossible situations at very high speeds, but the speed cap of 9 keeps minGap at 80px which is still jumpable.
- **Minor**: No visual feedback on near-misses or milestone scores (e.g., no flash at 100-point intervals like the original Chrome game).

## Verdict: PASS
