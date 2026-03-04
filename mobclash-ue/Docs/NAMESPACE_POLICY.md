# MobClash Unreal Namespace Policy

## Canonical
- Project: MobClash
- Engine: Unreal Engine (Fab-compatible)
- Root: /Users/joe/dev/openarcade/mobclash-ue

## Required asset source
- RPG Monster Wave Bundle PBR (Fab / Unreal)

## Do not use
- Any Unity-only project paths for MobClash implementation
- Any `tank-royale` dashed prototype paths

## Naming
- Branches: mobclash-ue/<lane>-<task>
- PM updates: PMUpdates/pm1.md .. pm4.md
- Dev updates: PMUpdates/dev/pm<1-4>-dev<1-4>.md
- GM rollup: PMUpdates/gm-inbox.md

## Guard checks before each task
1) Path starts with `/Users/joe/dev/openarcade/mobclash-ue`
2) Mentions Unreal + MobClash
3) Mentions RPG Monster Wave Bundle PBR or logs blocker
