# pm3-dev1 — Main Menu Shell + Navigation Wiring (MobClash Unreal)

Date: 2026-03-03 23:58 PST
Owner: PM3-DEV1

## Guard Checks (Namespace Policy)
- ✅ Path starts with `/Users/joe/dev/openarcade/mobclash-ue`
- ✅ Task references **MobClash + Unreal Engine**
- ✅ Asset dependency acknowledged: **RPG Monster Wave Bundle PBR (Fab / Unreal)** not required for menu shell; no blocker for this deliverable

## Completed

Implemented a C++ UMG menu shell that satisfies PM3-DEV1 scope:

1. **Main Menu button scaffold completed**
   - Play
   - Roster
   - Progress
   - Settings

2. **Navigation wiring completed**
   - Main -> Roster / Progress / Settings via `WidgetSwitcher`
   - Sub-screen Back -> Main
   - Main default focus -> Play button

3. **Play route map completed**
   - `RouteToLevel` map in `UMCMenuRootWidget`
   - Default route seeded: `PlayBoard -> L_BoardPrototype`
   - Uses `UGameplayStatics::OpenLevel` for level transition

4. **Startup integration shell completed**
   - Added menu-focused PlayerController and GameMode
   - Updated `DefaultEngine.ini` startup map/game mode entries

## Files Added

- `MobClash.uproject`
- `Config/DefaultEngine.ini`
- `Config/DefaultGame.ini`
- `Docs/MENU_UMG_SHELL.md`
- `Source/MobClash/MobClash.Build.cs`
- `Source/MobClash.Target.cs`
- `Source/MobClashEditor.Target.cs`
- `Source/MobClash/Public/UI/MCMenuTypes.h`
- `Source/MobClash/Public/UI/MCMainMenuWidget.h`
- `Source/MobClash/Private/UI/MCMainMenuWidget.cpp`
- `Source/MobClash/Public/UI/MCSubMenuWidget.h`
- `Source/MobClash/Private/UI/MCSubMenuWidget.cpp`
- `Source/MobClash/Public/UI/MCMenuRootWidget.h`
- `Source/MobClash/Private/UI/MCMenuRootWidget.cpp`
- `Source/MobClash/Public/Player/MCMenuPlayerController.h`
- `Source/MobClash/Private/Player/MCMenuPlayerController.cpp`
- `Source/MobClash/Public/Game/MCMenuGameMode.h`
- `Source/MobClash/Private/Game/MCMenuGameMode.cpp`

## Validation Notes

- Code-level wiring for required menu routes is in place.
- Unreal Editor asset step still required to create/assign UMG Widget Blueprints (`WBP_MenuRoot`, `WBP_MainMenu`, `WBP_Roster`, `WBP_Progress`, `WBP_Settings`) per `Docs/MENU_UMG_SHELL.md`.
- Final Play->Board runtime validation depends on existence of map assets:
  - `/Game/Maps/L_MainMenu`
  - `/Game/Maps/L_BoardPrototype` (or override route map entry)

## Handoff to PM3/PM1

- PM3-DEV2 can reuse `RouteToLevel` map for reliable Play->Board transition hardening.
- PM1 should confirm final board map name/path so `PlayBoard` route can be updated from placeholder.
