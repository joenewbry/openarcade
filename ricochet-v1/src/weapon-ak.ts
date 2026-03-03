import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WeaponSystem, WeaponConfig } from './weapon-system';

export class AKWeapon extends WeaponSystem {
  private loader: GLTFLoader;
  private recoilAnimation: number = 0;
  private recoilRecovery: number = 0;
  private muzzleFlashGeometry: THREE.CircleGeometry;
  private muzzleFlashMaterial: THREE.SpriteMaterial;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const config: WeaponConfig = {
      damage: 35,
      fireRate: 600, // 600 RPM
      magazineSize: 30,
      reloadTime: 2.5, // 2.5 seconds
      recoilAmount: 0.2 // Slight upward kick
    };
    
    super(scene, camera, config);
    this.loader = new GLTFLoader();
    
    // Initialize muzzle flash
    this.muzzleFlashGeometry = new THREE.CircleGeometry(0.1, 8);
    this.muzzleFlashMaterial = new THREE.SpriteMaterial({
      map: new THREE.TextureLoader().load('assets/Toon Shooter Game Kit - Dec 2022/Guns/muzzle_flash.png'),
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    
    // Create muzzle flash sprite
    this.muzzleFlash = new THREE.Sprite(this.muzzleFlashMaterial);
    this.muzzleFlash.visible = false;
    this.scene.add(this.muzzleFlash);
  }
  
  async loadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        'assets/Guns/glTF/AK.gltf',
        (gltf) => {
          this.weaponModel = gltf.scene;
          
          // Scale and position AK for first-person view
          this.weaponModel.scale.set(0.3, 0.3, 0.3);
          
          // Position relative to camera: bottom-right of screen
          const offset = new THREE.Vector3(-0.7, -0.5, 0.3);
          this.weaponModel.position.copy(offset);
          
          // Orient weapon to look forward
          this.weaponModel.rotation.set(0, Math.PI / 2, 0);
          
          // Add to scene
          this.scene.add(this.weaponModel);
          
          // Position muzzle flash at weapon end
          const muzzlePosition = new THREE.Vector3();
          this.weaponModel.getWorldPosition(muzzlePosition);
          this.muzzleFlash.position.copy(muzzlePosition);
          
          // Ensure muzzle flash is attached to weapon
          this.weaponModel.add(this.muzzleFlash);
          
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading AK model:', error);
          reject(error);
        }
      );
    });
  }
  
  update(deltaTime: number): void {
    // Handle recoil recovery
    if (this.recoilAnimation > 0) {
      this.recoilAnimation -= deltaTime * 0.001;
      this.weaponModel!.position.y = Math.max(-0.1, this.recoilAnimation * 0.2);
    } else if (this.recoilRecovery > 0) {
      this.recoilRecovery -= deltaTime * 0.001;
      const recovery = this.recoilRecovery * 0.1;
      this.weaponModel!.position.y = Math.max(0, this.weaponModel!.position.y - recovery);
    }
    
    // Update muzzle flash position with weapon
    if (this.weaponModel && this.muzzleFlash) {
      const muzzlePosition = new THREE.Vector3();
      this.weaponModel.getWorldPosition(muzzlePosition);
      this.muzzleFlash.position.copy(muzzlePosition);
    }
  }
  
  protected applyRecoil(): void {
    this.recoilAnimation = 0.8; // Start recoil
    this.recoilRecovery = 1.0; // Recovery time
    
    // Apply slight upward kick
    this.weaponModel!.position.y = 0.2;
  }
  
  protected fireBullet(): void {
    // Placeholder for bullet physics integration
    // Will connect to Dev 01's bullet system
    console.log('AK fired! Bullet physics integration point');
  }
  
  // Public method to manually trigger reload (for input binding)
  public triggerReload(): void {
    this.reload();
  }
}
