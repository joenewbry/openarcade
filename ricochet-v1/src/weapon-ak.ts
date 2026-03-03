import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WeaponSystem, WeaponMovementState } from './weapon-system';

export class AKWeapon extends WeaponSystem {
  private loader: GLTFLoader;
  private recoilAnimation = 0;
  private recoilRecovery = 0;
  private readonly firstPersonLayer = 1;
  private readonly baseViewPosition = new THREE.Vector3(0.32, -0.26, -0.45);
  private readonly muzzleLocalPosition = new THREE.Vector3(0.02, 0.02, -0.62);
  private readonly weaponWalkBobScale = 0.32;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const config = {
      damage: 35,
      fireRate: 600, // 600 RPM
      magazineSize: 30,
      reloadTime: 2.5, // 2.5 seconds
      recoilAmount: 0.2 // Slight upward kick
    };

    super(scene, camera, config);
    this.loader = new GLTFLoader();

    this.camera.layers.enable(this.firstPersonLayer);

    const muzzleFlashMaterial = new THREE.SpriteMaterial({
      map: new THREE.TextureLoader().load('./assets/Toon Shooter Game Kit - Dec 2022/Guns/muzzle_flash.png'),
      color: 0xffffaa,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });

    this.muzzleFlash = new THREE.Sprite(muzzleFlashMaterial);
    this.muzzleFlash.visible = false;
    this.muzzleFlash.scale.set(0.2, 0.2, 0.2);
  }

  private async loadModelFromPath(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  async loadModel(): Promise<void> {
    const candidatePaths = [
      './assets/Guns/glTF/AK.gltf',
      './assets/Toon Shooter Game Kit - Dec 2022/Guns/glTF/AK.gltf'
    ];

    let loaded: THREE.Group | null = null;
    let lastError: unknown = null;

    for (const path of candidatePaths) {
      try {
        loaded = await this.loadModelFromPath(path);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!loaded) {
      console.error('Error loading AK model from all known paths:', lastError);
      return;
    }

    this.weaponModel = loaded;
    this.weaponModel.name = 'fp-ak';
    this.weaponModel.scale.set(0.36, 0.36, 0.36);
    this.weaponModel.position.copy(this.baseViewPosition);
    this.weaponModel.rotation.set(0, -Math.PI / 2, 0);

    this.weaponModel.traverse((child: any) => {
      child.layers.set(this.firstPersonLayer);
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.renderOrder = 1000;

      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((m: any) => {
          m.depthTest = false;
          m.depthWrite = false;
        });
      } else if (material) {
        material.depthTest = false;
        material.depthWrite = false;
      }
    });

    if (this.muzzleFlash) {
      this.muzzleFlash.layers.set(this.firstPersonLayer);
      this.muzzleFlash.position.copy(this.muzzleLocalPosition);
      this.weaponModel.add(this.muzzleFlash);
    }

    // Attach to camera so it always renders in first-person view.
    this.camera.add(this.weaponModel);
  }

  update(deltaTime: number, movementState?: WeaponMovementState): void {
    if (!this.weaponModel) return;

    // Handle recoil animation and recovery
    if (this.recoilAnimation > 0) {
      this.recoilAnimation = Math.max(0, this.recoilAnimation - deltaTime * 0.001);
    } else if (this.recoilRecovery > 0) {
      this.recoilRecovery = Math.max(0, this.recoilRecovery - deltaTime * 0.001);
    }

    const recoilKick = this.recoilAnimation * 0.2;
    const movingBobX = (movementState?.walkBobOffset.x ?? 0) * this.weaponWalkBobScale;
    const movingBobY = (movementState?.walkBobOffset.y ?? 0) * this.weaponWalkBobScale;

    this.weaponModel.position.set(
      this.baseViewPosition.x + movingBobX,
      this.baseViewPosition.y + recoilKick + movingBobY,
      this.baseViewPosition.z
    );
  }

  protected applyRecoil(): void {
    this.recoilAnimation = 0.9; // Start recoil
    this.recoilRecovery = 1.0;
  }

  protected fireBullet(): void {
    // Emit fire event for integration layers (networking, effects, analytics)
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();

    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(direction);

    window.dispatchEvent(new CustomEvent('weaponFired', {
      detail: {
        t: Date.now(),
        origin: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z }
      }
    }));

    console.log('AK fired!');
  }

  // Public method to manually trigger reload (for input binding)
  public triggerReload(): void {
    super.triggerReload();
  }
}
