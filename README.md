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

## 30x30 Tilemap Grid Prototype

`Assets/Scripts/Gameplay/TilemapGridSystem.cs` provides:

- A fixed **30x30** generated grid
- Randomized block placement using seeded RNG
- Runtime Tilemap creation when none is assigned
- Automatic camera fitting + grid snap to the orthographic camera view

Attach it to a GameObject with a `Grid` component and press Play.