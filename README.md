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

### Block-Buster (breach shot)

- `BlockBusterPickup` grants one queued breach shot to a tank controller.
- Fairness guardrail: tanks can hold at most one offensive pickup at a time.
- Held offensive pickup auto-expires after `heldPowerupExpirySeconds` (default 12s).
- On the next fired projectile:
  - projectile is armed via `TankProjectile.EnableBlockBusterBreach()`
  - held state is consumed immediately
- On impact, a Block-Buster projectile destroys destructible cover (`DestructibleObject`) and then expires.

### HUD indicator

- `BlockBusterHudIndicator` listens to `TankControllerBase.BlockBusterReadyChanged`.
- Minimal states:
  - **Ready** visual when a breach shot is queued.
  - **Consumed** pulse when the queued breach shot is fired/expired.