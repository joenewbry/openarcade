/*
 * HUD Health System
 * Manages visual health display, damage indicators, low health warnings, and death screen
 */

export class HealthHUD {
    private healthBar: HTMLElement;
    private damageFlash: HTMLElement;
    private lowHealthVignette: HTMLElement;
    private deathScreen: HTMLElement;
    private healthValue: HTMLElement;
    private maxHealth: number = 100;
    private currentHealth: number = 100;
    private isDead: boolean = false;
    private respawnTimer: number | null = null;

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.hideAllEffects();
    }

    private initializeElements(): void {
        // Create health bar container
        const hud = document.getElementById('hud') as HTMLElement;
        if (!hud) {
            console.error('HUD container not found');
            return;
        }

        // Health bar
        this.healthBar = document.createElement('div');
        this.healthBar.id = 'health-bar';
        this.healthBar.style.position = 'absolute';
        this.healthBar.style.top = '20px';
        this.healthBar.style.left = '20px';
        this.healthBar.style.width = '200px';
        this.healthBar.style.height = '20px';
        this.healthBar.style.background = 'white';
        this.healthBar.style.border = '2px solid #333';
        this.healthBar.style.borderRadius = '10px';
        this.healthBar.style.overflow = 'hidden';
        this.healthBar.style.zIndex = '50';
        
        // Health fill
        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.width = '100%';
        healthFill.style.height = '100%';
        healthFill.style.background = 'linear-gradient(90deg, #ff4757, #ff4757)';
        healthFill.style.transition = 'width 0.3s ease';
        this.healthBar.appendChild(healthFill);
        
        // Health text
        this.healthValue = document.createElement('div');
        this.healthValue.id = 'health-value';
        this.healthValue.style.position = 'absolute';
        this.healthValue.style.top = '50%';
        this.healthValue.style.left = '220px';
        this.healthValue.style.transform = 'translateY(-50%)';
        this.healthValue.style.color = 'white';
        this.healthValue.style.fontFamily = 'Arial, sans-serif';
        this.healthValue.style.fontSize = '16px';
        this.healthValue.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        this.healthValue.textContent = '100/100';
        
        hud.appendChild(this.healthBar);
        hud.appendChild(this.healthValue);

        // Damage flash overlay
        this.damageFlash = document.createElement('div');
        this.damageFlash.id = 'damage-flash';
        this.damageFlash.style.position = 'fixed';
        this.damageFlash.style.top = '0';
        this.damageFlash.style.left = '0';
        this.damageFlash.style.width = '100%';
        this.damageFlash.style.height = '100%';
        this.damageFlash.style.background = 'rgba(255, 0, 0, 0)';
        this.damageFlash.style.zIndex = '100';
        this.damageFlash.style.pointerEvents = 'none';
        this.damageFlash.style.transition = 'background 0.1s ease';
        document.body.appendChild(this.damageFlash);

        // Low health vignette
        this.lowHealthVignette = document.createElement('div');
        this.lowHealthVignette.id = 'low-health-vignette';
        this.lowHealthVignette.style.position = 'fixed';
        this.lowHealthVignette.style.top = '0';
        this.lowHealthVignette.style.left = '0';
        this.lowHealthVignette.style.width = '100%';
        this.lowHealthVignette.style.height = '100%';
        this.lowHealthVignette.style.background = 'radial-gradient(circle at center, transparent 40%, rgba(139, 0, 0, 0.7) 100%)';
        this.lowHealthVignette.style.zIndex = '90';
        this.lowHealthVignette.style.pointerEvents = 'none';
        this.lowHealthVignette.style.display = 'none';
        this.lowHealthVignette.style.animation = 'pulse 1.5s infinite alternate';
        document.body.appendChild(this.lowHealthVignette);

        // Death screen
        this.deathScreen = document.createElement('div');
        this.deathScreen.id = 'death-screen';
        this.deathScreen.style.position = 'fixed';
        this.deathScreen.style.top = '0';
        this.deathScreen.style.left = '0';
        this.deathScreen.style.width = '100%';
        this.deathScreen.style.height = '100%';
        this.deathScreen.style.background = 'rgba(0, 0, 0, 0)';
        this.deathScreen.style.display = 'flex';
        this.deathScreen.style.flexDirection = 'column';
        this.deathScreen.style.justifyContent = 'center';
        this.deathScreen.style.alignItems = 'center';
        this.deathScreen.style.color = 'white';
        this.deathScreen.style.fontSize = '4rem';
        this.deathScreen.style.fontFamily = 'Arial, sans-serif';
        this.deathScreen.style.textShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
        this.deathScreen.style.zIndex = '200';
        this.deathScreen.style.pointerEvents = 'none';
        this.deathScreen.style.opacity = '0';
        this.deathScreen.style.transition = 'opacity 1s ease';
        
        const eliminatedText = document.createElement('div');
        eliminatedText.textContent = 'ELIMINATED';
        eliminatedText.style.marginBottom = '1rem';
        this.deathScreen.appendChild(eliminatedText);
        
        const respawnText = document.createElement('div');
        respawnText.id = 'respawn-timer';
        respawnText.style.fontSize = '2rem';
        respawnText.style.opacity = '0.8';
        this.deathScreen.appendChild(respawnText);
        
        document.body.appendChild(this.deathScreen);
    }

    private setupEventListeners(): void {
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                from { opacity: 0.5; }
                to { opacity: 1.0; }
            }
            
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            #damage-flash {
                animation: fade-in 0.1s forwards;
            }
        `;
        document.head.appendChild(style);
    }

    public updateHealth(current: number, max: number = 100): void {
        this.maxHealth = max;
        this.currentHealth = current;

        // Update health bar
        const fill = document.getElementById('health-fill') as HTMLElement;
        const percentage = Math.max(0, current / max);
        fill.style.width = `${percentage * 100}%`;

        // Update health text
        this.healthValue.textContent = `${current}/${max}`;

        // Update color based on health percentage
        if (percentage > 0.6) {
            fill.style.background = 'linear-gradient(90deg, #2ecc71, #2ecc71)'; // Green
        } else if (percentage > 0.3) {
            fill.style.background = 'linear-gradient(90deg, #f39c12, #f39c12)'; // Orange
        } else {
            fill.style.background = 'linear-gradient(90deg, #e74c3c, #e74c3c)'; // Red
        }

        // Handle death
        if (current <= 0 && !this.isDead) {
            this.triggerDeath();
        }
        
        // Handle respawn
        if (this.isDead && current > 0) {
            this.respawn();
        }
    }

    public takeDamage(amount: number, direction: 'left' | 'right' | 'up' | 'down' | null = null): void {
        this.updateHealth(this.currentHealth - amount, this.maxHealth);
        this.flashDamage(direction);
    }

    private flashDamage(direction: 'left' | 'right' | 'up' | 'down' | null): void {
        const flash = this.damageFlash;
        flash.style.background = 'rgba(255, 0, 0, 0.4)';
        
        // Add directional damage indicator (optional)
        if (direction) {
            // Could enhance with directional flash effects in future
        }

        // Reset flash after 0.2s
        setTimeout(() => {
            flash.style.background = 'rgba(255, 0, 0, 0)';
        }, 200);
    }

    private triggerDeath(): void {
        this.isDead = true;
        this.deathScreen.style.opacity = '1';
        this.deathScreen.style.display = 'flex';
        
        // Start respawn countdown
        this.respawnTimer = 5; // 5 seconds
        this.updateRespawnTimer();
    }

    private updateRespawnTimer(): void {
        if (this.respawnTimer === null) return;
        
        const timerElement = document.getElementById('respawn-timer') as HTMLElement;
        timerElement.textContent = `Respawning in ${this.respawnTimer}s`;
        
        if (this.respawnTimer <= 0) {
            this.respawn();
            return;
        }
        
        this.respawnTimer--;
        setTimeout(() => this.updateRespawnTimer(), 1000);
    }

    public respawn(): void {
        this.isDead = false;
        this.deathScreen.style.opacity = '0';
        
        // Reset health to max
        this.updateHealth(this.maxHealth, this.maxHealth);
        
        // Clear respawn timer
        this.respawnTimer = null;
    }

    private checkLowHealth(): void {
        const percentage = this.currentHealth / this.maxHealth;
        
        if (percentage <= 0.25 && !this.lowHealthVignette.style.display) {
            this.lowHealthVignette.style.display = 'block';
        } else if (percentage > 0.25 && this.lowHealthVignette.style.display === 'block') {
            this.lowHealthVignette.style.display = 'none';
        }
    }

    public update(): void {
        this.checkLowHealth();
    }

    public hideAllEffects(): void {
        this.damageFlash.style.background = 'rgba(255, 0, 0, 0)';
        this.lowHealthVignette.style.display = 'none';
        this.deathScreen.style.opacity = '0';
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.healthHUD === 'undefined') {
        window.healthHUD = new HealthHUD();
    }
});
