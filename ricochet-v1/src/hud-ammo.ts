/* Ammo HUD Component for RICOCHET
 * Displays current ammo and reload state in bottom-right corner
 * Integrates with WeaponSystem events
 */

export class AmmoHUD {
  private element!: HTMLElement;
  private weaponSystem: any; // Will be connected to WeaponSystem
  private reloadProgress: number = 0;
  
  constructor(weaponSystem: any) {
    this.weaponSystem = weaponSystem;
    this.initElement();
    this.bindEvents();
  }
  
  private initElement(): void {
    // Create ammo display container
    this.element = document.createElement('div');
    this.element.id = 'ammo-hud';
    this.element.style.position = 'absolute';
    this.element.style.bottom = '20px';
    this.element.style.right = '20px';
    this.element.style.color = 'white';
    this.element.style.fontFamily = 'Arial, sans-serif';
    this.element.style.fontSize = '1.8rem';
    this.element.style.fontWeight = 'bold';
    this.element.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    this.element.style.zIndex = '50';
    this.element.style.userSelect = 'none';
    
    // Add reload animation element
    const reloadElement = document.createElement('div');
    reloadElement.id = 'reload-indicator';
    reloadElement.style.display = 'none';
    reloadElement.style.position = 'absolute';
    reloadElement.style.bottom = '5px';
    reloadElement.style.right = '20px';
    reloadElement.style.color = '#4ecdc4';
    reloadElement.style.fontWeight = 'bold';
    reloadElement.style.fontSize = '1.2rem';
    reloadElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    reloadElement.style.opacity = '0.9';
    
    // Add circular progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.id = 'reload-progress-container';
    progressContainer.style.position = 'absolute';
    progressContainer.style.bottom = '10px';
    progressContainer.style.right = '20px';
    progressContainer.style.width = '60px';
    progressContainer.style.height = '60px';
    progressContainer.style.borderRadius = '50%';
    progressContainer.style.border = '3px solid rgba(78, 205, 196, 0.3)';
    progressContainer.style.borderTop = '3px solid #4ecdc4';
    progressContainer.style.animation = 'spin 1s linear infinite';
    progressContainer.style.display = 'none';
    
    // Add to main element
    this.element.appendChild(reloadElement);
    this.element.appendChild(progressContainer);
    
    // Add to DOM
    document.body.appendChild(this.element);
    
    // Add CSS animation for spinning reload indicator
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  private bindEvents(): void {
    // Listen for ammo changes (from weapon system)
    this.updateDisplay();
    
    // Create a polling loop for real-time updates since we can't hook into
    // weaponSystem events directly without modifying the base class
    setInterval(() => {
      this.updateDisplay();
    }, 100);
    
    // Check reload state
    setInterval(() => {
      this.updateReloadState();
    }, 100);
  }
  
  private updateDisplay(): void {
    const currentAmmo = this.weaponSystem.getAmmo();
    const totalAmmo = this.weaponSystem.config.magazineSize;
    
    // Update text
    this.element.textContent = `${currentAmmo} / ${totalAmmo}`;
    
    // Apply color based on ammo level
    if (currentAmmo < 5) {
      this.element.style.color = 'red';
    } else if (currentAmmo < 10) {
      this.element.style.color = 'orange';
    } else {
      this.element.style.color = 'white';
    }
    
    // Fade in/out based on visibility
    this.element.style.opacity = '1';
  }
  
  private updateReloadState(): void {
    const reloadIndicator = document.getElementById('reload-indicator');
    const progressContainer = document.getElementById('reload-progress-container');

    if (this.weaponSystem.isReloading) {
      if (!reloadIndicator || !progressContainer) return;

      reloadIndicator.style.display = 'block';
      progressContainer.style.display = 'block';

      // Calculate progress (0 to 1)
      // We don't have exact elapsed time, so we'll animate continuously
      // In a real implementation, we'd track the start time of reload
      this.reloadProgress += 0.05;
      if (this.reloadProgress > 1) this.reloadProgress = 0;

      // Update text
      reloadIndicator.textContent = 'RELOADING...';
    } else {
      if (reloadIndicator) reloadIndicator.style.display = 'none';
      if (progressContainer) progressContainer.style.display = 'none';
    }
  }
  
  public show(): void {
    this.element.style.display = 'block';
  }
  
  public hide(): void {
    this.element.style.display = 'none';
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.AmmoHUD = AmmoHUD;
}
