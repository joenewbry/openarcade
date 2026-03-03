# MOVEMENT_WEAPON_FIX

## Scope
Focused runtime fixes for:
- movement deadlock / no movement after character select
- missing first-person weapon
- unclear pointer lock flow
- missing first-person body presence
- empty-looking map when arena assets fail

## Patch List

### 1) Movement reliability + input coverage
**Files:** `src/player-controller.ts`, `src/input-manager.ts`

- Decoupled movement from pointer-lock state:
  - Movement now uses `movementEnabled` and remains active even if pointer lock is not captured yet.
- Added explicit click-to-capture flow in `PlayerController`:
  - Left click attempts lock when playing and unlocked.
  - Pointer hint visibility tied to lock/unlock events.
- Added WASD + Arrow key support in movement axis logic:
  - right/left: `D`/`A` + `ArrowRight`/`ArrowLeft`
  - forward/back: `W`/`S` + `ArrowUp`/`ArrowDown`
- Improved keyboard handling in `InputManager`:
  - Tracks both `event.key` and `event.code` aliases (layout-safe).
  - Added `getAnyKey()` helper for multi-key bindings.
- Removed automatic pointer-lock request from `InputManager` click handler (prevents control contention).
- Fixed falling-through-ground behavior:
  - Ground raycast now filters to arena objects and ignores camera self-intersections.
  - Added safety Y clamp fallback at ground level to prevent infinite fall when collider misses.
- Tightened anti-wall pushback:
  - Only arena wall-tagged meshes are considered.
  - Ignores giant bounds (e.g., ground planes).

---

### 2) Crosshair + capture hint UX
**Files:** `index.html`, `src/main.ts`, `src/player-controller.ts`

- Added always-centered crosshair element (`#crosshair`).
- Added pointer lock hint element (`#pointer-lock-hint`):
  - Text: `Click to capture mouse • WASD / Arrow Keys to move`
- Hint is shown when playing + unlocked, hidden when locked/menu.
- Crosshair visibility toggled with gameplay state in `main.ts`.

---

### 3) First-person weapon visibility reliability
**Files:** `src/weapon-ak.ts`, `src/main.ts`

- AK loader now tries known paths in order:
  1. `./assets/Guns/glTF/AK.gltf`
  2. `./assets/Toon Shooter Game Kit - Dec 2022/Guns/glTF/AK.gltf`
- Weapon is attached directly to the **camera** (first-person view model behavior).
- Added dedicated first-person render layer (`layer 1`) and enabled it on camera.
- Forced viewmodel materials to render reliably in FP:
  - `depthTest=false`, `depthWrite=false`, high `renderOrder`.
- Muzzle flash attached to weapon model with local offset and same FP layer.
- Recoil behavior preserved (kick + recovery still active).
- Prevented accidental firing while unlocked:
  - left-click fire now requires pointer lock in `main.ts`.

---

### 4) Visible first-person body proxy
**File:** `src/main.ts`

- Added `ensureFirstPersonBodyProxy()`:
  - Creates simple FP arms/sleeves proxy geometry attached to camera.
  - Rendered on FP layer for reliable visibility.
- Proxy visibility toggled with gameplay state.

---

### 5) Arena rendering + fallback geometry
**Files:** `src/arena-warehouse.ts`, `src/arena-containers.ts`

- Fixed broken environment asset base path:
  - from `./assets/Toon Shooter Game Kit - Dec 2022/Environment/glTF/`
  - to `./assets/Environment/glTF/`
- Added robust fallback geometry if any GLTF fails per object:
  - Creates box-based proxy with size/color by asset type (container/wall/crate/debris).
  - Tagged as arena/wall to keep collision and gameplay functional.
- Ground materials switched to `MeshStandardMaterial` for compatibility.

---

### 6) Character asset path fallback
**File:** `src/main.ts`

- Character loader now tries:
  1. `./assets/Characters/glTF/...`
  2. `./assets/Toon Shooter Game Kit - Dec 2022/Characters/glTF/...`

---

## Test Steps (Concrete)

1. Start app and select any character.
2. Click **Quick Play**.
3. Confirm in-game HUD appears and **crosshair** is visible.
4. Without clicking to lock yet:
   - Press `WASD` and verify movement works.
   - Press Arrow keys and verify movement works.
5. Verify hint appears when unlocked:
   - `Click to capture mouse • WASD / Arrow Keys to move`
6. Click game viewport once:
   - Hint should hide, mouse look should engage.
7. Verify first-person visuals:
   - AK weapon visible in front-right of camera.
   - FP body proxy arms/sleeves visible lower screen.
8. Fire and reload checks:
   - Left click fires (while locked), ammo count decreases.
   - Press `R` reloads.
   - Recoil still animates weapon.
9. Arena validation:
   - Map contains visible structures.
   - If any GLTF fails, fallback block geometry still appears (no empty arena).
10. Switch map (`M`) and repeat quick movement + visibility checks.

---

## 04:08 Ground/Collision Hotfix Addendum

- Added **always-collidable ground** in both arenas:
  - visible ground planes are now `DoubleSide`
  - added hidden collision slab with top face at `y=0`
- Updated `PlayerController` ground logic:
  - near probe + far recovery probe
  - ground snap using eye height (`1.6`)
  - hard floor clamp at `y=1.6`
- Removed camera/controller desync patterns:
  - gameplay spawn, respawn, and map switch now use `playerController.setPosition(...)`
  - no extra direct camera position writes in gameplay flow

## Notes
- Changes are intentionally minimal and runtime-focused for demo stability.
- No broad architecture refactor was introduced.
