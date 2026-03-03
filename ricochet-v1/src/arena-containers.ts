import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ContainerYardArena {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private assetBasePath: string = './assets/Toon Shooter Game Kit - Dec 2022/Environment/glTF/';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  async loadArena(): Promise<void> {
    console.log('Loading CONTAINER YARD arena...');

    // Clear existing arena objects
    this.clearArena();

    // Create ground
    this.createGround();
    
    // Load container maze structures
    await this.createContainerMaze();
    
    // Add perimeter barriers
    await this.createPerimeterBarriers();
    
    // Add central combat zone
    await this.createCentralZone();
    
    // Add elevation platforms
    await this.createElevationLevels();
    
    // Add lighting (outdoor style)
    this.setupLighting();
    
    console.log('CONTAINER YARD arena loaded successfully');
  }

  private clearArena(): void {
    // Remove existing arena objects (except characters/weapons)
    const objectsToRemove = this.scene.children.filter(child => 
      child.userData?.isArenaObject === true
    );
    
    objectsToRemove.forEach(obj => this.scene.remove(obj));
  }

  private createGround(): void {
    // Outdoor concrete pad with dirt areas
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B7355, // Sandy brown dirt
      roughness: 0.9 
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isArenaObject = true;
    ground.userData.isWall = false;
    
    this.scene.add(ground);

    // Central concrete pad
    const concreteGeometry = new THREE.PlaneGeometry(20, 20);
    const concreteMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x707070, // Concrete gray
      roughness: 0.7 
    });
    
    const concretePad = new THREE.Mesh(concreteGeometry, concreteMaterial);
    concretePad.rotation.x = -Math.PI / 2;
    concretePad.position.y = 0.01; // Slightly above ground
    concretePad.receiveShadow = true;
    concretePad.userData.isArenaObject = true;
    concretePad.userData.isWall = false;
    
    this.scene.add(concretePad);
  }

  private async createContainerMaze(): Promise<void> {
    try {
      // Container maze around perimeter (creates tactical corridors)
      
      // North container row
      await this.loadAndPlace('Container_Long.gltf', { x: -15, y: 0, z: 20 }, 0);
      await this.loadAndPlace('Container_Long.gltf', { x: 0, y: 0, z: 20 }, 0);
      await this.loadAndPlace('Container_Long.gltf', { x: 15, y: 0, z: 20 }, 0);
      
      // South container row
      await this.loadAndPlace('Container_Long.gltf', { x: -15, y: 0, z: -20 }, 0);
      await this.loadAndPlace('Container_Long.gltf', { x: 0, y: 0, z: -20 }, 0);
      await this.loadAndPlace('Container_Long.gltf', { x: 15, y: 0, z: -20 }, 0);
      
      // East/West container stacks
      await this.loadAndPlace('Container_Small.gltf', { x: 22, y: 0, z: -8 }, Math.PI / 2);
      await this.loadAndPlace('Container_Small.gltf', { x: 22, y: 0, z: 0 }, Math.PI / 2);
      await this.loadAndPlace('Container_Small.gltf', { x: 22, y: 0, z: 8 }, Math.PI / 2);
      
      await this.loadAndPlace('Container_Small.gltf', { x: -22, y: 0, z: -8 }, Math.PI / 2);
      await this.loadAndPlace('Container_Small.gltf', { x: -22, y: 0, z: 0 }, Math.PI / 2);
      await this.loadAndPlace('Container_Small.gltf', { x: -22, y: 0, z: 8 }, Math.PI / 2);
      
      // Diagonal container placement for ricochet angles
      await this.loadAndPlace('Container_Small.gltf', { x: 12, y: 0, z: 12 }, Math.PI / 4);
      await this.loadAndPlace('Container_Small.gltf', { x: -12, y: 0, z: 12 }, -Math.PI / 4);
      await this.loadAndPlace('Container_Small.gltf', { x: 12, y: 0, z: -12 }, -Math.PI / 4);
      await this.loadAndPlace('Container_Small.gltf', { x: -12, y: 0, z: -12 }, Math.PI / 4);
      
    } catch (error) {
      console.error('Error loading container maze:', error);
    }
  }

  private async createPerimeterBarriers(): Promise<void> {
    try {
      // Angled barriers for ricochet opportunities
      await this.loadAndPlace('Barrier_Large.gltf', { x: -18, y: 0, z: 15 }, Math.PI / 6);
      await this.loadAndPlace('Barrier_Large.gltf', { x: 18, y: 0, z: 15 }, -Math.PI / 6);
      await this.loadAndPlace('Barrier_Large.gltf', { x: -18, y: 0, z: -15 }, -Math.PI / 6);
      await this.loadAndPlace('Barrier_Large.gltf', { x: 18, y: 0, z: -15 }, Math.PI / 6);
      
      // Straight barriers for direct bounces
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: 0, y: 0, z: 15 }, 0);
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: 0, y: 0, z: -15 }, Math.PI);
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: 15, y: 0, z: 0 }, Math.PI / 2);
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: -15, y: 0, z: 0 }, -Math.PI / 2);
      
    } catch (error) {
      console.error('Error loading perimeter barriers:', error);
    }
  }

  private async createCentralZone(): Promise<void> {
    try {
      // Central open combat area with minimal cover
      await this.loadAndPlace('Crate.gltf', { x: -3, y: 0, z: 3 }, Math.PI / 4);
      await this.loadAndPlace('Crate.gltf', { x: 3, y: 0, z: 3 }, -Math.PI / 4);
      await this.loadAndPlace('Crate.gltf', { x: -3, y: 0, z: -3 }, -Math.PI / 4);
      await this.loadAndPlace('Crate.gltf', { x: 3, y: 0, z: -3 }, Math.PI / 4);
      
      // Scattered debris for atmosphere and minor cover
      await this.loadAndPlace('CardboardBoxes_4.gltf', { x: 8, y: 0, z: 5 }, 0);
      await this.loadAndPlace('CardboardBoxes_1.gltf', { x: -8, y: 0, z: 5 }, Math.PI / 3);
      await this.loadAndPlace('CardboardBoxes_2.gltf', { x: 8, y: 0, z: -5 }, 0);
      await this.loadAndPlace('CardboardBoxes_3.gltf', { x: -8, y: 0, z: -5 }, -Math.PI / 3);
      
    } catch (error) {
      console.error('Error loading central zone:', error);
    }
  }

  private async createElevationLevels(): Promise<void> {
    try {
      // Stacked containers for elevation and sniping positions
      await this.loadAndPlace('Container_Small.gltf', { x: -18, y: 0, z: 5 }, 0);
      await this.loadAndPlace('Container_Small.gltf', { x: -18, y: 3, z: 5 }, 0); // Stacked on top
      
      await this.loadAndPlace('Container_Small.gltf', { x: 18, y: 0, z: 5 }, 0);
      await this.loadAndPlace('Container_Small.gltf', { x: 18, y: 3, z: 5 }, 0); // Stacked on top
      
      // Mid-level platforms
      await this.loadAndPlace('Container_Small.gltf', { x: 0, y: 0, z: 10 }, Math.PI / 2);
      await this.loadAndPlace('Container_Small.gltf', { x: 0, y: 0, z: -10 }, Math.PI / 2);
      
      // Debris and atmosphere around elevated areas
      await this.loadAndPlace('Debris_BrokenCar.gltf', { x: -20, y: 0, z: 18 }, Math.PI / 6);
      await this.loadAndPlace('Debris_Pile.gltf', { x: 20, y: 0, z: 18 }, -Math.PI / 6);
      await this.loadAndPlace('Debris_Pile.gltf', { x: -20, y: 0, z: -18 }, Math.PI / 3);
      
    } catch (error) {
      console.error('Error loading elevation levels:', error);
    }
  }

  private async loadAndPlace(
    filename: string, 
    position: { x: number; y: number; z: number }, 
    rotationY: number = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        this.assetBasePath + filename,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(position.x, position.y, position.z);
          model.rotation.y = rotationY;
          model.userData.isArenaObject = true;
          model.userData.isWall = true; // Most arena objects are potential ricochet surfaces
          
          // Enable shadows
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          this.scene.add(model);
          resolve();
        },
        undefined,
        (error) => {
          console.warn(`Could not load ${filename}:`, error);
          resolve(); // Continue even if one asset fails
        }
      );
    });
  }

  private setupLighting(): void {
    // Outdoor daylight lighting
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6); // Sky blue ambient
    ambientLight.userData.isArenaObject = true;
    this.scene.add(ambientLight);

    // Primary sun light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(20, 30, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.userData.isArenaObject = true;
    this.scene.add(sunLight);

    // Secondary fill light (softer shadows)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-20, 20, -10);
    fillLight.userData.isArenaObject = true;
    this.scene.add(fillLight);
  }

  public getArenaInfo(): { name: string; description: string; tacticalNotes: string[] } {
    return {
      name: "CONTAINER YARD",
      description: "Outdoor container facility with elevated positions and open combat zones.",
      tacticalNotes: [
        "Central combat area favors aggressive, mobile gameplay",
        "Elevated container stacks provide sniper positions with ricochet cover",
        "Container maze around perimeter creates flanking opportunities", 
        "Angled barriers enable complex multi-bounce ricochet shots",
        "Open sight lines reward precision shooting and positioning",
        "Multiple elevation levels add vertical tactical dimension"
      ]
    };
  }
}