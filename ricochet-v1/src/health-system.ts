import * as THREE from 'three';

export class HealthSystem {
  private hp: number = 100;
  private maxHp: number = 100;
  private isDead: boolean = false;
  private player: THREE.Group | null = null;

  constructor(player: THREE.Group) {
    this.player = player;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.hp = Math.max(0, this.hp - amount);
    console.log(`Player took ${amount} damage! HP: ${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.die();
    }
  }

  public die(): void {
    this.isDead = true;
    this.hp = 0;
    console.log('PLAYER IS DEAD');

    // Disable player movement and controls
    if (this.player) {
      // Stop any player movement by clearing velocity
      // (This assumes we can access the player controller or modify the player object)
      // For now, we'll just log
      console.log('Player movement disabled due to death');
    }
  }

  public revive(): void {
    this.isDead = false;
    this.hp = this.maxHp;
    console.log('Player revived!');
  }

  public getHealth(): number {
    return this.hp;
  }

  public isPlayerDead(): boolean {
    return this.isDead;
  }
}

export function createHealthSystem(player: THREE.Group): HealthSystem {
  return new HealthSystem(player);
}