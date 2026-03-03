import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ContainerYardArena {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private assetBasePath = './assets/Environment/glTF/';

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
    const objectsToRemove = this.scene.children.filter((child) =>
      child.userData?.isArenaObject === true
    );

    objectsToRemove.forEach((obj) => this.scene.remove(obj));
  }

  private createGround(): void {
    // Outdoor dirt base (visible)
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355, // Sandy brown dirt
      side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.userData.isArenaObject = true;
    ground.userData.isWall = false;
    ground.userData.isGround = true;
    this.scene.add(ground);

    // Central concrete pad
    const concreteGeometry = new THREE.PlaneGeometry(20, 20);
    const concreteMaterial = new THREE.MeshStandardMaterial({
      color: 0x707070, // Concrete gray
      side: THREE.DoubleSide
    });

    const concretePad = new THREE.Mesh(concreteGeometry, concreteMaterial);
    concretePad.rotation.x = -Math.PI / 2;
    concretePad.position.y = 0.01; // Slightly above ground
    concretePad.receiveShadow = true;
    concretePad.userData.isArenaObject = true;
    concretePad.userData.isWall = false;
    concretePad.userData.isGround = true;
    this.scene.add(concretePad);

    // Invisible collision slab backup so ground collision is always present.
    const collider = new THREE.Mesh(
      new THREE.BoxGeometry(220, 1, 220),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    collider.position.set(0, -0.5, 0); // Top at y=0
    collider.userData.isArenaObject = true;
    collider.userData.isWall = false;
    collider.userData.isGround = true;
    this.scene.add(collider);
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

  private createFallbackGeometry(
    filename: string,
    position: { x: number; y: number; z: number },
    rotationY: number
  ): void {
    const id = filename.toLowerCase();

    let size = new THREE.Vector3(2, 2, 2);
    let color = 0x66778f;

    if (id.includes('container_long')) {
      size = new THREE.Vector3(7.5, 2.6, 2.6);
      color = 0x4f6b87;
    } else if (id.includes('container_small')) {
      size = new THREE.Vector3(3.8, 2.2, 2.2);
      color = 0x576f87;
    } else if (id.includes('barrier') || id.includes('brickwall')) {
      size = new THREE.Vector3(4, 2.2, 0.7);
      color = 0x7f7768;
    } else if (id.includes('crate') || id.includes('boxes')) {
      size = new THREE.Vector3(1.6, 1.6, 1.6);
      color = 0x8f6a43;
    } else if (id.includes('debris')) {
      size = new THREE.Vector3(2.4, 0.8, 1.8);
      color = 0x5d5d5d;
    }

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.1 })
    );

    mesh.position.set(position.x, position.y + size.y * 0.5, position.z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isArenaObject = true;
    mesh.userData.isWall = true;

    this.scene.add(mesh);
  }

  private async loadAndPlace(
    filename: string,
    position: { x: number; y: number; z: number },
    rotationY = 0
  ): Promise<void> {
    return new Promise((resolve) => {
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
          console.warn(`Could not load ${filename}, using fallback geometry:`, error);
          this.createFallbackGeometry(filename, position, rotationY);
          resolve();
        }
      );
    });
  }

  private setupLighting(): void {
    // Outdoor daylight lighting
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.6); // Sky blue ambient
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
      name: 'CONTAINER YARD',
      description: 'Outdoor container facility with elevated positions and open combat zones.',
      tacticalNotes: [
        'Central combat area favors aggressive, mobile gameplay',
        'Elevated container stacks provide sniper positions with ricochet cover',
        'Container maze around perimeter creates flanking opportunities',
        'Angled barriers enable complex multi-bounce ricochet shots',
        'Open sight lines reward precision shooting and positioning',
        'Multiple elevation levels add vertical tactical dimension'
      ]
    };
  }
}
