# Genre: {{GENRE_NAME}}

**Status**: building
**Last Updated**: {{DATE}}
**Complexity**: {{COMPLEXITY}}
**Reference Image**: images/{{SLUG}}-reference.png

## Identity

{{IDENTITY_PLACEHOLDER}}

What defines this genre? What is the core player fantasy and motivation? What sub-genres exist?

List classic examples with analysis of WHY they work — what specific design decisions make them compelling.

## Core Mechanics (deep)

{{CORE_MECHANICS_PLACEHOLDER}}

Deep technical breakdown of the genre's core mechanics:
- Primary movement/interaction system
- Core game loop mechanics
- Collision/interaction detection approach
- Camera and viewport behavior
- Common mechanic variations with implementation notes
- Include actual constants, formulas, and pseudocode

## Design Patterns

{{DESIGN_PATTERNS_PLACEHOLDER}}

- Level/stage flow patterns
- Difficulty curve approaches with concrete examples
- Genre-specific anti-patterns and pitfalls
- What separates good from great in this genre
- Player psychology and engagement loops

## Tech Stack

{{TECH_STACK_PLACEHOLDER}}

Recommended technology choices with TECH annotations:
```
<!-- TECH: {"id": "library-id", "role": "category", "optional": true} -->
```

Detail when each technology is needed vs when simpler alternatives suffice.
Include performance considerations and object pooling strategies.

## Level Design Templates

{{LEVEL_DESIGN_PLACEHOLDER}}

- Layout patterns and spacing formulas
- Difficulty parameter ranges
- Procedural generation strategies
- Hand-crafted vs generated tradeoffs

## Visual Reference

{{VISUAL_REFERENCE_PLACEHOLDER}}

- Typical art styles with examples
- Color palette conventions
- Camera perspectives
- Key sprite/entity descriptions
- Animation requirements and frame counts
- Essential visual effects (particles, screen shake, flash)

![Reference](images/{{SLUG}}-reference.png)

## Audio Design

{{AUDIO_DESIGN_PLACEHOLDER}}

- Essential SFX list with descriptions
- Music style recommendations
- Web Audio API vs Howler.js vs Tone.js decision criteria
- Dynamic audio approaches

## Multiplayer Considerations

{{MULTIPLAYER_PLACEHOLDER}}

- Co-op patterns
- Competitive patterns
- Server requirements per mode
- Network sync challenges specific to this genre

## Generation Checklist

### Blocking (must decide before generation)

{{BLOCKING_CHECKLIST}}

- List every decision that cannot have a safe default
- The AI MUST resolve these with the user before code generation

### Defaultable (safe defaults exist)

{{DEFAULTABLE_CHECKLIST}}

- List decisions where reasonable defaults can be applied
- Include the default value for each

## From Design to Code

{{DESIGN_TO_CODE_PLACEHOLDER}}

How each of the 9 generation steps maps to this specific genre:

1. **html-structure**: Canvas/DOM setup, viewport, CSS foundation
2. **game-state**: Core state object, constants, configuration
3. **entities**: Player, enemies, objects, collectibles — all entity definitions
4. **game-loop**: Update tick, physics step, collision detection, state transitions
5. **rendering**: Draw calls, animation, visual effects, camera
6. **input**: Keyboard, mouse/touch, gamepad mappings
7. **ui-overlays**: HUD, menus, pause screen, game over
8. **audio**: SFX triggers, music loops, volume control
9. **recorder-integration**: Score tracking, replay data, session metadata

---

*This file was auto-generated from the genre template. Sections marked with {{PLACEHOLDER}} are filled collaboratively during the game design conversation.*
