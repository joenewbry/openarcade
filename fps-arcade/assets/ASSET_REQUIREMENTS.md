# OpenArcade 1v1 FPS - Asset Requirements

## Asset Pipeline Overview

**Budget Available**: Quality assets can be sourced externally  
**Coordination**: All asset requests go through Arcade GM  
**Timeline**: Phased delivery aligned with development sprints  

---

## 3D Models

### Characters & Players

#### MVP Phase (Week 3-8)
- **Basic Player Model** 
  - **Specs**: Low-poly (3K tris), rigged for basic animation
  - **Textures**: 1024x1024 diffuse + normal maps
  - **Animations**: Idle, walk, run, jump, death
  - **Priority**: HIGH - needed for Sprint 2
  - **Source**: External asset purchase or commission

#### Enhanced Phase (Week 9-12)  
- **Multiple Player Variants**
  - **Count**: 2-3 distinct character models
  - **Specs**: Medium-poly (5K tris), detailed animations
  - **Textures**: 2048x2048 with PBR materials
  - **Animations**: Combat animations, emotes
  - **Priority**: MEDIUM

### Weapons

#### MVP Phase
- **Assault Rifle**
  - **Specs**: 2K tris, modular design
  - **Textures**: 1024x1024 with wear/scratches
  - **Animations**: Idle, fire, reload
  - **Priority**: HIGH - needed for Sprint 4

#### Enhanced Phase  
- **Weapon Set** (3-4 weapons total)
  - **Sniper Rifle**: Long-range, high detail scope
  - **SMG**: Compact, high fire rate aesthetic  
  - **Shotgun**: Bulky, intimidating design
  - **Specs**: 2-3K tris each, shared texture atlas
  - **Animations**: Full animation sets for each
  - **Priority**: HIGH for enhanced features

### Environment

#### MVP Phase
- **Basic Map Geometry**
  - **Specs**: Modular pieces, efficient topology
  - **Style**: Industrial/military setting
  - **Count**: 20-30 modular pieces (walls, floors, crates, etc.)
  - **Textures**: Tiling textures, 512x512
  - **Priority**: HIGH - needed for Sprint 3

#### Enhanced Phase
- **Multiple Environment Sets**
  - **Urban**: City/office environment  
  - **Industrial**: Factory/warehouse setting
  - **Outdoor**: Military compound/base
  - **Specs**: More detailed geometry, unique pieces
  - **Textures**: 1024x1024, PBR workflow

---

## Textures & Materials

### MVP Requirements
- **Player Textures**: Basic diffuse + normal maps
- **Weapon Textures**: Metallic materials with wear
- **Environment Textures**: Tiling concrete, metal, dirt
- **UI Textures**: Clean, minimal interface elements
- **Priority**: HIGH - integrated with model delivery

### Enhanced Requirements  
- **PBR Material Sets**: Full metallic/roughness workflow
- **Detail Textures**: Close-up quality improvements
- **Decals**: Bullet holes, scorch marks, wear patterns
- **Skyboxes**: 3 different sky environments
- **Particle Textures**: Muzzle flashes, explosions, smoke

### Technical Specifications
- **Format**: WebP for web optimization, PNG fallback
- **Compression**: Balanced quality vs. file size
- **Mipmaps**: Required for distance rendering
- **Resolution**: Progressive (512px MVP, 1024px Enhanced, 2048px Launch)

---

## Audio Assets

### MVP Phase (Week 6-8)
- **Essential SFX**
  - Weapon fire sounds (1 weapon)
  - Footsteps (concrete, metal surfaces)  
  - UI sounds (button clicks, menu transitions)
  - Player damage/death sounds
  - Reload and weapon handling
  - **Priority**: HIGH - needed for Sprint 5

- **Basic Music**
  - Menu/lobby music (1 track, looped)
  - In-game background (ambient, low-key)
  - **Priority**: MEDIUM

#### Enhanced Phase (Week 9-12)
- **Expanded SFX Library**
  - Multiple weapon sounds (3-4 weapons)
  - Environmental audio (ambient sounds per map)
  - Advanced player audio (breathing, effort sounds)
  - Combat feedback (hit markers, kill confirmations)
  - **3D Spatial Audio**: Positional sound effects

- **Music Suite**  
  - Dynamic music system (3-4 tracks)
  - Victory/defeat stingers
  - Tension/action music layers
  - **Priority**: MEDIUM

### Audio Technical Specs
- **Format**: WebM (Opus codec) primary, OGG fallback
- **Quality**: 44.1kHz, compressed for web delivery
- **3D Audio**: Binaural/HRTF compatible
- **Dynamic Range**: Optimized for gameplay clarity

---

## User Interface Assets

### MVP Phase
- **Essential UI Graphics**
  - Health bars and HUD elements
  - Crosshair designs (simple, clear)
  - Menu backgrounds and buttons
  - Basic icons (weapons, settings)
  - **Style**: Clean, minimal, high contrast
  - **Priority**: HIGH - Sprint 5

### Enhanced Phase
- **Polished UI Suite**
  - Animated UI elements
  - Minimap icons and elements
  - Advanced HUD (kill feed, score display)
  - Loading screens and transitions
  - **Style**: Professional, competitive FPS aesthetic

### UI Technical Specs
- **Format**: SVG for scalable elements, PNG for complex graphics
- **Resolution**: 4K-ready assets (downscaled for performance)
- **Accessibility**: High contrast ratios, colorblind-friendly
- **Responsive**: Works on different screen sizes

---

## Effects & Particles

### MVP Phase
- **Basic Effects**
  - Muzzle flash sprites
  - Simple blood splatter
  - Basic explosion effects
  - **Priority**: MEDIUM - Sprint 6

### Enhanced Phase
- **Advanced Effects Suite**
  - Particle systems (smoke, sparks, debris)
  - Dynamic lighting effects
  - Weather effects (if outdoor maps)
  - Post-processing effects (motion blur, bloom)
  - **Priority**: MEDIUM

---

## Asset Delivery Schedule

### Sprint 2-3 (Weeks 2-3): Foundation Assets
- **Needed**: Basic player model, weapon model, environment kit
- **Request Timeline**: Week 1 (immediately after team formation)
- **Delivery**: End of Week 2

### Sprint 4-5 (Weeks 4-5): Core Gameplay Assets  
- **Needed**: Audio SFX, UI graphics, basic effects
- **Request Timeline**: Week 3 (after MVP scope locked)
- **Delivery**: End of Week 4

### Sprint 6-8 (Weeks 6-8): MVP Polish
- **Needed**: Audio integration, effect refinements
- **Request Timeline**: Week 5 (after core mechanics working)
- **Delivery**: End of Week 6

### Sprint 9-12 (Weeks 9-12): Enhanced Content
- **Needed**: Additional weapons, maps, advanced audio
- **Request Timeline**: Week 8 (after MVP gate passed)
- **Delivery**: Staged through weeks 9-11

---

## Asset Quality Standards

### Performance Requirements
- **Polygon Budget**: Total scene <100K tris (MVP), <200K tris (Enhanced)
- **Texture Memory**: <200MB total (MVP), <500MB total (Enhanced)
- **Audio Memory**: <50MB total (MVP), <100MB total (Enhanced)
- **Loading Time**: Individual assets <2 seconds to load

### Artistic Standards
- **Style Consistency**: Cohesive visual language across all assets
- **Technical Quality**: Clean topology, proper UVs, optimized textures
- **Competitive Readability**: Clear visual distinction between elements
- **Accessibility**: High contrast, colorblind considerations

---

## Asset Request Process

### Request Format (To Arcade GM)
```
Asset Request: [ASSET NAME]
Priority: [HIGH/MEDIUM/LOW]
Sprint: [Sprint X]
Specifications: [Technical details]
Reference: [Style guide or reference images]
Budget Estimate: [If known]
```

### Example Request
```
Asset Request: Basic Player Model
Priority: HIGH  
Sprint: Sprint 2
Specifications: 
- 3K triangle limit
- Rigged for basic animation
- 1024x1024 texture resolution
- Industrial/military aesthetic
Reference: Counter-Strike player models
Budget Estimate: $200-500
```

### Approval Process
1. **Asset Request** → Arcade GM
2. **Budget Approval** → Project stakeholders  
3. **Sourcing** → External vendors or asset stores
4. **Quality Review** → Asset quality gate check
5. **Integration** → Development team implementation

### Asset Library Management
- **Naming Convention**: `[category]_[name]_[version]` (e.g., `player_basic_v01`)
- **Version Control**: Track asset versions and changes
- **License Tracking**: Maintain usage rights documentation
- **Performance Monitoring**: Track impact on game performance

---

## Budget Planning

### Estimated Asset Costs
- **MVP Assets**: $2,000-3,000 total
  - Player models: $500-800
  - Weapons: $400-600  
  - Environment: $800-1,200
  - Audio: $300-500

- **Enhanced Assets**: Additional $3,000-4,000
  - Additional content: $2,000-3,000
  - Polish and effects: $1,000-1,500

### Cost Optimization Strategies
- **Asset Store Purchases**: Faster, often cheaper than custom
- **Modular Design**: Reusable components reduce total count
- **Progressive Enhancement**: Start simple, add detail later
- **Community Resources**: Leverage open-source assets where appropriate

### Budget Tracking
- Maintain running tally of asset costs
- Flag budget concerns early
- Plan contingency for overruns
- Track ROI on asset quality investment