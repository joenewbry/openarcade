import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class WarehouseArena {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private assetBasePath: string = './assets/Toon Shooter Game Kit - Dec 2022/Environment/glTF/';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  async loadArena(): Promise<void> {
    console.log('Loading WAREHOUSE arena...');

    // Clear existing arena objects
    this.clearArena();

    // Create ground
    this.createGround();
    
    // Load and place warehouse structures
    await this.createWarehouseStructures();
    
    // Add ricochet walls
    await this.createRicochetWalls();
    
    // Add tactical cover
    await this.createTacticalCover();
    
    // Add lighting
    this.setupLighting();
    
    console.log('WAREHOUSE arena loaded successfully');
  }

  private clearArena(): void {
    // Remove existing arena objects (except characters/weapons)
    const objectsToRemove = this.scene.children.filter(child => 
      child.userData?.isArenaObject === true
    );
    
    objectsToRemove.forEach(obj => this.scene.remove(obj));
  }

  private createGround(): void {
    // Industrial concrete floor
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x606060, // Dark concrete gray
      roughness: 0.8 
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isArenaObject = true;
    ground.userData.isWall = false;
    
    this.scene.add(ground);
  }

  private async createWarehouseStructures(): Promise<void> {
    try {
      // Central warehouse using Container_Long
      await this.loadAndPlace('Container_Long.gltf', { x: 0, y: 0, z: 0 }, 0);
      
      // Side warehouse structures
      await this.loadAndPlace('Container_Long.gltf', { x: -12, y: 0, z: 8 }, Math.PI / 4);
      await this.loadAndPlace('Container_Long.gltf', { x: 12, y: 0, z: 8 }, -Math.PI / 4);
      
      // Back warehouse row
      await this.loadAndPlace('Container_Small.gltf', { x: -8, y: 0, z: -15 }, 0);
      await this.loadAndPlace('Container_Small.gltf', { x: 8, y: 0, z: -15 }, 0);
      
    } catch (error) {
      console.error('Error loading warehouse structures:', error);
    }
  }

  private async createRicochetWalls(): Promise<void> {
    try {
      // Angled ricochet barriers (45-degree angles for perfect bounces)
      await this.loadAndPlace('Barrier_Large.gltf', { x: -10, y: 0, z: 5 }, Math.PI / 4);
      await this.loadAndPlace('Barrier_Large.gltf', { x: 10, y: 0, z: 5 }, -Math.PI / 4);
      
      // Central ricochet corridor
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: -3, y: 0, z: 0 }, Math.PI / 6);
      await this.loadAndPlace('Barrier_Fixed.gltf', { x: 3, y: 0, z: 0 }, -Math.PI / 6);
      
      // Perimeter walls for bouncing
      await this.loadAndPlace('BrickWall_1.gltf', { x: -18, y: 0, z: 0 }, Math.PI / 2);
      await this.loadAndPlace('BrickWall_1.gltf', { x: 18, y: 0, z: 0 }, Math.PI / 2);
      await this.loadAndPlace('BrickWall_2.gltf', { x: 0, y: 0, z: -18 }, 0);
      await this.loadAndPlace('BrickWall_2.gltf', { x: 0, y: 0, z: 18 }, Math.PI);
      
    } catch (error) {
      console.error('Error loading ricochet walls:', error);
    }
  }

  private async createTacticalCover(): Promise<void> {
    try {
      // Mixed height cover for tactical gameplay
      await this.loadAndPlace('Crate.gltf', { x: -6, y: 0, z: 10 }, 0);
      await this.loadAndPlace('Crate.gltf', { x: 6, y: 0, z: 10 }, 0);
      await this.loadAndPlace('Crate.gltf', { x: -6, y: 0, z: -10 }, 0);
      await this.loadAndPlace('Crate.gltf', { x: 6, y: 0, z: -10 }, 0);
      
      // Cardboard box clusters for varied cover
      await this.loadAndPlace('CardboardBoxes_1.gltf', { x: -12, y: 0, z: -5 }, 0);
      await this.loadAndPlace('CardboardBoxes_2.gltf', { x: 12, y: 0, z: -5 }, 0);
      await this.loadAndPlace('CardboardBoxes_3.gltf', { x: 0, y: 0, z: 12 }, Math.PI / 4);
      
      // Debris for atmosphere
      await this.loadAndPlace('Debris_Pile.gltf', { x: -15, y: 0, z: 12 }, 0);
      await this.loadAndPlace('Debris_Pile.gltf', { x: 15, y: 0, z: 12 }, 0);
      
    } catch (error) {
      console.error('Error loading tactical cover:', error);
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
    // Industrial warehouse lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4); // Dim ambient
    ambientLight.userData.isArenaObject = true;
    this.scene.add(ambientLight);

    // Main overhead directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.userData.isArenaObject = true;
    this.scene.add(mainLight);

    // Accent lighting for atmosphere
    const accentLight1 = new THREE.PointLight(0xffa500, 0.3, 15); // Orange warehouse light
    accentLight1.position.set(-10, 5, 0);
    accentLight1.userData.isArenaObject = true;
    this.scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xffa500, 0.3, 15);
    accentLight2.position.set(10, 5, 0);
    accentLight2.userData.isArenaObject = true;
    this.scene.add(accentLight2);
  }

  public getArenaInfo(): { name: string; description: string; tacticalNotes: string[] } {
    return {
      name: "WAREHOUSE",
      description: "Industrial complex with angled ricochet corridors and mixed cover heights.",
      tacticalNotes: [
        "Central corridor creates ricochet opportunities at 45-degree angles",
        "Container structures provide elevated positions for sniping", 
        "Mixed cover heights allow for tactical crouching and positioning",
        "Perimeter walls enable bank shots around corners",
        "Debris piles create unpredictable ricochet surfaces"
      ]
    };
  }
}