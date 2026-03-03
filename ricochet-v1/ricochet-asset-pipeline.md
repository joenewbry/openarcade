# RICOCHET Asset Pipeline Documentation

## Overview
Comprehensive breakdown of all visual components needed for RICOCHET, based on the Toon Shooter Game Kit we're using.

---

## 🎮 UI/UX Screens & Components

### **Main Menu System**
- **Character Selection Grid**: 4x3 layout showcasing 12 fighters
- **Menu Backgrounds**: Gradient overlays with animated effects  
- **Character Cards**: Preview, name, description, selection states
- **Action Buttons**: Quick Play, Invite Friend with hover effects

### **In-Game HUD Elements** 
- **Health Bar**: Animated health indicator (top-left)
- **Ammo Counter**: Current clip / total ammo display
- **Crosshair**: Dynamic crosshair that changes with weapon
- **Hit Markers**: Visual feedback for successful hits
- **Damage Direction**: Red screen edges indicating damage source
- **Low Health Effect**: Screen vignetting when health is critical
- **Kill Feed**: Recent elimination notifications
- **Score Display**: Current match score (frags/rounds)

### **Session & Matchmaking**
- **Loading Screens**: Arena loading with character preview
- **Matchmaking Lobby**: Waiting for opponent, character display
- **Invite Link Generator**: Shareable URL creation interface
- **Connection Status**: Network quality indicators

### **Post-Match UI**
- **Victory/Defeat Screen**: Match results with statistics
- **Scoreboard**: Detailed match performance metrics
- **Rematch Options**: Play again, change character, return to menu
- **Leaderboard**: Global rankings display (future feature)

---

## 👥 3D Character System

### **First-Person Arms (Player View)**
Using Toon Shooter Kit character models as base:

**Technical Specs:**
- **Polygon Count**: 3,000-5,000 triangles
- **Bone Structure**: 24-bone hand/arm rig
- **Texture Resolution**: 1024x1024 diffuse + normal maps
- **Animation Set**: 15 core animations

**Required Animations:**
- Idle: Breathing/weapon steady
- Walking: Arm sway while moving
- Running: Faster movement animation  
- Jump: Landing and takeoff poses
- Fire: Weapon recoil and muzzle flash sync
- Reload: Magazine change sequence
- Switch Weapon: Holster/draw transitions
- Melee: Knife/punch attacks
- Hit React: Taking damage animations
- Death: Player elimination sequence

### **Third-Person Character Models (Opponent View)**
**The 12 Character Variants:**

#### **Hazmat Squad** (Base: Character_Hazmat.gltf)
1. **Toxin** - Yellow (#FFD700) - Chemical Specialist
2. **Poison** - Green (#32CD32) - Bio Warfare Expert  
3. **Reactor** - Orange (#FF4500) - Nuclear Engineer
4. **Venom** - Purple (#9370DB) - Toxic Avenger

#### **Soldier Division** (Base: Character_Soldier.gltf)  
5. **Crimson** - Red (#DC143C) - Assault Specialist
6. **Storm** - Blue (#4169E1) - Tactical Leader
7. **Shadow** - Black (#2F2F2F) - Stealth Operative
8. **Ghost** - White (#F5F5F5) - Arctic Commando

#### **Rebel Unit** (Base: Character_Enemy.gltf)
9. **Desert** - Brown (#CD853F) - Wasteland Warrior
10. **Neon** - Pink (#FF1493) - Cyber Punk  
11. **Ocean** - Teal (#20B2AA) - Sea Raider
12. **Midas** - Gold (#FFD700) - Treasure Hunter

**Technical Implementation:**
- **LOD System**: 3 detail levels (High/Medium/Low: 8K/4K/2K tris)
- **Bone Count**: 30-bone full body rig
- **Texture Variants**: Color-shifted materials per character
- **Animation Set**: 12 movement animations per character

**Character Animations:**
- Idle: Character personality poses
- Walk/Run: Movement with character-specific style
- Jump: Acrobatic movements
- Combat: Shooting stances and recoil
- Hit React: Damage response animations  
- Death: Character-specific elimination sequences
- Victory: Win celebration poses
- Emotes: Character personality expressions (future)

### **Character Rigging Specifications**

**Bone Hierarchy:**
```
Root
├── Hips
│   ├── Spine1 → Spine2 → Spine3
│   │   ├── Neck → Head
│   │   ├── LeftShoulder → LeftArm → LeftForearm → LeftHand
│   │   └── RightShoulder → RightArm → RightForearm → RightHand
│   ├── LeftUpLeg → LeftLeg → LeftFoot
│   └── RightUpLeg → RightLeg → RightFoot
```

**IK Targets:**
- Foot IK for terrain adaptation
- Hand IK for weapon attachment
- Look-at IK for head tracking

---

## ⚔️ Weapon System Assets

### **From Toon Shooter Kit:**
Available weapon models in glTF format:

#### **Primary Weapons**
- **AK.gltf** - Assault rifle (balanced damage/rate)
- **SMG.gltf** - Submachine gun (high rate, low damage)  
- **Shotgun.gltf** - Close-range spread weapon
- **Sniper.gltf** + **Sniper_2.gltf** - Long-range precision

#### **Secondary Weapons**  
- **Pistol.gltf** - Standard sidearm
- **Revolver.gltf** + **Revolver_Small.gltf** - High damage sidearms

#### **Heavy Weapons**
- **RocketLauncher.gltf** - Area damage launcher
- **GrenadeLauncher.gltf** - Explosive projectiles
- **ShortCannon.gltf** - Heavy artillery

#### **Melee/Utility**
- **Knife_1.gltf** + **Knife_2.gltf** - Melee weapons
- **Grenade.gltf** + **FireGrenade.gltf** - Throwable explosives

### **Weapon Model Specifications**

**First-Person Weapons:**
- **Polygon Count**: 3,000-5,000 triangles per weapon
- **Texture Resolution**: 1024x1024 PBR materials
- **Attachment Points**: Muzzle, scope, magazine positions
- **Animation Bones**: 5-8 bones for moving parts

**Third-Person/World Weapons:**  
- **Polygon Count**: 1,000-2,000 triangles (simplified)
- **World Pickups**: 500-1,500 triangles (further simplified)
- **Texture Sharing**: Shared atlas to reduce memory

**PBR Material Setup:**
- **Diffuse**: Base color and markings
- **Normal**: Surface detail and wear  
- **Metallic**: Metal vs. plastic surfaces
- **Roughness**: Surface finish variation
- **Emission**: Glowing elements (scopes, LEDs)

---

## 🏟️ Arena Environment System

### **From Toon Shooter Kit Environment Assets:**

#### **Structural Elements**
- **Barrier_Fixed.gltf** / **Barrier_Large.gltf** - Cover walls
- **BrickWall_1.gltf** / **BrickWall_2.gltf** - Arena boundaries  
- **Container_Long.gltf** / **Container_Small.gltf** - Strategic cover

#### **Interactive Objects**
- **Crate.gltf** - Destructible boxes
- **CardboardBoxes_1-4.gltf** - Varied box stacks
- **BearTrap_Open/Closed.gltf** - Environmental hazards

#### **Atmospheric Clutter**  
- **Debris_BrokenCar.gltf** - Large set pieces
- **Debris_Papers_1-3.gltf** - Small atmospheric details
- **Debris_Pile.gltf** - Scattered materials

### **Arena Construction**

**Total Polygon Budget**: 50,000-100,000 triangles per arena
**Modular Design**: Pieces snap together for arena variety

**Arena Layout Principles:**
- **Cover Placement**: Barriers every 3-5 meters
- **Ricochet Surfaces**: Angled walls for bullet bouncing
- **Pickup Locations**: Weapon spawns on contested ground
- **Sight Lines**: Balanced long-range and close-combat areas

### **Lighting & Materials**

**Material Library (7 PBR Materials):**
1. **Concrete**: Arena floors and basic walls
2. **Metal**: Barriers and industrial elements  
3. **Wood**: Crates and organic elements
4. **Fabric**: Tarps, covers, and soft materials
5. **Glass**: Windows and transparent surfaces
6. **Plastic**: Modern/sci-fi elements
7. **Dirt**: Ground variation and weathering

**Lighting Setup:**
- **1 Directional Light**: Primary shadow-casting sun
- **1 Hemisphere Light**: Ambient fill lighting  
- **2-4 Point Lights**: Accent lighting for mood
- **Dynamic Shadows**: Real-time shadow mapping

**Skybox System:**
- **Simple Gradient Sky**: Optimized for performance
- **Cloud Sprites**: Animated background elements
- **Time-of-Day**: Different lighting moods per arena

---

## ✨ VFX & Particle Systems

### **Core Effect Systems**

#### **Weapon Effects** 
- **Muzzle Flash**: Bright sprite with rapid fade
- **Bullet Tracers**: Line renderers showing ricochet paths
- **Impact Sparks**: Metal vs. concrete hit differences
- **Ricochet Trails**: Glowing paths showing bullet bounces
- **Explosion Effects**: Rocket/grenade blast visuals

#### **Player Feedback**
- **Hit Indicators**: Damage number pop-ups
- **Health Regeneration**: Glowing edge effect
- **Low Health Warning**: Screen pulse and vignette
- **Movement Trails**: Dash/jump effect enhancement
- **Pickup Respawn**: Glowing spawn-in animation

### **Custom GPU Particle System**

**Performance Budget**: <2ms per frame for all effects
**Particle Limits**: 1,000 active particles maximum

**Effect Specifications:**
```javascript
MuzzleFlash: {
  particles: 50,
  lifetime: 0.1 seconds,
  sprite: 64x64px,
  blend: additive
}

BulletTracer: {
  type: line_renderer,
  width: 2px,
  color: weapon_specific,
  fade: 0.5 seconds
}

ImpactSparks: {
  particles: 20-30,
  lifetime: 0.3 seconds,
  physics: simple_gravity,
  materials: surface_specific
}
```

### **Post-Processing Pipeline**

**Effect Stack:**
1. **Bloom**: Weapon flashes and glowing elements
2. **FXAA**: Anti-aliasing for smooth edges
3. **Vignette**: Health/damage visual feedback  
4. **Color Grading**: Arena mood enhancement

**Performance Target**: <2ms total post-processing time

---

## 🎵 Audio Asset Requirements

### **3D Spatial Audio System**

**Sound Categories:**
- **Weapon Audio**: Fire, reload, impact sounds per weapon
- **Movement**: Footsteps, jumps, landing on different materials
- **Environmental**: Arena ambience, ricochet pings
- **UI Audio**: Menu clicks, notifications, feedback
- **Music**: Dynamic background music system

**Technical Specifications:**
- **Format**: WebM (Opus codec) for web optimization
- **Sample Rate**: 44.1kHz for compatibility  
- **3D Audio**: Binaural/HRTF processing
- **Compression**: Optimized for bandwidth

### **Weapon Sound Design**
Each weapon from Toon Shooter Kit needs:
- **Fire Sound**: Unique audio signature
- **Reload Sound**: Magazine/chamber sounds
- **Impact Audio**: Surface-specific ricochet pings
- **Empty Chamber**: Dry fire feedback

---

## 📊 Performance & Optimization

### **Rendering Budget Breakdown** 
```
Total Frame Time: 16.67ms (60 FPS)
Used: 15.7ms (94% efficiency)

Geometry Rendering: 8.2ms
Particle Effects: 1.8ms  
Post-Processing: 1.9ms
Physics Simulation: 1.2ms
UI Rendering: 0.8ms
Audio Processing: 0.5ms
Game Logic: 1.3ms
Buffer: 0.9ms
```

### **Draw Call Budget**
- **Environment**: 15-25 draw calls
- **Characters**: 4-6 draw calls (2 players x LOD)
- **Weapons**: 2-4 draw calls
- **Particles**: 8-12 draw calls
- **UI**: 3-5 draw calls
- **Total**: 23-42 draw calls (well under WebGL limits)

### **Memory Budget**
- **Textures**: 8-16MB compressed
- **Geometry**: 2-4MB  
- **Audio**: 1-2MB
- **Code**: 1MB
- **Total**: 12-23MB (mobile-friendly)

---

## 💰 Asset Procurement Strategy

### **Current Assets: Toon Shooter Game Kit**
- **Cost**: Already purchased  
- **License**: Commercial use allowed
- **Format**: glTF (web-ready)
- **Quality**: Production-ready toon aesthetic

### **Additional Asset Sources (If Needed)**

**Free Resources:**
- **Mixamo**: Character animations and rigs
- **Quaternius**: Low-poly 3D models (CC0)
- **Poly Haven**: PBR materials and HDRIs (CC0)  
- **Kenney**: UI elements and game assets (CC0)

**Premium Sources (Budget: $0-200):**
- **Sketchfab Store**: High-quality 3D models  
- **CGTrader**: Professional game assets
- **Unity Asset Store**: Complete asset packs
- **ArtStation Marketplace**: Concept art and 3D assets

### **Asset Pipeline Tools**

**Content Creation:**
- **Blender**: 3D modeling and animation (free)
- **GIMP/Photoshop**: Texture creation and editing
- **Audacity**: Audio editing and compression

**Optimization Pipeline:**
- **glTF Export**: Direct from Blender to web format
- **Draco Compression**: 80-90% geometry size reduction
- **KTX2 Textures**: GPU-optimized texture format  
- **Vite Bundling**: Asset optimization and delivery

---

## 🚀 Implementation Priority

### **Phase 1: MVP Assets (Week 1-2)**
- ✅ **Character Models**: 12 variations using Toon Shooter Kit
- ✅ **Basic UI**: Menu and HUD elements
- ✅ **Simple Arena**: Using environment kit pieces
- 🔄 **Primary Weapon**: AK assault rifle implementation

### **Phase 2: Core Gameplay (Week 3-4)** 
- 🔄 **Ricochet Effects**: Bullet trail and impact systems
- 🔄 **Player Animations**: Movement and combat cycles
- 🔄 **Audio Integration**: Weapon and movement sounds
- 🔄 **Arena Enhancement**: Multiple environment layouts

### **Phase 3: Polish & Variety (Week 5-8)**
- 📋 **Multiple Weapons**: Full arsenal from kit
- 📋 **Advanced Effects**: Particles and post-processing  
- 📋 **UI Polish**: Smooth transitions and feedback
- 📋 **Performance Optimization**: 60fps on target hardware

---

**This asset pipeline leverages the Toon Shooter Game Kit to create a complete, performance-optimized browser game with minimal additional asset costs.**