import * as THREE from 'three';

export class HealthSystem {
  private hp = 100;
  private readonly maxHp = 100;
  private isDead = false;
  private readonly player: THREE.Group;

  constructor(player: THREE.Group) {
    this.player = player;
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.setHealth(this.hp - amount);
    console.log(`Player took ${amount} damage! HP: ${this.hp}/${this.maxHp}`);
  }

  public setHealth(hp: number): void {
    this.hp = Math.max(0, Math.min(this.maxHp, Math.round(hp)));

    if (this.hp <= 0) {
      this.die();
    }
  }

  public die(): void {
    if (this.isDead) return;

    this.isDead = true;
    this.hp = 0;
    this.player.visible = false;
    console.log('PLAYER IS DEAD');
  }

  public revive(): void {
    this.isDead = false;
    this.hp = this.maxHp;
    this.player.visible = true;
    console.log('Player revived!');
  }

  public getHealth(): number {
    return this.hp;
  }

  public getMaxHealth(): number {
    return this.maxHp;
  }

  public isPlayerDead(): boolean {
    return this.isDead;
  }
}

export function createHealthSystem(player: THREE.Group): HealthSystem {
  return new HealthSystem(player);
}
