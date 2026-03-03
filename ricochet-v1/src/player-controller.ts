import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { InputManager } from './input-manager.js';
import { KeyBindingManager } from './input-bindings.js';

export interface PlayerMovementState {
  walkBobOffset: {
    x: number;
    y: number;
  };
  isMoving: boolean;
  isCrouching: boolean;
  isOnGround: boolean;
  moveSpeedScale: number;
}

export class PlayerController {
  private controls: PointerLockControls;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed = 5; // units per second
  private jumpHeight = 2; // units
  private gravity = -9.8; // m/s²
  private isOnGround = false;

  private baseCollisionRadius = 0.5;
  private crouchCollisionRadius = 0.42;
  private collisionRadius = this.baseCollisionRadius;

  private readonly crouchMoveSpeedMultiplier = 0.55;

  private readonly standEyeHeight = 1.6;
  private readonly crouchEyeHeight = 1.05;
  private eyeHeight = this.standEyeHeight;
  private targetEyeHeight = this.standEyeHeight;
  private readonly hardFloorHeight = 1.6;
  private readonly crouchTransitionSpeed = 12;
  private readonly groundStickBuffer = 0.58;

  private readonly walkBobSpeed = 9;
  private readonly walkBobRecoverySpeed = 10;
  private readonly walkBobAmplitude = {
    x: 0.02,
    y: 0.028
  };
  private walkBobPhase = 0;
  private walkBobOffset = { x: 0, y: 0 };
  private walkBobIntensity = 0;

  private input: InputManager;
  private keyBindingManager: KeyBindingManager;
  private scene: THREE.Scene;
  private movementEnabled = false;
  private pointerHintEl: HTMLElement | null;

  private isCrouching = false;
  private previousCrouchPressed = false;

  private movementState: PlayerMovementState = {
    walkBobOffset: { x: 0, y: 0 },
    isMoving: false,
    isCrouching: false,
    isOnGround: false,
    moveSpeedScale: 1
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    input: InputManager,
    keyBindingManager: KeyBindingManager
  ) {
    this.scene = scene;
    this.input = input;
    this.keyBindingManager = keyBindingManager;

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

  private easeTowards(current: number, target: number, speed: number, deltaSeconds: number): number {
    const blend = 1 - Math.exp(-speed * deltaSeconds);
    return current + (target - current) * blend;
  }

  public enable(): void {
    this.movementEnabled = true;
    this.controls.lock();
    this.updatePointerLockHint(!this.controls.isLocked);
  }

  public disable(): void {
    this.controls.unlock();
    this.movementEnabled = false;
    this.resetCrouchState();
    this.updatePointerLockHint(false);
  }

  public lockMovement(): void {
    this.movementEnabled = false;
    this.resetMovementState();
    this.resetCrouchState();
    this.updatePointerLockHint(false);
  }

  public unlockMovement(): void {
    this.movementEnabled = true;
    this.updatePointerLockHint(!this.controls.isLocked);
  }

  private resetCrouchState(): void {
    this.isCrouching = false;
    this.previousCrouchPressed = false;
    this.targetEyeHeight = this.standEyeHeight;
    this.eyeHeight = this.standEyeHeight;
    this.collisionRadius = this.baseCollisionRadius;
  }

  public resetMovementState(): void {
    this.velocity.set(0, 0, 0);
    this.isOnGround = false;
    this.walkBobPhase = 0;
    this.walkBobOffset = { x: 0, y: 0 };
    this.walkBobIntensity = 0;
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

  private updateCrouchState(bindings: ReturnType<KeyBindingManager['getBindings']>): void {
    const crouchPressed = this.input.isActionActive('crouch', bindings);

    if (this.keyBindingManager.isCrouchToggle()) {
      if (crouchPressed && !this.previousCrouchPressed) {
        this.isCrouching = !this.isCrouching;
      }
      this.previousCrouchPressed = crouchPressed;
    } else {
      this.isCrouching = crouchPressed;
      this.previousCrouchPressed = crouchPressed;
    }

    this.targetEyeHeight = this.isCrouching ? this.crouchEyeHeight : this.standEyeHeight;
    this.collisionRadius = this.isCrouching ? this.crouchCollisionRadius : this.baseCollisionRadius;
  }

  private updateWalkBob(
    deltaSeconds: number,
    isMoving: boolean,
    speedScale: number
  ): void {
    const wantsBob = isMoving && this.isOnGround && !this.isCrouching;

    if (wantsBob) {
      this.walkBobIntensity = Math.min(1, this.walkBobIntensity + deltaSeconds * this.walkBobRecoverySpeed);
      this.walkBobPhase += deltaSeconds * this.walkBobSpeed * Math.PI * 2 * Math.max(0.35, speedScale);

      const loop = Math.PI * 2;
      if (this.walkBobPhase > loop) {
        this.walkBobPhase -= Math.floor(this.walkBobPhase / loop) * loop;
      }
    } else {
      this.walkBobIntensity = Math.max(0, this.walkBobIntensity - deltaSeconds * this.walkBobRecoverySpeed);
      if (this.walkBobIntensity <= 0) {
        this.walkBobPhase = 0;
      }
    }

    const cadenceScale = THREE.MathUtils.clamp(speedScale, 0, 1) * 0.8;
    const targetX = wantsBob
      ? Math.sin(this.walkBobPhase) * this.walkBobAmplitude.x * cadenceScale
      : 0;
    const targetY = wantsBob
      ? Math.abs(Math.cos(this.walkBobPhase)) * this.walkBobAmplitude.y * cadenceScale
      : 0;

    this.walkBobOffset.x = this.easeTowards(
      this.walkBobOffset.x,
      targetX,
      this.walkBobRecoverySpeed,
      deltaSeconds
    );
    this.walkBobOffset.y = this.easeTowards(
      this.walkBobOffset.y,
      targetY,
      this.walkBobRecoverySpeed,
      deltaSeconds
    );

    this.walkBobOffset.x *= this.walkBobIntensity;
    this.walkBobOffset.y *= this.walkBobIntensity;
  }

  public update(deltaTime: number): void {
    if (!this.movementEnabled) return;

    const bindings = this.keyBindingManager.getBindings();
    this.updateCrouchState(bindings);
    this.eyeHeight = this.easeTowards(this.eyeHeight, this.targetEyeHeight, this.crouchTransitionSpeed, deltaTime);

    // Gravity
    this.velocity.y += this.gravity * deltaTime;

    // Horizontal movement (WASD + Arrow Keys via action bindings)
    const moveRight = (this.input.isActionActive('moveRight', bindings) ? 1 : 0)
      - (this.input.isActionActive('moveLeft', bindings) ? 1 : 0);
    const moveForward = (this.input.isActionActive('moveForward', bindings) ? 1 : 0)
      - (this.input.isActionActive('moveBackward', bindings) ? 1 : 0);

    const mag = Math.hypot(moveRight, moveForward);
    const isMoving = mag > 0;
    const normalizedRight = moveRight / (mag || 1);
    const normalizedForward = moveForward / (mag || 1);

    const currentMoveSpeed = this.moveSpeed * (this.isCrouching ? this.crouchMoveSpeedMultiplier : 1);
    const rightStep = normalizedRight * currentMoveSpeed * deltaTime;
    const forwardStep = normalizedForward * currentMoveSpeed * deltaTime;

    this.controls.moveRight(isMoving ? rightStep : 0);
    this.controls.moveForward(isMoving ? forwardStep : 0);

    const moveSpeedScale = isMoving
      ? (this.isCrouching ? this.crouchMoveSpeedMultiplier : 1) * Math.min(1, mag)
      : 0;

    // Jump
    if (this.input.isActionActive('jump', bindings) && this.isOnGround && !this.isCrouching) {
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
        Math.max(object.position.y + 0.25, this.hardFloorHeight + 40),
        object.position.z
      );
      const farHit = this.probeGround(farOrigin, 120, object);
      groundY = farHit?.point.y ?? null;
    }

    this.isOnGround = false;
    if (groundY !== null && this.velocity.y <= 0) {
      const targetEyeY = groundY + this.eyeHeight;
      if (object.position.y <= targetEyeY + this.groundStickBuffer) {
        this.isOnGround = true;
        this.velocity.y = 0;
        object.position.y = targetEyeY;
      }
    }

    // Hard safety floor clamp to avoid infinite fall if collision misses.
    if (!this.isOnGround && object.position.y < this.targetEyeHeight) {
      this.isOnGround = true;
      this.velocity.y = 0;
      object.position.y = Math.max(object.position.y, this.targetEyeHeight);
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

    this.updateWalkBob(deltaTime, isMoving, moveSpeedScale);

    this.movementState = {
      walkBobOffset: {
        x: this.walkBobOffset.x,
        y: this.walkBobOffset.y
      },
      isMoving,
      isCrouching: this.isCrouching,
      isOnGround: this.isOnGround,
      moveSpeedScale
    };
  }

  public getMovementState(): PlayerMovementState {
    return {
      walkBobOffset: {
        x: this.movementState.walkBobOffset.x,
        y: this.movementState.walkBobOffset.y
      },
      isMoving: this.movementState.isMoving,
      isCrouching: this.movementState.isCrouching,
      isOnGround: this.movementState.isOnGround,
      moveSpeedScale: this.movementState.moveSpeedScale
    };
  }

  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  public setJumpHeight(height: number): void {
    this.jumpHeight = height;
  }

  public setCollisionRadius(radius: number): void {
    const nextRadius = Math.max(0.1, radius);
    this.baseCollisionRadius = nextRadius;
    if (!this.isCrouching) {
      this.collisionRadius = nextRadius;
    }
  }
}
