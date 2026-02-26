# Game Design Seed Checklist

## Purpose
This file is the reusable seed used before implementation to keep game design books consistent, reviewable, and decision-complete.

## Source Inputs
- OpenArcade internal checklist baseline (`game-design-guide.md`)
- MDA framework (Mechanics, Dynamics, Aesthetics)
- Schell-style lens review mindset (player experience, clarity, challenge)

## Gate A: Concept and Audience
- [ ] Working title and one-line pitch
- [ ] Genre and subgenre
- [ ] Target audience and session length
- [ ] Success criteria for "fun" and "clarity"
- [ ] Comparable games (at least 3)

## Gate B: Mechanics Core
- [ ] Core loop defined in 3-5 steps
- [ ] Input map fully specified
- [ ] Win and fail conditions
- [ ] Scoring model and rewards
- [ ] Resource systems (ammo, lives, economy, cooldowns)

## Gate C: Progression and Pacing
- [ ] Difficulty curve model (waves/levels/acts)
- [ ] Introduction-then-recombination enemy plan
- [ ] Mini-boss and final boss cadence
- [ ] Upgrade drop cadence and balancing guardrails
- [ ] First 30-second onboarding behavior

## Gate D: Visual Direction
- [ ] Art style and resolution target
- [ ] Color script per level/campaign
- [ ] Silhouette readability rules for player/enemy/projectiles
- [ ] Terrain and ambience layers
- [ ] UI/HUD style and legibility constraints

## Gate E: Content Production Checklist
- [ ] Planes/characters sheet
- [ ] Enemy compendium sheet
- [ ] Boss sheet
- [ ] Power-up sheet
- [ ] Level/campaign board set
- [ ] HUD/context screenshot set

## Gate F: Narrative and UX
- [ ] Intro brief per chapter/level
- [ ] Mid-level callouts for mechanic shifts
- [ ] Boss warnings and weak-point hints
- [ ] Post-level debrief and reward summary

## Gate G: Technical Spec Completeness
- [ ] Public interfaces/files/modules listed
- [ ] Data schemas and content manifests defined
- [ ] Edge cases/failure modes listed
- [ ] Acceptance tests enumerated
- [ ] Rollout and iteration loop documented

## Gate H: Review Outputs
- [ ] Markdown design book complete
- [ ] Markdown mechanics spec complete
- [ ] HTML-rendered browseable versions generated
- [ ] Visual asset gallery linked and validated
- [ ] Broken asset/path check passed

## Design Book Chapter Skeleton
1. Vision and Player Promise
2. Core Mechanics
3. Progression and Pacing
4. Visual Direction and Color Script
5. Content Catalog (planes, enemies, bosses, power-ups)
6. UX and Narrative Delivery
7. Technical Interfaces and Data Contracts
8. Test Plan and Acceptance Criteria
9. Competitive Inspiration and Applied Takeaways
10. Iteration Log

## Notes for AI Workflow
- Keep markdown as the source of truth.
- Generate HTML from markdown after each major update.
- Use this checklist as a pass/fail gate before implementation or major rewrites.
