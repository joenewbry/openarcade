# Tank Puzzle Assault - Unity Project Setup

## Opening the Project

1. Download and install [Unity Hub](https://unity.com/download)
2. Launch Unity Hub and click "Add" under Projects
3. Select the `Unity` folder in this repository
4. Unity will automatically detect and load the project

## Building the Project

- In Unity Editor: Go to File > Build Settings
- Add Scenes from `Assets/Scenes/`
- Select your target platform (Windows, macOS, or Linux)
- Click "Build" and choose output location

## Running the Project

- In Unity Editor: Click the Play button in the top toolbar
- For standalone builds: Run the generated executable in your chosen output folder

## Project Structure

```
Unity/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/            # Core systems and interfaces
│   │   ├── Gameplay/        # Player and enemy controllers
│   │   ├── AI/              # AI behaviors and decision trees
│   │   └── UI/              # User interface elements
│   ├── Prefabs/             # Reusable scene objects
│   └── Scenes/              # Unity scene files
```

> All core architecture is defined in `Assets/Scripts/Core/`. Extend as needed following the interface patterns.

## Power-Up Implementation Notes

### Single held power-up slot (fairness)

- Tanks can hold **exactly one** queued power-up at a time.
- Supported held states are:
  - `None`
  - `Ricochet`
  - `Armor`
  - `BlockBuster`
- Held state auto-expires after `heldPowerupExpirySeconds` (default 12s).
- `TankControllerBase` is the source of truth for held state (`HeldPowerup`).

### Pickup behavior

- `RicochetPickup` queues Ricochet in the held slot.
- `ArmorBubblePickup` queues Armor and activates `ArmorBubbleShield`.
- `BlockBusterPickup` queues one breach shot.
- Any pickup is rejected while a tank already holds one (single-slot enforcement).

### Consumption behavior

- `BlockBuster` is consumed on next fired projectile and arms `TankProjectile.EnableBlockBusterBreach()`.
- `Ricochet` is consumed across a short charge budget (default 3 shots) and then clears.
- `Armor` clears when the shield absorbs a hit, or when held-state expiry is reached.

### HUD indicator

- `BlockBusterHudIndicator` now reflects the unified held slot state.
- It supports visuals for all four states:
  - **None**
  - **Ricochet**
  - **Armor**
  - **Block-Buster**
