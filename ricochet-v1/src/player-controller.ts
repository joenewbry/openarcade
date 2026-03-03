import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { InputManager } from './input-manager.js';

export class PlayerController {
  private controls: PointerLockControls;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed = 5; // units per second
  private jumpHeight = 2; // units
  private gravity = -9.8; // m/s²
  private isOnGround = false;
  private collisionRadius = 0.5;
  private input: InputManager;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private player: THREE.Group | null = null;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, input: InputManager) {
    this.camera = camera;
    this.scene = scene;
    this.input = input;

    // Initialize PointerLockControls
    this.controls = new PointerLockControls(camera, document.body);
    this.controls.enabled = false; // Disabled until pointer is locked
    this.controls.mouseSpeed = input.getSensitivity();

    // Setup physics properties
    this.velocity.y = 0;
    
    // Initialize direction vector
    this.direction.set(0, 0, 0);

    // Add controls to the scene
    scene.add(this.controls.getObject());
  }

  public enable(): void {
    this.controls.enable = true;
    this.input.requestPointerLock();
  }

  public update(deltaTime: number): void {
    if (!this.controls.enabled) return;

    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;

    // Get input direction
    this.direction.set(0, 0, 0);
    const forward = this.controls.getDirection(new THREE.Vector3(0, 0, -1));
    const right = this.controls.getDirection(new THREE.Vector3(1, 0, 0));

    if (this.input.getKey('w')) this.direction.add(forward);
    if (this.input.getKey('s')) this.direction.add(forward.multiplyScalar(-1));
    if (this.input.getKey('a')) this.direction.add(right.multiplyScalar(-1));
    if (this.input.getKey('d')) this.direction.add(right);
    
    // Normalize direction to prevent faster diagonal movement
    this.direction.normalize();

    // Apply movement speed
    this.velocity.x = this.direction.x * this.moveSpeed * deltaTime;
    this.velocity.z = this.direction.z * this.moveSpeed * deltaTime;

    // Jump if on ground and space is pressed
    if (this.input.getKey(' ') && this.isOnGround) {
      this.velocity.y = Math.sqrt(2 * this.jumpHeight * -this.gravity);
      this.isOnGround = false;
    }

    // Move player
    this.controls.moveRight(this.velocity.x);
    this.controls.moveForward(this.velocity.z);
    
    // Apply vertical movement (gravity + jump)
    const object = this.controls.getObject();
    object.position.y += this.velocity.y * deltaTime;

    // Raycast for ground detection (collision)
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(object.position.x, object.position.y - this.collisionRadius, object.position.z);
    const direction = new THREE.Vector3(0, -1, 0);
    
    raycaster.set(origin, direction);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    // Check for ground collision
    this.isOnGround = false;
    for (const intersect of intersects) {
      if (intersect.distance <= this.collisionRadius) {
        this.isOnGround = true;
        this.velocity.y = 0; // Reset vertical velocity when on ground
        
        // Snaps player to ground level to prevent floating
        object.position.y = intersect.point.y + this.collisionRadius;
        break;
      }
    }

    // Prevent clipping through walls with simple collision response
    // Simple sphere-box collision check - only for static walls
    const playerPosition = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
    
    this.scene.traverse((child: any) => {
      if (child.isMesh && child.geometry && child.geometry.boundingSphere) {
        const box = child.geometry.boundingSphere;
        const distance = playerPosition.distanceTo(child.position);
        
        // Simple sphere-box collision detection
        if (distance < this.collisionRadius + (box.radius || 0.5)) {
          // Push player away from wall
          const directionToWall = playerPosition.clone().sub(child.position).normalize();
          object.position.sub(directionToWall.multiplyScalar(0.1));
        }
      }
    });

    // Update controls orientation
    const mouseDelta = this.input.getMouseDelta();
    this.controls.update(deltaTime);
  }

  public getPlayer(): THREE.Group | null {
    return this.player;
  }

  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  public setJumpHeight(height: number): void {
    this.jumpHeight = height;
  }

  public setCollisionRadius(radius: number): void {
    this.collisionRadius = radius;
  }
}