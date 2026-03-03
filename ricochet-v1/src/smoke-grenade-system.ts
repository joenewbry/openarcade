import * as THREE from 'three';

export const SMOKE_GRENADE_TUNING = {
  THROW_COOLDOWN_MS: 950,
  THROW_SPEED: 12.5,
  THROW_UPWARD_VELOCITY: 4.4,
  THROW_SPAWN_OFFSET: 0.55,
  THROW_GRAVITY: 15.5,
  PROJECTILE_RADIUS: 0.12,
  PROJECTILE_LIFETIME_MS: 2200,

  SMOKE_RADIUS: 3.8,
  SMOKE_LIFETIME_MS: 10000,
  SMOKE_FADE_IN_MS: 450,
  SMOKE_FADE_OUT_MS: 1700,
  MAX_ACTIVE_SMOKES: 2,
  PUFF_COUNT: 18,

  COLLIDER_CACHE_MS: 300
} as const;

interface SmokeGrenadeProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bornMs: number;
}

interface SmokePuff {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  baseOffset: THREE.Vector3;
  drift: THREE.Vector3;
  baseScale: number;
  phase: number;
}

interface SmokeVolume {
  group: THREE.Group;
  shellMaterial: THREE.MeshBasicMaterial;
  center: THREE.Vector3;
  radius: number;
  bornMs: number;
  lifetimeMs: number;
  puffs: SmokePuff[];
}

export class SmokeGrenadeSystem {
  private readonly scene: THREE.Scene;
  private readonly raycaster = new THREE.Raycaster();

  private readonly grenadeGeometry = new THREE.SphereGeometry(SMOKE_GRENADE_TUNING.PROJECTILE_RADIUS, 14, 14);
  private readonly grenadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3139,
    roughness: 0.75,
    metalness: 0.35
  });
  private readonly smokeSphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  private readonly smokePuffTexture = this.createSmokeTexture();

  private readonly projectiles: SmokeGrenadeProjectile[] = [];
  private readonly smokes: SmokeVolume[] = [];

  private colliderCacheAtMs = 0;
  private cachedColliderChildCount = -1;
  private cachedArenaColliders: THREE.Object3D[] = [];

  private lastThrowMs = -Infinity;

  private statusEl: HTMLElement | null = null;
  private overlayEl: HTMLElement | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public bindHud(statusEl: HTMLElement | null, overlayEl: HTMLElement | null): void {
    this.statusEl = statusEl;
    this.overlayEl = overlayEl;
    this.updateStatusLabel(performance.now());
    this.resetOverlay();
  }

  public throwGrenade(origin: THREE.Vector3, direction: THREE.Vector3): boolean {
    const now = performance.now();
    if (now - this.lastThrowMs < SMOKE_GRENADE_TUNING.THROW_COOLDOWN_MS) {
      this.updateStatusLabel(now);
      return false;
    }

    this.lastThrowMs = now;

    const dir = direction.clone().normalize();
    const spawn = origin.clone().addScaledVector(dir, SMOKE_GRENADE_TUNING.THROW_SPAWN_OFFSET);
    spawn.y = Math.max(0.45, spawn.y - 0.1);

    const velocity = dir.multiplyScalar(SMOKE_GRENADE_TUNING.THROW_SPEED);
    velocity.y += SMOKE_GRENADE_TUNING.THROW_UPWARD_VELOCITY;

    const mesh = new THREE.Mesh(this.grenadeGeometry, this.grenadeMaterial);
    mesh.position.copy(spawn);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 61;
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      position: spawn,
      velocity,
      bornMs: now
    });

    this.updateStatusLabel(now);
    return true;
  }

  public update(deltaTime: number, camera: THREE.Camera): void {
    const now = performance.now();

    this.updateProjectiles(deltaTime, now);
    this.updateSmokes(now);
    this.updateOverlay(camera, now);
    this.updateStatusLabel(now);
  }

  public clear(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }

    for (let i = this.smokes.length - 1; i >= 0; i--) {
      this.removeSmoke(i);
    }

    this.lastThrowMs = -Infinity;
    this.updateStatusLabel(performance.now());
    this.resetOverlay();
  }

  public getLineVisibilityMultiplier(from: THREE.Vector3, to: THREE.Vector3): number {
    const now = performance.now();
    let multiplier = 1;

    for (const smoke of this.smokes) {
      const density = this.computeSmokeDensity(smoke, now);
      if (density <= 0.01) continue;

      const overlap = this.segmentSphereOverlap(from, to, smoke.center, smoke.radius * 0.95);
      if (overlap <= 0) continue;

      const candidate = 1 - overlap * density * 0.82;
      multiplier = Math.min(multiplier, candidate);
    }

    return THREE.MathUtils.clamp(multiplier, 0.16, 1);
  }

  private updateProjectiles(deltaTime: number, nowMs: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (nowMs - projectile.bornMs > SMOKE_GRENADE_TUNING.PROJECTILE_LIFETIME_MS) {
        this.deploySmoke(projectile.position.clone());
        this.removeProjectile(i);
        continue;
      }

      projectile.velocity.y -= SMOKE_GRENADE_TUNING.THROW_GRAVITY * deltaTime;

      const step = projectile.velocity.clone().multiplyScalar(deltaTime);
      const stepDistance = step.length();
      if (stepDistance <= 1e-5) continue;

      const direction = step.clone().normalize();
      const hit = this.castToArena(
        projectile.position,
        direction,
        stepDistance + SMOKE_GRENADE_TUNING.PROJECTILE_RADIUS
      );

      if (hit) {
        const normal = this.getImpactNormal(hit, direction.clone().negate());
        const contact = hit.point.clone().addScaledVector(normal, 0.08);
        this.deploySmoke(contact);
        this.removeProjectile(i);
        continue;
      }

      projectile.position.add(step);
      projectile.mesh.position.copy(projectile.position);

      if (projectile.position.y <= 0.06) {
        projectile.position.y = 0.06;
        this.deploySmoke(projectile.position.clone());
        this.removeProjectile(i);
      }
    }
  }

  private updateSmokes(nowMs: number): void {
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const smoke = this.smokes[i];
      const ageMs = nowMs - smoke.bornMs;

      if (ageMs >= smoke.lifetimeMs) {
        this.removeSmoke(i);
        continue;
      }

      const density = this.computeSmokeDensity(smoke, nowMs);
      smoke.shellMaterial.opacity = 0.24 * density;

      for (const puff of smoke.puffs) {
        const flutter = Math.sin(nowMs * 0.0016 + puff.phase) * 0.18
          + Math.cos(nowMs * 0.0012 + puff.phase * 1.9) * 0.1;

        puff.sprite.position.set(
          puff.baseOffset.x + puff.drift.x * flutter,
          puff.baseOffset.y + puff.drift.y * flutter,
          puff.baseOffset.z + puff.drift.z * flutter
        );

        const scalePulse = 1 + 0.08 * Math.sin(nowMs * 0.001 + puff.phase * 1.1);
        const puffScale = puff.baseScale * scalePulse;
        puff.sprite.scale.set(puffScale, puffScale, 1);
        puff.material.opacity = 0.135 * density;
      }
    }
  }

  private updateOverlay(camera: THREE.Camera, nowMs: number): void {
    if (!this.overlayEl) return;

    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const lookEnd = cameraPosition.clone().addScaledVector(cameraDirection, 12);

    let intensity = 0;

    for (const smoke of this.smokes) {
      const density = this.computeSmokeDensity(smoke, nowMs);
      if (density <= 0.01) continue;

      const distToCenter = cameraPosition.distanceTo(smoke.center);
      if (distToCenter < smoke.radius) {
        const insideRatio = 1 - distToCenter / smoke.radius;
        intensity = Math.max(intensity, (0.28 + insideRatio * 0.55) * density);
      }

      const lineOverlap = this.segmentSphereOverlap(cameraPosition, lookEnd, smoke.center, smoke.radius);
      if (lineOverlap > 0) {
        intensity = Math.max(intensity, lineOverlap * 0.42 * density);
      }
    }

    const clamped = THREE.MathUtils.clamp(intensity, 0, 0.82);
    this.overlayEl.style.setProperty('--smoke-strength', clamped.toFixed(3));

    if (clamped > 0.02) {
      this.overlayEl.classList.add('smoke-active');
    } else {
      this.overlayEl.classList.remove('smoke-active');
    }
  }

  private resetOverlay(): void {
    if (!this.overlayEl) return;
    this.overlayEl.style.setProperty('--smoke-strength', '0');
    this.overlayEl.classList.remove('smoke-active');
  }

  private deploySmoke(position: THREE.Vector3): void {
    while (this.smokes.length >= SMOKE_GRENADE_TUNING.MAX_ACTIVE_SMOKES) {
      this.removeSmoke(0);
    }

    const center = position.clone();
    center.y = Math.max(0.32, center.y);

    const group = new THREE.Group();
    group.position.copy(center);

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xc4ccd2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const shell = new THREE.Mesh(this.smokeSphereGeometry, shellMaterial);
    shell.scale.setScalar(SMOKE_GRENADE_TUNING.SMOKE_RADIUS);
    shell.renderOrder = 63;
    group.add(shell);

    const puffs: SmokePuff[] = [];
    for (let i = 0; i < SMOKE_GRENADE_TUNING.PUFF_COUNT; i++) {
      const puffMaterial = new THREE.SpriteMaterial({
        map: this.smokePuffTexture,
        color: 0xb9c4cb,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true
      });

      const sprite = new THREE.Sprite(puffMaterial);
      sprite.renderOrder = 64;

      const baseOffset = this.randomPointInSphere(SMOKE_GRENADE_TUNING.SMOKE_RADIUS * 0.82);
      const drift = this.randomPointInSphere(1.45);
      const baseScale = THREE.MathUtils.randFloat(
        SMOKE_GRENADE_TUNING.SMOKE_RADIUS * 1.15,
        SMOKE_GRENADE_TUNING.SMOKE_RADIUS * 1.85
      );

      sprite.position.copy(baseOffset);
      sprite.scale.set(baseScale, baseScale, 1);
      group.add(sprite);

      puffs.push({
        sprite,
        material: puffMaterial,
        baseOffset,
        drift,
        baseScale,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.scene.add(group);

    this.smokes.push({
      group,
      shellMaterial,
      center,
      radius: SMOKE_GRENADE_TUNING.SMOKE_RADIUS,
      bornMs: performance.now(),
      lifetimeMs: SMOKE_GRENADE_TUNING.SMOKE_LIFETIME_MS,
      puffs
    });

    this.updateStatusLabel(performance.now());
  }

  private removeProjectile(index: number): void {
    const projectile = this.projectiles[index];
    if (!projectile) return;

    this.scene.remove(projectile.mesh);
    this.projectiles.splice(index, 1);
  }

  private removeSmoke(index: number): void {
    const smoke = this.smokes[index];
    if (!smoke) return;

    this.scene.remove(smoke.group);
    smoke.shellMaterial.dispose();

    for (const puff of smoke.puffs) {
      puff.material.dispose();
    }

    this.smokes.splice(index, 1);
  }

  private updateStatusLabel(nowMs: number): void {
    if (!this.statusEl) return;

    const cooldownMs = Math.max(0, SMOKE_GRENADE_TUNING.THROW_COOLDOWN_MS - (nowMs - this.lastThrowMs));
    const active = this.smokes.length;
    const max = SMOKE_GRENADE_TUNING.MAX_ACTIVE_SMOKES;

    const cooldownLabel = cooldownMs <= 0
      ? 'READY'
      : `${(cooldownMs / 1000).toFixed(1)}s`;

    this.statusEl.textContent = `Smoke: ${cooldownLabel} • Active ${active}/${max}`;
    this.statusEl.style.color = cooldownMs <= 0 ? '#d8dfff' : '#aab4db';
  }

  private castToArena(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): THREE.Intersection | null {
    const colliders = this.getArenaColliders();
    if (colliders.length === 0) return null;

    this.raycaster.set(origin, direction);
    this.raycaster.near = 0;
    this.raycaster.far = maxDistance;

    const hits = this.raycaster.intersectObjects(colliders, false);
    return hits.length > 0 ? hits[0] : null;
  }

  private getArenaColliders(): THREE.Object3D[] {
    const now = performance.now();

    if (
      this.cachedArenaColliders.length > 0
      && now - this.colliderCacheAtMs < SMOKE_GRENADE_TUNING.COLLIDER_CACHE_MS
      && this.cachedColliderChildCount === this.scene.children.length
    ) {
      return this.cachedArenaColliders;
    }

    const colliders: THREE.Object3D[] = [];

    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!this.isArenaSurface(obj)) return;
      colliders.push(obj);
    });

    this.cachedArenaColliders = colliders;
    this.cachedColliderChildCount = this.scene.children.length;
    this.colliderCacheAtMs = now;

    return this.cachedArenaColliders;
  }

  private isArenaSurface(object: THREE.Object3D): boolean {
    if (!object.visible) return false;
    if (object.name.startsWith('fp-')) return false;

    let node: THREE.Object3D | null = object;
    while (node) {
      if (node.userData?.isArenaObject || node.userData?.isWall || node.userData?.isGround) {
        return true;
      }
      node = node.parent;
    }

    return false;
  }

  private getImpactNormal(hit: THREE.Intersection, fallback: THREE.Vector3): THREE.Vector3 {
    if (hit.face) {
      const worldNormal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      worldNormal.applyMatrix3(normalMatrix).normalize();
      return worldNormal;
    }

    return fallback.normalize();
  }

  private computeSmokeDensity(smoke: SmokeVolume, nowMs: number): number {
    const ageMs = nowMs - smoke.bornMs;
    if (ageMs <= 0) return 0;
    if (ageMs >= smoke.lifetimeMs) return 0;

    const fadeIn = THREE.MathUtils.clamp(ageMs / SMOKE_GRENADE_TUNING.SMOKE_FADE_IN_MS, 0, 1);

    const fadeOutWindowStart = smoke.lifetimeMs - SMOKE_GRENADE_TUNING.SMOKE_FADE_OUT_MS;
    const fadeOut = ageMs <= fadeOutWindowStart
      ? 1
      : THREE.MathUtils.clamp((smoke.lifetimeMs - ageMs) / SMOKE_GRENADE_TUNING.SMOKE_FADE_OUT_MS, 0, 1);

    return fadeIn * fadeOut;
  }

  private segmentSphereOverlap(
    start: THREE.Vector3,
    end: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number
  ): number {
    const segment = end.clone().sub(start);
    const lengthSq = segment.lengthSq();

    if (lengthSq <= 1e-6) {
      const dist = start.distanceTo(sphereCenter);
      return dist < sphereRadius ? 1 - dist / sphereRadius : 0;
    }

    const startToCenter = sphereCenter.clone().sub(start);
    const t = THREE.MathUtils.clamp(startToCenter.dot(segment) / lengthSq, 0, 1);
    const closest = start.clone().addScaledVector(segment, t);
    const distance = closest.distanceTo(sphereCenter);

    if (distance >= sphereRadius) return 0;
    return 1 - distance / sphereRadius;
  }

  private randomPointInSphere(radius: number): THREE.Vector3 {
    const direction = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2)
    );

    if (direction.lengthSq() <= 1e-6) {
      direction.set(0, 1, 0);
    } else {
      direction.normalize();
    }

    const distance = Math.cbrt(Math.random()) * radius;
    return direction.multiplyScalar(distance);
  }

  private createSmokeTexture(): THREE.CanvasTexture {
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.12,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );

    gradient.addColorStop(0, 'rgba(232, 238, 244, 0.96)');
    gradient.addColorStop(0.45, 'rgba(180, 190, 200, 0.74)');
    gradient.addColorStop(0.75, 'rgba(130, 138, 146, 0.3)');
    gradient.addColorStop(1, 'rgba(95, 100, 108, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
