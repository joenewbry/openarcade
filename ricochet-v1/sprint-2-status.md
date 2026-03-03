# RICOCHET Sprint 2 - Core Gameplay Development

**Sprint Goal**: Implement core FPS mechanics and ricochet physics system
**Timeline**: Week 2 of development  
**Team**: 4 active developers working in parallel

---

## 🎯 Sprint 2 Objectives

Transform RICOCHET from character selection demo into playable FPS with signature ricochet mechanics.

### **Core Features to Implement:**
- ✅ **Physics System**: Bullets that bounce off walls realistically
- ✅ **Player Movement**: Smooth FPS controls (WASD + mouse look)  
- ✅ **Weapon Integration**: AK assault rifle from Toon Shooter Kit
- ✅ **Arena Enhancement**: Proper ricochet-focused level design

---

## 👥 Development Assignments

### **Dev 01 - Ricochet Physics** 🔄
**Task**: Core bullet bouncing system  
**Session**: `5ab46ef3-7508-45f7-ab47-53e7a6af850b`
**Focus Areas:**
- Three.js raycasting for bullet trajectories
- Reflection angle calculations
- Visual bullet trails with fade effects
- Impact effects and performance optimization
- 3-5 bounce limit to prevent infinite loops

### **Dev 02 - Player Movement** 🔄  
**Task**: First-person shooter controls
**Session**: `db6ac53b-ee13-48bf-bf24-bccd5d20b744`
**Focus Areas:**
- Pointer Lock API for mouse look
- WASD movement with smooth momentum
- Jump mechanics and gravity
- Wall collision detection
- Mobile touch control support

### **Dev 03 - Weapon System** 🔄
**Task**: AK assault rifle implementation
**Session**: `3880eea9-5607-4de2-a12a-c9e6c9e477aa`
**Focus Areas:**
- Load AK.gltf model in first-person view
- Shooting mechanics (600 RPM fire rate)
- Weapon animations and muzzle flash
- 30-round magazine with reload system
- Integration with physics system

### **Game Artist - Arena Design** 🔄
**Task**: Enhanced arena layouts  
**Session**: `24d2cb90-a713-4569-a017-350715d635c1`
**Focus Areas:**
- WAREHOUSE arena using Toon Shooter Kit assets
- CONTAINER YARD with strategic ricochet surfaces
- Modular design with tactical cover placement
- Visual clarity and performance optimization

---

## 🔧 Technical Integration Points

### **Physics ↔ Weapons Integration**
- Dev 01's bullet system connects to Dev 03's weapon firing
- Weapon position determines bullet spawn point
- Weapon type affects bullet speed and damage

### **Movement ↔ Physics Integration**  
- Dev 02's player controller provides camera position for bullet origin
- Movement affects weapon sway and accuracy
- Jump/landing impacts weapon stability

### **Arena ↔ Physics Integration**
- Artist's arena geometry defines ricochet surfaces  
- Wall materials affect bounce physics properties
- Cover placement influences ricochet strategy

### **All Systems ↔ Performance**
- Target: 60 FPS with all systems active
- Memory budget: <20MB total assets
- Draw calls: <50 per frame

---

## 📊 Success Criteria

### **Functional Requirements**
- [ ] **Click to Shoot**: Mouse click fires bullets that bounce off walls
- [ ] **Smooth Movement**: WASD + mouse controls feel responsive
- [ ] **Weapon Visual**: AK model displays correctly in first-person
- [ ] **Arena Navigation**: Player can explore both arena designs
- [ ] **Ricochet Strategy**: Wall angles create tactical opportunities

### **Performance Requirements**  
- [ ] **60 FPS**: Maintained during rapid fire and movement
- [ ] **Input Lag**: <50ms from input to visual response
- [ ] **Loading Time**: <10 seconds for arena switch
- [ ] **Memory Usage**: <100MB RAM total

### **Quality Requirements**
- [ ] **Visual Polish**: Smooth animations and clean UI
- [ ] **Audio Integration**: Basic sound effects for shooting
- [ ] **Bug-Free**: No crashes during normal gameplay
- [ ] **Intuitive Controls**: New players can start playing immediately

---

## 🚀 Integration Timeline

### **Day 1-2**: Individual System Development
Each developer builds their core system independently

### **Day 3-4**: System Integration  
- Connect bullet physics to weapon system
- Integrate player movement with shooting
- Test arena designs with movement and physics

### **Day 5**: Polish & Testing
- Performance optimization across all systems
- Bug fixes and quality improvements  
- Prepare for Sprint 2 demo

---

## 🎮 Current Status

**Overall Progress**: 🔄 **In Development** (0% complete)
**Blocking Issues**: None identified
**Risk Level**: 🟢 **Low** (parallel development, clear requirements)

### **Team Communication:**
- **Daily Check-ins**: Monitor integration points
- **Shared Codebase**: `/Users/joe/dev/openarcade/ricochet-v1/`
- **Integration Testing**: Continuous as systems come online

### **Next Integration Milestone:**
**Target**: End of Day 2 - First integrated build with all systems working together

---

## 📝 Technical Notes

### **File Structure Being Created:**
```
src/
├── bullet-system.ts          # Dev 01 - Ricochet physics
├── player-controller.ts      # Dev 02 - Movement system  
├── input-manager.ts          # Dev 02 - Input handling
├── weapon-system.ts          # Dev 03 - Weapon framework
├── weapon-ak.ts              # Dev 03 - AK implementation
├── arena-warehouse.ts        # Artist - Warehouse design
├── arena-containers.ts       # Artist - Container yard  
└── main.ts                   # Integration point
```

### **Asset Dependencies:**
- **AK Model**: `assets/Guns/glTF/AK.gltf`
- **Environment Kit**: `assets/Environment/glTF/*`  
- **Character Models**: Already integrated in Sprint 1

---

**🎯 Sprint 2 Goal: Transform RICOCHET from demo to playable FPS with unique ricochet mechanics!**