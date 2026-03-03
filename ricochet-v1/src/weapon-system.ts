// Weapon System Core

export interface WeaponConfig {
  damage: number;
  fireRate: number; // RPM
  magazineSize: number;
  reloadTime: number; // seconds
  recoilAmount: number;
}

export abstract class WeaponSystem {
  protected config: WeaponConfig;
  protected ammo: number;
  protected isReloading: boolean = false;
  protected lastFired: number = 0;
  protected isFiring: boolean = false;
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected weaponModel: THREE.Group | null = null;
  protected muzzleFlash: THREE.Sprite | null = null;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, config: WeaponConfig) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.ammo = config.magazineSize;
  }

  abstract loadModel(): Promise<void>;
  
  abstract update(deltaTime: number): void;
  
  fire(): void {
    if (this.isReloading || this.ammo <= 0 || this.isFiring) return;
    
    const now = Date.now();
    const fireInterval = 60000 / this.config.fireRate; // milliseconds between shots
    
    if (now - this.lastFired < fireInterval) return;
    
    this.lastFired = now;
    this.ammo--;
    this.isFiring = true;
    
    // Trigger muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = true;
      setTimeout(() => {
        this.muzzleFlash!.visible = false;
      }, 50);
    }
    
    // Apply recoil animation
    this.applyRecoil();
    
    // Fire bullet (to be implemented by integration layer)
    this.fireBullet();
    
    // Reset firing state after a short delay
    setTimeout(() => {
      this.isFiring = false;
    }, 100);
  }
  
  reload(): void {
    if (this.isReloading || this.ammo === this.config.magazineSize) return;
    
    this.isReloading = true;
    
    setTimeout(() => {
      this.ammo = this.config.magazineSize;
      this.isReloading = false;
    }, this.config.reloadTime * 1000);
  }
  
  protected abstract applyRecoil(): void;
  
  protected abstract fireBullet(): void;
  
  getAmmo(): number {
    return this.ammo;
  }
  
  isReadyToFire(): boolean {
    return !this.isReloading && this.ammo > 0;
  }
  
  isVisible(): boolean {
    return this.weaponModel !== null;
  }
  
  hide(): void {
    if (this.weaponModel) {
      this.weaponModel.visible = false;
    }
  }
  
  show(): void {
    if (this.weaponModel) {
      this.weaponModel.visible = true;
    }
  }
}
