# RICOCHET V1 - Toon Arena Shooter

🎮 **Browser-based 1v1 shooter where every bullet bounces!**

## 🚀 **GAME IS LIVE!**
**Local**: http://localhost:3000/  
**Network**: http://192.168.0.64:3000/

## 🎯 What We Built

### **Character Selection System**
- **12 Unique Characters** with distinct looks and personalities:
  - **Hazmat Squad**: Toxin, Poison, Reactor, Venom (chemical specialists)
  - **Soldier Division**: Crimson, Storm, Shadow, Ghost (military operatives)  
  - **Rebel Unit**: Desert, Neon, Ocean, Midas (wasteland warriors)

### **Matchmaking System**
- **Quick Play**: Jump into the newest available 1v1 match
- **Invite Friend**: Generate shareable link for private matches
- **Character Locked**: Each player picks their fighter before battle

### **Visual Style**
- **Toon Shooter Aesthetic**: Colorful, low-poly characters perfect for browser performance
- **Team Color System**: Each character base gets unique color variations
- **Clean UI**: Gradient backgrounds, smooth animations, professional look

## 🎨 Assets Used

### **Toon Shooter Game Kit** (Downloaded)
- **3 Base Character Models**: Hazmat, Soldier, Enemy
- **Complete Weapon Arsenal**: AK, SMG, Pistol, Revolver, Shotgun, Sniper, Rockets
- **Full Environment Kit**: Barriers, containers, crates, walls for arena building
- **Format**: glTF (web-optimized) with clean toon aesthetic

### **Character Color Variants**
Each base character gets 4 color variations:
```typescript
Hazmat: Yellow (Toxin), Green (Poison), Orange (Reactor), Purple (Venom)
Soldier: Red (Crimson), Blue (Storm), Black (Shadow), White (Ghost)  
Rebel: Brown (Desert), Pink (Neon), Teal (Ocean), Gold (Midas)
```

## 🛠️ Technology Stack

- **Three.js**: WebGL 3D rendering
- **TypeScript**: Type-safe development
- **Vite**: Fast bundling and dev server
- **glTF Loader**: Asset loading pipeline
- **Responsive Design**: Works on desktop and mobile browsers

## 🎮 How to Play

1. **Choose Your Fighter**: Click on any of the 12 characters
2. **Quick Play**: Join the newest 1v1 match instantly  
3. **Invite Friend**: Generate a link to battle specific opponents
4. **Every Bullet Bounces**: Master angles and arena control to win!

## 📁 Project Structure

```
ricochet-v1/
├── assets/                 # Toon Shooter Game Kit assets
│   ├── Characters/         # Hazmat, Soldier, Enemy models  
│   ├── Guns/              # Complete weapon collection
│   ├── Environment/       # Arena building blocks
│   └── Textures/          # Materials and textures
├── src/
│   └── main.ts            # Game engine and UI logic
├── index.html             # Game interface
└── package.json           # Dependencies
```

## 🚀 Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start development server  
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🎯 Game Features Implemented

- ✅ **Character Selection**: 12 unique fighters
- ✅ **Matchmaking Interface**: Quick play + invite system
- ✅ **3D Character Preview**: View your selected fighter
- ✅ **Asset Loading**: Toon Shooter Kit integration
- ✅ **Simple Arena**: Basic level with ricochet walls
- ✅ **Responsive UI**: Works across screen sizes

## 🚧 Next Steps

### **Immediate (Next Sprint)**
- **Ricochet Physics**: Implement bullet bouncing mechanics
- **Player Movement**: WASD + mouse look controls
- **Weapon System**: Integrate assault rifle from asset kit
- **Arena Enhancement**: Use environment kit for detailed levels

### **Enhanced Features**
- **Multiple Weapons**: Full arsenal from Toon Shooter Kit
- **Advanced Arenas**: Using all environment assets for variety
- **Real-time Networking**: WebSocket multiplayer
- **Sound Effects**: 3D spatial audio for shots and ricochets

## 🎨 Art Direction

**Style**: Clean toon aesthetic perfect for:
- **Visual Clarity**: Bright colors make ricochet trajectories obvious
- **Performance**: Low-poly models run smoothly in browsers  
- **Character Recognition**: Distinct silhouettes for each fighter type
- **Team Identification**: Color coding for multiplayer

## 💡 Design Philosophy

**"Every Bullet Bounces"** - The core mechanic that makes RICOCHET unique:
- **Tactical Depth**: Walls become weapons, angles matter
- **Accessibility**: Simple concept, infinite mastery
- **Visual Spectacle**: Bright tracers show ricochet paths
- **Arena Design**: Every surface is part of the strategy

---

**🎮 Ready to Battle! Choose your fighter and master the ricochet!** 🎯