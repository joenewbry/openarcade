import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { InputManager } from './input-manager.js';

export class PlayerController {
  private controls: PointerLockControls;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed = 5; // units per second
  private jumpHeight = 2; // units
  private gravity = -9.8; // m/s²
  private isOnGround = false;
  private collisionRadius = 0.5;
  private input: InputManager;
  private scene: THREE.Scene;
  private movementEnabled = false;
  private pointerHintEl: HTMLElement | null;
  private readonly eyeHeight = 1.6;
  private readonly hardFloorY = 1.6;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, input: InputManager) {
    this.scene = scene;
    this.input = input;

    this.controls = new PointerLockControls(camera, document.body);

    const controlledObject = this.controls.getObject();
    controlledObject.position.copy(camera.position);
    scene.add(controlledObject);

    this.pointerHintEl = document.getElementById('pointer-lock-hint');

    this.controls.addEventListener('lock', () => {
      this.updatePointerLockHint(false);
    });

    this.controls.addEventListener('unlock', () => {
      this.updatePointerLockHint(this.movementEnabled);
    });

    document.addEventListener('mousedown', this.onPointerCaptureClick);
    this.updatePointerLockHint(false);
  }

  private onPointerCaptureClick = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    if (!this.movementEnabled) return;
    if (this.controls.isLocked) return;

    this.controls.lock();
  };

  private updatePointerLockHint(visible: boolean): void {
    if (!this.pointerHintEl) return;
    this.pointerHintEl.style.display = visible ? 'block' : 'none';
  }

  public enable(): void {
    this.movementEnabled = true;
    this.controls.lock();
    this.updatePointerLockHint(!this.controls.isLocked);
  }

  public disable(): void {
    this.controls.unlock();
    this.movementEnabled = false;
    this.updatePointerLockHint(false);
  }

  public lockMovement(): void {
    this.movementEnabled = false;
    this.resetMovementState();
    this.updatePointerLockHint(false);
  }

  public unlockMovement(): void {
    this.movementEnabled = true;
    this.updatePointerLockHint(!this.controls.isLocked);
  }

  public resetMovementState(): void {
    this.velocity.set(0, 0, 0);
    this.isOnGround = false;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.controls.getObject().position.set(x, y, z);
  }

  private isArenaCollider(object: THREE.Object3D, playerObject: THREE.Object3D): boolean {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (node === playerObject) {
        return false;
      }
      node = node.parent;
    }

    node = object;
    while (node) {
      if (node.userData?.isArenaObject === true) {
        return true;
      }
      node = node.parent;
    }

    return false;
  }

  private probeGround(
    origin: THREE.Vector3,
    far: number,
    playerObject: THREE.Object3D
  ): THREE.Intersection | null {
    const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0), 0, far);
    const hits = raycaster.intersectObjects(this.scene.children, true)
      .filter((hit) => this.isArenaCollider(hit.object, playerObject));

    return hits.length > 0 ? hits[0] : null;
  }

  public update(deltaTime: number): void {
    if (!this.movementEnabled) return;

    // Gravity
    this.velocity.y += this.gravity * deltaTime;

    // Horizontal movement (WASD + Arrow Keys)
    const moveRight = (this.input.getAnyKey(['d', 'arrowright']) ? 1 : 0)
      - (this.input.getAnyKey(['a', 'arrowleft']) ? 1 : 0);
    const moveForward = (this.input.getAnyKey(['w', 'arrowup']) ? 1 : 0)
      - (this.input.getAnyKey(['s', 'arrowdown']) ? 1 : 0);

    // Normalize diagonal speed
    const mag = Math.hypot(moveRight, moveForward) || 1;
    const rightStep = (moveRight / mag) * this.moveSpeed * deltaTime;
    const forwardStep = (moveForward / mag) * this.moveSpeed * deltaTime;

    this.controls.moveRight(rightStep);
    this.controls.moveForward(forwardStep);

    // Jump
    if (this.input.getKey(' ') && this.isOnGround) {
      this.velocity.y = Math.sqrt(2 * this.jumpHeight * -this.gravity);
      this.isOnGround = false;
    }

    // Vertical motion
    const object = this.controls.getObject();
    object.position.y += this.velocity.y * deltaTime;

    // Ground collision check (near probe + recovery probe)
    const nearOrigin = new THREE.Vector3(object.position.x, object.position.y + 0.25, object.position.z);
    const nearHit = this.probeGround(nearOrigin, this.eyeHeight + 2.5, object);

    let groundY: number | null = nearHit?.point.y ?? null;

    // Recovery probe from high up prevents missed-collision infinite falls.
    if (groundY === null) {
      const farOrigin = new THREE.Vector3(
        object.position.x,
        Math.max(object.position.y + 0.25, this.eyeHeight + 40),
        object.position.z
      );
      const farHit = this.probeGround(farOrigin, 120, object);
      groundY = farHit?.point.y ?? null;
    }

    this.isOnGround = false;
    if (groundY !== null) {
      const targetEyeY = groundY + this.eyeHeight;
      const closeToGround = object.position.y <= targetEyeY + 0.2;

      if (closeToGround) {
        this.isOnGround = true;
        this.velocity.y = 0;
        object.position.y = Math.max(object.position.y, targetEyeY);
      }
    }

    // Hard safety floor clamp to avoid infinite fall if collision misses.
    if (!this.isOnGround && object.position.y < this.hardFloorY) {
      this.isOnGround = true;
      this.velocity.y = 0;
      object.position.y = this.hardFloorY;
    }

    // Simple anti-wall clipping against local mesh bounds
    const playerPosition = object.position.clone();

    this.scene.traverse((child: any) => {
      if (!child.isMesh || !child.geometry || !child.geometry.boundingSphere) return;

      let node: any = child;
      let isArenaWall = false;
      while (node) {
        if (node.userData?.isWall === true) {
          isArenaWall = true;
          break;
        }
        node = node.parent;
      }

      if (!isArenaWall) return;

      const sphere = child.geometry.boundingSphere;
      const radius = sphere.radius || 0.5;
      if (radius > 10) return; // Ignore giant bounds (ground, sky pieces)

      const worldCenter = sphere.center.clone().applyMatrix4(child.matrixWorld);
      const distance = playerPosition.distanceTo(worldCenter);

      if (distance < this.collisionRadius + radius) {
        const pushDir = playerPosition.clone().sub(worldCenter).normalize();
        object.position.add(pushDir.multiplyScalar(0.06));
      }
    });
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
