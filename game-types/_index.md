# OpenArcade Game Type Index

A navigable index of all game genre knowledge base files. Each genre file contains comprehensive design guidance, technical requirements, and generation checklists for the game builder AI.

---

## Complete Genres (500+ lines, full knowledge base)

| Genre | File | Complexity | Key Tech |
|-------|------|-----------|----------|
| Platformer | [platformer.md](platformer.md) | Medium | Canvas 2D, Matter.js (optional) |
| Arcade Shooter | [arcade-shooter.md](arcade-shooter.md) | Medium | Canvas 2D, object pooling |
| Puzzle | [puzzle.md](puzzle.md) | Low-Medium | Canvas 2D or DOM |
| Roguelike | [roguelike.md](roguelike.md) | High | Canvas 2D, procedural generation |
| Tower Defense | [tower-defense.md](tower-defense.md) | Medium-High | Canvas 2D, pathfinding |
| Rhythm / Music | [rhythm-music.md](rhythm-music.md) | Medium-High | Canvas 2D, Tone.js |

## Stub Genres (basic structure, expandable)

| Genre | File | Complexity | Key Tech |
|-------|------|-----------|----------|
| Strategy / RTS | [strategy-rts.md](strategy-rts.md) | High | Canvas 2D, A* pathfinding |
| Racing | [racing.md](racing.md) | Medium | Canvas 2D / Three.js |
| Card / Board | [card-board.md](card-board.md) | Medium | DOM / Canvas 2D |
| Fighting | [fighting.md](fighting.md) | High | Canvas 2D, frame-precise loop |
| Sandbox | [sandbox.md](sandbox.md) | High | Canvas 2D / Three.js, Matter.js |
| FPS / 3D | [fps-3d.md](fps-3d.md) | Very High | Three.js, Cannon.js |
| Idle / Clicker | [idle-clicker.md](idle-clicker.md) | Low | DOM |
| Visual Novel | [visual-novel.md](visual-novel.md) | Low-Medium | DOM, Howler.js |

## Supporting Files

| File | Description |
|------|-------------|
| [_technologies.md](_technologies.md) | Master technology reference with TECHCARD annotations |
| [_template.md](_template.md) | Template for AI-generating new genre files |
| [images/](images/) | Grok-generated reference images per genre |

---

## How Genre Files Are Used

1. **During design conversation**: The AI loads the relevant genre file to provide deep, genre-specific guidance instead of generic advice.
2. **During tech stack selection**: TECH annotations in genre files inform automatic library selection.
3. **During generation**: The "From Design to Code" section maps each generation step to genre-specific patterns.
4. **Self-building**: When an unknown genre is encountered, `_template.md` is loaded and the AI collaboratively fills it in during the conversation.

## Adding New Genres

New genre files are created automatically when the game builder encounters a genre not in this index. The process:

1. AI detects no matching genre file exists (gap detection)
2. `_template.md` is loaded as the starting point
3. During the design conversation, the AI fills in genre-specific sections
4. Completed sections are saved to `game-types/{slug}.md`
5. The file graduates from "building" to "complete" status when all sections are filled

To manually add a genre:
1. Copy `_template.md` to `{slug}.md`
2. Replace all `{{PLACEHOLDER}}` values
3. Set status to `complete`
4. Add entry to this index
