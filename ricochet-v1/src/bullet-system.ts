import * as THREE from 'three';

export class BulletSystem {
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private bullets: Array<BulletData> = [];
  private maxBounces: number = 5;
  private trailDuration: number = 0.5; // seconds
  
  private material: THREE.LineBasicMaterial;
  private bulletGeometry: THREE.SphereGeometry;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    
    // Setup bullet geometry and material
    this.bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    this.material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    
    // Initialize
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    document.addEventListener('click', (event) => {
      this.fireBullet(event);
    });
  }
  
  public fireBullet(event: MouseEvent) {
    // Get mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Set raycaster from camera through mouse
    this.raycaster.setFromCamera(mouse, this.scene.children.find(c => c instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera);
    
    // Calculate direction vector
    const direction = this.raycaster.ray.direction.clone().normalize();
    const origin = this.raycaster.ray.origin.clone();
    
    // Create bullet
    const bullet = new BulletData(origin, direction);
    this.bullets.push(bullet);
    
    // Create trail
    const trail = this.createTrail(origin, direction);
    bullet.trail = trail;
    this.scene.add(trail);
    
    console.log('Bullet fired:', bullet.position);
  }
  
  private createTrail(start: THREE.Vector3, direction: THREE.Vector3): THREE.Line {
    const points = [start];
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const trail = new THREE.Line(trailGeometry, this.material);
    trail.userData = { 
      startTime: Date.now(), 
      segments: 1, 
      points: points
    };
    return trail;
  }
  
  public update(deltaTime: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Update position
      bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));
      
      // Update trail
      if (bullet.trail) {
        const trail = bullet.trail;
        const currentTime = Date.now();
        const age = (currentTime - trail.userData.startTime) / 1000;
        
        // Fade trail over time
        const opacity = Math.max(0, 1 - age / this.trailDuration);
        trail.material.opacity = opacity;
        
        // Remove trail if faded
        if (opacity <= 0.01 && trail.geometry.attributes.position.array.length > 1) {
          this.scene.remove(trail);
          this.bullets.splice(i, 1);
          continue;
        }
        
        // Add point to trail if not too dense
        if (trail.geometry.attributes.position.array.length < 20) {
          const lastPoint = new THREE.Vector3().fromArray(trail.geometry.attributes.position.array, -3);
          const distance = bullet.position.distanceTo(lastPoint);
          if (distance > 0.1) {
            const points = trail.geometry.attributes.position.array;
            const newPoints = [...points, bullet.position.x, bullet.position.y, bullet.position.z];
            trail.geometry.setFromPoints(newPoints.map(p => new THREE.Vector3()));
            trail.geometry.attributes.position.needsUpdate = true;
          }
        }
      }
      
      // Check for collision
      const intersected = this.checkCollision(bullet);
      if (intersected) {
        bullet.bounces++;
        
        // Check if max bounces reached
        if (bullet.bounces >= this.maxBounces) {
          this.scene.remove(bullet.trail!);
          this.bullets.splice(i, 1);
          continue;
        }
        
        // Create impact effect
        this.createImpactEffect(intersected.point);
        
        // Calculate reflection
        const reflected = this.reflectVector(bullet.velocity, intersected.normal);
        bullet.velocity.copy(reflected);
        
        // Update trail with new direction
        if (bullet.trail) {
          const points = bullet.trail.geometry.attributes.position.array;
          points.push(bullet.position.x, bullet.position.y, bullet.position.z);
          bullet.trail.geometry.setFromPoints(points.map(p => new THREE.Vector3()));
          bullet.trail.geometry.attributes.position.needsUpdate = true;
        }
        
        // Check if hit a character (player or enemy)
        const hitCharacter = this.checkCharacterHit(intersected);
        if (hitCharacter) {
          this.applyDamageToPlayer(hitCharacter);
        }
      }
    }
  }
  
  private checkCollision(bullet: BulletData): THREE.Intersection | null {
    // Only check against static walls and characters (player/enemies)
    const objects = this.scene.children.filter(child => 
      child instanceof THREE.Mesh && 
      (child.userData.isCharacter || child.name !== 'ground')
    );
    
    this.raycaster.set(bullet.position, bullet.velocity.clone().normalize());
    const intersections = this.raycaster.intersectObjects(objects, false);
    
    if (intersections.length > 0) {
      return intersections[0];
    }
    
    return null;
  }
  
  private checkCharacterHit(intersection: THREE.Intersection): THREE.Group | null {
    // Check if intersected object has isCharacter flag
    if (intersection.object.userData.isCharacter) {
      // Return the parent group if it's a character model
      return intersection.object.parent as THREE.Group;
    }
    return null;
  }
  
  private applyDamageToPlayer(character: THREE.Group): void {
    // Get the game instance and health system
    // Note: This assumes the game instance is available on window for simplicity
    // In a better architecture, you'd inject this dependency
    const game = (window as any).game;
    if (!game || !game.getHealthSystem()) return;
    
    const healthSystem = game.getHealthSystem();
    if (healthSystem && !healthSystem.isPlayerDead()) {
      // AK bullet deals 35 damage
      healthSystem.takeDamage(35);
    }
  }
  
  private reflectVector(incident: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    // reflected = incident - 2 * (incident · normal) * normal
    const dot = incident.dot(normal);
    const reflected = incident.clone().sub(
      normal.clone().multiplyScalar(2 * dot)
    );
    return reflected;
  }
  
  private createImpactEffect(point: THREE.Vector3) {
    // Create sparks
    const sparksGeometry = new THREE.BufferGeometry();
    const sparksMaterial = new THREE.PointsMaterial({
      color: 0xffcc00,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });
    
    const sparksPositions = [];
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 0.3;
      const y = (Math.random() - 0.5) * 0.3;
      const z = (Math.random() - 0.5) * 0.3;
      sparksPositions.push(point.x + x, point.y + y, point.z + z);
    }
    
    sparksGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparksPositions, 3));
    const sparks = new THREE.Points(sparksGeometry, sparksMaterial);
    this.scene.add(sparks);
    
    // Animate and remove after 0.5s
    setTimeout(() => {
      this.scene.remove(sparks);
    }, 500);
  }
}

// Data structure to track bullet state
type BulletData = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bounces: number;
  trail: THREE.Line | null;
};

export function createBulletSystem(scene: THREE.Scene): BulletSystem {
  return new BulletSystem(scene);
}
