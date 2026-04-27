# FAB Integration — MobClash Unreal

Date: Tue 2026-03-03 23:41 PST  
Project Root: `/Users/joe/dev/openarcade/mobclash-ue`

## Goal
Import **RPG Monster Wave Bundle PBR** from Fab into the Unreal MobClash prototype, with a same-night fallback bootstrap path if Fab asset ingestion is blocked.

---

## 1) Primary Path (Fab) — RPG Monster Wave Bundle PBR

### Preflight
1. Confirm project path is correct: `/Users/joe/dev/openarcade/mobclash-ue`.
2. Confirm Unreal version supports Fab integration (UE5.x with Fab access).
3. Sign in with Epic account that owns/has access to the asset.
4. Ensure internet access and write permission to project `Content/`.

### Option A: In-Editor Fab flow (preferred)
1. Open the MobClash Unreal project.
2. Open **Fab** panel (Window/Tools > Fab, depending on UE version).
3. Search: `RPG Monster Wave Bundle PBR`.
4. Open asset page and **Add to Library** (if not already owned).
5. Click **Add to Project** (or equivalent import action).
6. Choose destination folder:
   - `Content/Fab/RPGMonsterWaveBundlePBR/`
7. Complete import and wait for shaders/materials to compile.

### Option B: Epic Launcher Fab Library flow
1. Open Epic Games Launcher > Fab Library.
2. Find `RPG Monster Wave Bundle PBR`.
3. Add/select target project: `mobclash-ue`.
4. Install/Add to project.
5. Re-open Unreal and verify assets appear in Content Browser.

### Post-import validation checklist
- Asset folder exists under `Content/Fab/RPGMonsterWaveBundlePBR/`.
- At least one monster skeletal/static mesh loads without missing references.
- Materials resolve (no persistent checkerboard/default gray).
- Place one monster in test level and run PIE.
- Confirm basic animation/pose and lane traversal compatibility.

---

## 2) Immediate Fallback Ingest Path (Prototype Bootstrap)

Use this path immediately if Fab asset is absent/blocked so PM1/PM2 can continue movement and readability testing tonight.

### Fallback source archives (local)
- `/Users/joe/Downloads/assethunts_gamedev_starter_kit_tanks_gltf_edition_v100.zip`
- `/Users/joe/Downloads/assethunts_gamedev_starter_kit_tanks_level_design_demo_v100.zip`

### Step A — Extract fallback packs
Extract to:
- `/Users/joe/dev/openarcade/mobclash-ue/Builds/FallbackAssets/`

Recommended structure:
- `Builds/FallbackAssets/Tanks_GLTF/`
- `Builds/FallbackAssets/Tanks_LevelDesignDemo/`

### Step B — Import GLTF pack directly into UE
1. In Unreal, enable required plugins if disabled:
   - **glTF Importer**
   - **Interchange Framework** (if required by engine config)
2. Restart editor if prompted.
3. Import `.glb` files from extracted GLTF pack into:
   - `Content/Fallback/TanksKit/`
4. Keep import settings lightweight (prototype-first):
   - Generate materials/textures automatically
   - Keep Nanite optional/off unless needed
   - Collision: simple/auto where practical

### Step C — Handle Level Design Demo archive
The level-design zip contains `.blend` demo scenes (not directly importable by UE in default setups).

1. Open `.blend` files in Blender.
2. Export needed meshes/scene chunks to `.fbx` or `.gltf/.glb`.
3. Import exports into Unreal folder:
   - `Content/Fallback/TanksLevelDemo/`
4. Use these as board dressing/layout references for prototype lanes.

### Step D — Bootstrap usage policy
- Use fallback assets as **temporary proxy visuals** for lane traversal and UI/readability tests.
- Do not block gameplay prototype on final art readiness.
- Once Fab monster pack is available, swap proxies with Fab assets and re-run validation.

---

## 3) Known Blockers / Risks

1. **Fab entitlement/login missing**
   - Symptom: asset not visible or Add-to-Project unavailable.
   - Impact: cannot ingest target monster bundle.
   - Mitigation: proceed with fallback GLTF ingest path; escalate account entitlement.

2. **Fab service/network issues**
   - Symptom: stalled downloads, missing packages.
   - Impact: delays in final visual pipeline.
   - Mitigation: continue prototype on fallback assets; retry Fab later.

3. **Plugin mismatch (glTF/Interchange disabled or incompatible)**
   - Symptom: `.glb` import unavailable/fails.
   - Impact: fallback ingest blocked.
   - Mitigation: enable plugins, restart UE, or convert in Blender to FBX.

4. **Level demo zip contains only .blend scenes**
   - Symptom: no direct import path in stock Unreal.
   - Impact: extra conversion step required.
   - Mitigation: export FBX/GLTF via Blender before UE import.

5. **Material/scale inconsistency between fallback and final Fab assets**
   - Symptom: visual mismatch or wrong unit scale.
   - Impact: temporary readability/placement drift.
   - Mitigation: treat as non-blocking for MVP; retune when Fab assets land.

---

## 4) Handoff Notes for PM/Dev
- Primary target remains: **RPG Monster Wave Bundle PBR (Fab)**.
- Fallback archives above are approved for immediate Unreal prototype bootstrap.
- Keep all fallback content namespaced under `Content/Fallback/` to simplify later replacement.
