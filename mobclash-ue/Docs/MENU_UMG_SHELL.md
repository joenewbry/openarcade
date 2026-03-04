# MobClash UMG Menu Shell (PM3-DEV1)

This implementation adds C++ menu-shell scaffolding for Unreal UMG with the required flow:

- Main Menu buttons: **Play / Roster / Progress / Settings**
- Sub-screens: **Roster / Progress / Settings** each with Back path to Main
- Navigation map route: **Play -> `L_BoardPrototype`** level (placeholder board target)

## C++ classes added

- `UMCMainMenuWidget` (`Source/MobClash/Public/UI/MCMainMenuWidget.h`)
  - Emits events for Play and submenu navigation.
- `UMCSubMenuWidget` (`Source/MobClash/Public/UI/MCSubMenuWidget.h`)
  - Reusable shell for Roster / Progress / Settings with Back event.
- `UMCMenuRootWidget` (`Source/MobClash/Public/UI/MCMenuRootWidget.h`)
  - Owns widget switching and route-to-level map.
- `AMCMenuPlayerController`
  - Spawns menu root widget and enables UI input mode.
- `AMCMenuGameMode`
  - Menu map GameMode using the menu player controller.

## Route map behavior

`UMCMenuRootWidget::RouteToLevel` is a `TMap<EMCMenuScreen, FName>`.

Default route bootstrapped in `NativeConstruct`:
- `PlayBoard -> L_BoardPrototype`

You can override this in the root widget blueprint instance if PM1 ships a different board map name.

## Blueprint wiring (Editor)

1. Create widget blueprint `WBP_MenuRoot` deriving from `UMCMenuRootWidget`.
2. Add `WidgetSwitcher` named `ScreenSwitcher`.
3. Add 4 child widgets to switcher in this order:
   1. `WBP_MainMenu` (derived from `UMCMainMenuWidget`)
   2. `WBP_Roster` (derived from `UMCSubMenuWidget`, `ScreenId=Roster`)
   3. `WBP_Progress` (derived from `UMCSubMenuWidget`, `ScreenId=Progress`)
   4. `WBP_Settings` (derived from `UMCSubMenuWidget`, `ScreenId=Settings`)
4. In `WBP_MainMenu`, add and name buttons exactly:
   - `PlayButton`
   - `RosterButton`
   - `ProgressButton`
   - `SettingsButton`
5. In each submenu widget, add:
   - `BackButton`
   - `HeaderText`
6. Assign `MenuRootWidgetClass` on `AMCMenuPlayerController` (or menu map PC override) to `WBP_MenuRoot`.

## Startup map + gamemode

`Config/DefaultEngine.ini` now points startup to:
- `GameDefaultMap=/Game/Maps/L_MainMenu`
- `GlobalDefaultGameMode=/Script/MobClash.MCMenuGameMode`

Create `L_MainMenu` and `L_BoardPrototype` maps in Content Browser to complete the runtime path.

## Blockers / dependencies

- Board map handoff target is placeholder until PM1 finalizes board map asset path.
- RPG Monster Wave Bundle PBR is not required for menu shell itself; if not imported yet, this task remains unblocked.
