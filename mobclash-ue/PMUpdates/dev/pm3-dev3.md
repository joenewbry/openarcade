# pm3-dev3 — Settings Save/Load Runtime + Menu Wiring

Date: 2026-03-04 01:25 PST
Branch: `mobclash-ue/pm3-dev3-settings-save`
PR: https://github.com/joenewbry/openarcade/pull/90

## Completed
- Added settings data model stubs:
  - `FMCSettingsAudioData`
  - `FMCSettingsDisplayData`
  - `FMCSettingsControlsData`
  - `FMCPlayerSettingsData`
- Added persistence runtime:
  - `UMCSettingsSaveGame` (SaveGame payload)
  - `UMCSettingsSubsystem` (startup load + save/load API)
- Implemented startup load behavior:
  - `UMCSettingsSubsystem::Initialize()` calls `LoadSettings()`
  - Creates default slot `MC_PlayerSettings` when no prior save exists
- Hooked into existing menu shell settings route:
  - Opening Settings (`NavigateToScreen(Settings)`) triggers `LoadSettings()`
  - Backing out of Settings (`HandleSubMenuBackRequested(Settings)`) triggers `SaveSettings()`
- Updated `Docs/MENU_UMG_SHELL.md` with settings persistence route notes.

## Validation Steps
1. Launch project into main menu map (`L_MainMenu`).
2. Open **Settings** from the main menu.
3. Back out of **Settings** to main menu.
4. Close and relaunch the project.
5. Confirm no warnings/errors from settings load path and that slot `MC_PlayerSettings` exists.
6. (Optional BP check) Get `UMCSettingsSubsystem` from GameInstance and inspect `GetSettings()` values after relaunch to confirm persisted payload is available.

## Notes
- Runtime apply is intentionally stubbed in `ApplyRuntimeSettingsStubs()` so PM can wire actual audio/display/control UI bindings next without changing persistence scaffolding.
