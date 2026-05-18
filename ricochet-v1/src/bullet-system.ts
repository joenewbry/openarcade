import * as THREE from 'three';

export const PAINTBALL_TUNING = {
  SHOT_MAX_DISTANCE: 80,
  SHOT_ORIGIN_FORWARD_OFFSET: 0.35,
  SHOT_TRAVEL_SPEED: 30,
  SHOT_TTL_MS: 3200,
  MAX_PAINTBALLS: 3,

  PAINTBALL_RADIUS: 0.09,
  PAINTBALL_TRAIL_LIFETIME_MS: 60,
  PAINTBALL_MUZZLE_LIFETIME_MS: 120,
  PAINTBALL_IMPACT_SPARK_LIFETIME_MS: 170,
  PAINTBALL_IMPACT_SPARK_SIZE: 0.06,

  SPLAT_LIFETIME_MS: 150000,
  MAX_SPLATS: 320,
  SPLAT_SIZE_MIN: 0.55,
  SPLAT_SIZE_MAX: 1.2,
  SPLAT_SURFACE_OFFSET: 0.015,

  RIGHT_CLICK_COOLDOWN_MS: 120,
  RUBBER_BALL_SPEED: 26,
  RUBBER_BALL_GRAVITY: 9,
  RUBBER_BALL_RADIUS: 0.12,
  RUBBER_BALL_BOUNCE_DAMPING: 0.82,
  RUBBER_BALL_MIN_SPEED: 3.8,
  RUBBER_BALL_MAX_BOUNCES: 8,
  RUBBER_BALL_LIFETIME_MS: 3600,
  MAX_RUBBER_BALLS: 24,

  SMOKE_THROW_RANGE: 18,
  SMOKE_RADIUS: 3.2,
  SMOKE_LIFETIME_MS: 9000,
  SMOKE_COOLDOWN_MS: 7000,
  MAX_SMOKE_VOLUMES: 3,
  SMOKE_TEXTURE_SIZE: 256,
  SMOKE_MUZZLE_OFFSET: 0.28,
  SMOKE_VERTICAL_OFFSET: 0.12,
  SMOKE_MAX_OPACITY: 0.88,

  COLLIDER_CACHE_MS: 350
}

export interface PaintImpactInfo {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  color: THREE.Color;
  object: THREE.Object3D | null;
  byRubber: boolean;
}

interface PaintballProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bouncesRemaining: number;
  distanceTraveled: number;
  bornMs: number;
  color: THREE.Color;
  previousPosition: THREE.Vector3;
}

interface RubberBallProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bouncesRemaining: number;
  bornMs: number;
  color: THREE.Color;
  previousPosition: THREE.Vector3;
}

type PaintSplat = {
  mesh: THREE.Mesh;
  bornMs: number;
};

export type PaintImpactListener = (payload: PaintImpactInfo) => void;

type FirePaintballOptions = {
  /** Skip muzzle/impact-heavy visuals if set (currently unused but kept for future callsites). */
  muted?: boolean;
  /** If provided, marks this as a remote-shot render to avoid side effects. */
  remote?: boolean;
  /** Number of wall ricochets this projectile can perform before breaking. */
  ricochetBounces?: number;
};

interface SmokeVolume {
  center: THREE.Vector3;
  radius: number;
  bornMs: number;
  group: THREE.Group;
  coreMaterial: THREE.SpriteMaterial;
  shellMaterial: THREE.SpriteMaterial;
}

export class BulletSystem {
  private readonly scene: THREE.Scene;
  private readonly raycaster: THREE.Raycaster;
  private readonly splatGeometry: THREE.PlaneGeometry;
  private readonly splatTexture: THREE.CanvasTexture;
  private readonly paintballGeometry: THREE.SphereGeometry;
  private readonly rubberBallGeometry: THREE.SphereGeometry;
  private readonly smokeTexture: THREE.CanvasTexture;

  private readonly paintballs: PaintballProjectile[] = [];
  private readonly rubberBalls: RubberBallProjectile[] = [];
  private readonly paintSplats: PaintSplat[] = [];
  private readonly smokeVolumes: SmokeVolume[] = [];

  private readonly impactListeners: PaintImpactListener[] = [];

  private cachedArenaColliders: THREE.Object3D[] = [];
  private cachedColliderChildCount = -1;
  private colliderCacheAtMs = 0;

  private lastRubberBallShotMs = 0;
  private lastSmokeDeployMs = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.splatGeometry = new THREE.PlaneGeometry(1, 1);
    this.splatTexture = this.createSplatTexture();
    this.smokeTexture = this.createSmokeTexture();
    this.paintballGeometry = new THREE.SphereGeometry(PAINTBALL_TUNING.PAINTBALL_RADIUS, 10, 10);
    this.rubberBallGeometry = new THREE.SphereGeometry(PAINTBALL_TUNING.RUBBER_BALL_RADIUS, 12, 12);
    this.lastSmokeDeployMs = -PAINTBALL_TUNING.SMOKE_COOLDOWN_MS;
  }

  public addImpactListener(listener: PaintImpactListener): void {
    if (!this.impactListeners.includes(listener)) {
      this.impactListeners.push(listener);
    }
  }

  public reset(): void {
    for (let i = this.paintballs.length - 1; i >= 0; i--) {
      this.removePaintball(i);
    }

    for (let i = this.rubberBalls.length - 1; i >= 0; i--) {
      this.removeRubberBall(i);
    }

    for (let i = this.paintSplats.length - 1; i >= 0; i--) {
      this.removeOldestSplat();
    }

    for (let i = this.smokeVolumes.length - 1; i >= 0; i--) {
      this.removeSmoke(i);
    }

    this.lastSmokeDeployMs = performance.now() - PAINTBALL_TUNING.SMOKE_COOLDOWN_MS;
  }

  public getSmokeStatus(nowMs = performance.now()): { canDeploy: boolean; cooldownRemainingMs: number; activeCount: number; maxActive: number } {
    const cooldownRemainingMs = Math.max(0, PAINTBALL_TUNING.SMOKE_COOLDOWN_MS - (nowMs - this.lastSmokeDeployMs));

    return {
      canDeploy: cooldownRemainingMs <= 0,
      cooldownRemainingMs,
      activeCount: this.smokeVolumes.length,
      maxActive: PAINTBALL_TUNING.MAX_SMOKE_VOLUMES
    };
  }

  public getSmokeDensityAtPoint(point: THREE.Vector3, nowMs = performance.now()): number {
    let density = 0;

    for (const volume of this.smokeVolumes) {
      const ageMs = nowMs - volume.bornMs;
      if (ageMs >= PAINTBALL_TUNING.SMOKE_LIFETIME_MS) {
        continue;
      }

      const distance = point.distanceTo(volume.center);
      if (distance >= volume.radius) {
        continue;
      }

      const normalizedDistance = 1 - (distance / volume.radius);
      const ageRatio = 1 - (ageMs / PAINTBALL_TUNING.SMOKE_LIFETIME_MS);
      const densityAtPoint = Math.max(0, normalizedDistance * normalizedDistance * ageRatio);
      density = Math.max(density, Math.min(1, densityAtPoint));
    }

    return density;
  }

  public firePaintball(

    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options: FirePaintballOptions = {}
  ): void {
    const dir = direction.clone().normalize();
    const start = origin.clone().addScaledVector(dir, PAINTBALL_TUNING.SHOT_ORIGIN_FORWARD_OFFSET);
    const paintColor = this.randomPaintColor();

    if (!options.muted) {
      this.spawnMuzzleFlash(start, paintColor);
    }

    const mesh = new THREE.Mesh(
      this.paintballGeometry,
      new THREE.MeshStandardMaterial({
        color: paintColor,
        emissive: paintColor.clone().multiplyScalar(0.45),
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      })
    );
    mesh.position.copy(start);
    mesh.renderOrder = 58;
    this.scene.add(mesh);

    const baseVelocity = dir.multiplyScalar(PAINTBALL_TUNING.SHOT_TRAVEL_SPEED);
    const spawnedAt = performance.now();

    this.paintballs.push({
      mesh,
      position: start.clone(),
      velocity: baseVelocity,
      bouncesRemaining: Math.max(0, Math.floor(options.ricochetBounces ?? 0)),
      distanceTraveled: 0,
      bornMs: spawnedAt,
      color: paintColor,
      previousPosition: start.clone()
    });

    if (this.paintballs.length > PAINTBALL_TUNING.MAX_PAINTBALLS) {
      this.removePaintball(0);
    }
  }

  public fireRubberBall(origin: THREE.Vector3, direction: THREE.Vector3): void {
    const now = performance.now();
    if (now - this.lastRubberBallShotMs < PAINTBALL_TUNING.RIGHT_CLICK_COOLDOWN_MS) {
      return;
    }
    this.lastRubberBallShotMs = now;

    const dir = direction.clone().normalize();
    const start = origin.clone().addScaledVector(dir, PAINTBALL_TUNING.SHOT_ORIGIN_FORWARD_OFFSET);
    const color = this.randomPaintColor();

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.22),
      roughness: 0.45,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(this.rubberBallGeometry, material);
    mesh.position.copy(start);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 60;
    this.scene.add(mesh);

    this.rubberBalls.push({
      mesh,
      position: start.clone(),
      velocity: dir.multiplyScalar(PAINTBALL_TUNING.RUBBER_BALL_SPEED),
      bouncesRemaining: PAINTBALL_TUNING.RUBBER_BALL_MAX_BOUNCES,
      bornMs: now,
      color,
      previousPosition: start.clone()
    });

    // Small launch flash for the launcher.
    this.spawnMuzzleFlash(start, color);

    if (this.rubberBalls.length > PAINTBALL_TUNING.MAX_RUBBER_BALLS) {
      this.removeRubberBall(0);
    }
  }
  public deploySmoke(origin: THREE.Vector3, direction: THREE.Vector3): boolean {
    const now = performance.now();
    if (now - this.lastSmokeDeployMs < PAINTBALL_TUNING.SMOKE_COOLDOWN_MS) {
      return false;
    }

    const forward = direction.clone().normalize();
    const start = origin.clone().addScaledVector(forward, PAINTBALL_TUNING.SHOT_ORIGIN_FORWARD_OFFSET);

    const hit = this.castToArena(
      start,
      forward,
      PAINTBALL_TUNING.SMOKE_THROW_RANGE
    );

    const impactPoint = hit ? hit.point.clone() : start.clone().addScaledVector(forward, PAINTBALL_TUNING.SMOKE_THROW_RANGE);

    const groundProbe = this.castToArena(
      impactPoint.clone().add(new THREE.Vector3(0, 1.8, 0)),
      new THREE.Vector3(0, -1, 0),
      3.6
    );

    const center = (groundProbe ? groundProbe.point : impactPoint).clone();
    center.y += PAINTBALL_TUNING.SMOKE_VERTICAL_OFFSET;

    const radius = PAINTBALL_TUNING.SMOKE_RADIUS;
    const { coreMaterial, shellMaterial, group } = this.createSmokeVisual(radius);

    group.position.copy(center);
    this.scene.add(group);

    this.smokeVolumes.push({
      center: center.clone(),
      radius,
      bornMs: now,
      group,
      coreMaterial,
      shellMaterial
    });

    this.lastSmokeDeployMs = now;

    while (this.smokeVolumes.length > PAINTBALL_TUNING.MAX_SMOKE_VOLUMES) {
      this.removeSmoke(0);
    }

    return true;
  }


  public update(deltaTime: number): void {
    this.updatePaintballs(deltaTime);
    this.updateRubberBalls(deltaTime);
    this.updateSmokeVolumes();
    this.cleanupExpiredSplats();
  }

  private updateSmokeVolumes(): void {
    const now = performance.now();

    for (let i = this.smokeVolumes.length - 1; i >= 0; i--) {
      const smoke = this.smokeVolumes[i];
      const ageMs = now - smoke.bornMs;

      if (ageMs >= PAINTBALL_TUNING.SMOKE_LIFETIME_MS) {
        this.removeSmoke(i);
        continue;
      }

      const fadeRatio = 1 - (ageMs / PAINTBALL_TUNING.SMOKE_LIFETIME_MS);
      const clampedFade = THREE.MathUtils.clamp(fadeRatio, 0, 1);
      const opacity = Math.pow(clampedFade, 0.85);

      smoke.coreMaterial.opacity = PAINTBALL_TUNING.SMOKE_MAX_OPACITY * 0.34 * opacity;
      smoke.shellMaterial.opacity = PAINTBALL_TUNING.SMOKE_MAX_OPACITY * 0.18 * opacity;
    }

  }

  private updatePaintballs(deltaTime: number): void {
    const now = performance.now();

    for (let i = this.paintballs.length - 1; i >= 0; i--) {
      const projectile = this.paintballs[i];

      if (now - projectile.bornMs > PAINTBALL_TUNING.SHOT_TTL_MS) {
        this.removePaintball(i);
        continue;
      }

      const remainingSpeedDistance = PAINTBALL_TUNING.SHOT_MAX_DISTANCE - projectile.distanceTraveled;
      if (remainingSpeedDistance <= 0.001) {
        this.removePaintball(i);
        continue;
      }

      const step = projectile.velocity.clone().multiplyScalar(deltaTime);
      const intendedDistance = Math.min(step.length(), remainingSpeedDistance);
      if (intendedDistance <= 1e-5) {
        continue;
      }

      let remainingStepLength = intendedDistance;
      let travelDirection = step.clone().normalize();
      let segmentStart = projectile.position.clone();
      let safety = 0;
      const maxImpactsPerFrame = 4;
      let consumedDistance = 0;
      let active = true;

      while (remainingStepLength > 1e-5 && active && safety < maxImpactsPerFrame) {
        safety += 1;

        const hit = this.castToArena(
          projectile.position,
          travelDirection,
          remainingStepLength + PAINTBALL_TUNING.PAINTBALL_RADIUS
        );

        if (!hit) {
          const next = projectile.position.clone().add(travelDirection.multiplyScalar(remainingStepLength));
          this.spawnTracer(segmentStart, next, projectile.color, PAINTBALL_TUNING.PAINTBALL_TRAIL_LIFETIME_MS);
          projectile.position.copy(next);
          projectile.mesh.position.copy(next);
          consumedDistance += remainingStepLength;
          break;
        }

        const traveledToHit = Math.max(0, Math.min(remainingStepLength, hit.distance));
        const hitPoint = hit.point.clone();
        const normal = this.getImpactNormal(hit, travelDirection.clone().negate());
        const contactPoint = hitPoint.clone().addScaledVector(normal, PAINTBALL_TUNING.PAINTBALL_RADIUS * 1.05);

        this.spawnTracer(segmentStart, hitPoint, projectile.color, PAINTBALL_TUNING.PAINTBALL_TRAIL_LIFETIME_MS);
        this.spawnImpactSpark(hitPoint, projectile.color);
        consumedDistance += traveledToHit;

        const canRicochet = projectile.bouncesRemaining > 0 && this.isWallSurface(hit.object);
        if (!canRicochet) {
          this.spawnSplat(hitPoint, normal, projectile.color);
          this.emitPaintImpact({
            point: hitPoint,
            normal,
            color: projectile.color,
            object: hit.object,
            byRubber: false
          });

          projectile.position.copy(contactPoint);
          projectile.mesh.position.copy(contactPoint);
          this.removePaintball(i);
          active = false;
          break;
        }

        projectile.position.copy(contactPoint);
        projectile.mesh.position.copy(contactPoint);
        projectile.velocity.reflect(normal);
        projectile.bouncesRemaining -= 1;

        remainingStepLength = Math.max(0, (remainingStepLength - traveledToHit) * 0.98);
        travelDirection = projectile.velocity.clone().normalize();
        segmentStart = projectile.position.clone();
      }

      if (!active) {
        continue;
      }

      projectile.distanceTraveled += consumedDistance;
      projectile.previousPosition.copy(projectile.position.clone());
    }
  }

  private updateRubberBalls(deltaTime: number): void {
    const now = performance.now();

    for (let i = this.rubberBalls.length - 1; i >= 0; i--) {
      const projectile = this.rubberBalls[i];

      if (now - projectile.bornMs > PAINTBALL_TUNING.RUBBER_BALL_LIFETIME_MS) {
        this.removeRubberBall(i);
        continue;
      }

      if (projectile.bouncesRemaining <= 0) {
        this.removeRubberBall(i);
        continue;
      }

      projectile.velocity.y -= PAINTBALL_TUNING.RUBBER_BALL_GRAVITY * deltaTime;

      const maxStepLength = projectile.velocity.length() * deltaTime;
      if (maxStepLength <= 1e-5) {
        continue;
      }

      const start = projectile.position.clone();
      const step = projectile.velocity.clone().normalize().multiplyScalar(maxStepLength);

      let remainingStepLength = maxStepLength;
      let travelDirection = step.clone().normalize();
      let safety = 0;
      const maxBouncesPerFrame = 4;
      let alive = true;

      while (remainingStepLength > 1e-5 && alive && safety < maxBouncesPerFrame) {
        safety += 1;

        const hit = this.castToArena(
          projectile.position,
          travelDirection,
          remainingStepLength + PAINTBALL_TUNING.RUBBER_BALL_RADIUS
        );

        if (!hit) {
          const nextPos = projectile.position.clone().add(travelDirection.multiplyScalar(remainingStepLength));
          this.spawnTracer(start, nextPos, projectile.color, 40);
          projectile.position.copy(nextPos);
          projectile.mesh.position.copy(nextPos);
          break;
        }

        const normal = this.getImpactNormal(hit, travelDirection.clone().negate());
        const hitPoint = hit.point.clone();
        const contactPoint = hitPoint.clone().addScaledVector(normal, PAINTBALL_TUNING.RUBBER_BALL_RADIUS * 1.06);

        this.spawnTracer(start, hitPoint, projectile.color, 40);
        this.spawnImpactSpark(hitPoint, projectile.color);
        this.spawnSplat(hitPoint, normal, projectile.color);
        this.emitPaintImpact({
          point: hitPoint,
          normal,
          color: projectile.color,
          object: hit.object,
          byRubber: true
        });

        projectile.position.copy(contactPoint);
        projectile.mesh.position.copy(contactPoint);

        projectile.velocity.reflect(normal).multiplyScalar(PAINTBALL_TUNING.RUBBER_BALL_BOUNCE_DAMPING);
        projectile.bouncesRemaining -= 1;

        if (
          projectile.bouncesRemaining <= 0 ||
          projectile.velocity.lengthSq() < PAINTBALL_TUNING.RUBBER_BALL_MIN_SPEED ** 2
        ) {
          this.removeRubberBall(i);
          alive = false;
          break;
        }

        const nextStep = Math.max(0, (remainingStepLength - hit.distance) * 0.98);
        remainingStepLength = nextStep;
        travelDirection = projectile.velocity.clone().normalize();
        start.copy(projectile.position);
      }
    }
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
      && now - this.colliderCacheAtMs < PAINTBALL_TUNING.COLLIDER_CACHE_MS
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
    if (object.visible === false) return false;

    // Ignore first-person weapon/arms and non-arena geometry.
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

  private isWallSurface(object: THREE.Object3D | null): boolean {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (node.userData?.isWall === true) {
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

      if (worldNormal.lengthSq() > 1e-5) {
        return worldNormal;
      }
    }

    const fallbackNormal = (hit as any).normal;
    if (fallbackNormal && fallbackNormal instanceof THREE.Vector3 && fallbackNormal.lengthSq() > 1e-5) {
      return fallbackNormal.clone().normalize();
    }

    let node: THREE.Object3D | null = hit.object;
    while (node) {
      if (node.userData?.isGround) {
        return new THREE.Vector3(0, 1, 0);
      }
      if (node.userData?.isWall) {
        break;
      }
      node = node.parent;
    }

    if (fallback.lengthSq() > 1e-5) {
      return fallback.clone().normalize();
    }

    return new THREE.Vector3(0, 1, 0);
  }

  private emitPaintImpact(payload: PaintImpactInfo): void {
    for (const listener of this.impactListeners) {
      listener({
        point: payload.point.clone(),
        normal: payload.normal.clone(),
        color: payload.color.clone(),
        object: payload.object,
        byRubber: payload.byRubber
      });
    }
  }

  private spawnMuzzleFlash(origin: THREE.Vector3, color: THREE.Color): void {
    const flashGeometry = new THREE.CircleGeometry(0.05, 12);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(origin);
    flash.renderOrder = 100;
    flash.rotation.x = -Math.PI / 2;
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    }, PAINTBALL_TUNING.PAINTBALL_MUZZLE_LIFETIME_MS);
  }

  private spawnTracer(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: THREE.Color,
    lifetimeMs = PAINTBALL_TUNING.PAINTBALL_TRAIL_LIFETIME_MS
  ): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const tracer = new THREE.Line(geometry, material);
    tracer.renderOrder = 90;
    this.scene.add(tracer);

    setTimeout(() => {
      this.scene.remove(tracer);
      geometry.dispose();
      material.dispose();
    }, lifetimeMs);
  }

  private spawnImpactSpark(point: THREE.Vector3, color: THREE.Color): void {
    const sparkCount = 12;
    const positions: number[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const spread = 0.22;
      positions.push(
        point.x + (Math.random() - 0.5) * spread,
        point.y + (Math.random() - 0.5) * spread,
        point.z + (Math.random() - 0.5) * spread
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: PAINTBALL_TUNING.PAINTBALL_IMPACT_SPARK_SIZE,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const sparks = new THREE.Points(geometry, material);
    sparks.renderOrder = 95;
    this.scene.add(sparks);

    setTimeout(() => {
      this.scene.remove(sparks);
      geometry.dispose();
      material.dispose();
    }, PAINTBALL_TUNING.PAINTBALL_IMPACT_SPARK_LIFETIME_MS);
  }

  private spawnSplat(point: THREE.Vector3, normal: THREE.Vector3, color: THREE.Color): void {
    const size = THREE.MathUtils.lerp(
      PAINTBALL_TUNING.SPLAT_SIZE_MIN,
      PAINTBALL_TUNING.SPLAT_SIZE_MAX,
      Math.random()
    );

    const material = new THREE.MeshStandardMaterial({
      map: this.splatTexture,
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -3,
      alphaTest: 0.05,
      side: THREE.DoubleSide
    });

    const splat = new THREE.Mesh(this.splatGeometry, material);
    const unitNormal = normal.clone().normalize();

    splat.position.copy(point).addScaledVector(unitNormal, PAINTBALL_TUNING.SPLAT_SURFACE_OFFSET);
    splat.scale.set(size, size, size);

    const orient = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), unitNormal);
    splat.quaternion.copy(orient);
    splat.rotateOnAxis(unitNormal, Math.random() * Math.PI * 2);
    splat.renderOrder = 40;

    this.scene.add(splat);
    this.paintSplats.push({ mesh: splat, bornMs: performance.now() });

    while (this.paintSplats.length > PAINTBALL_TUNING.MAX_SPLATS) {
      this.removeOldestSplat();
    }
  }

  private cleanupExpiredSplats(): void {
    const maxAge = PAINTBALL_TUNING.SPLAT_LIFETIME_MS;
    if (maxAge <= 0) return;

    const now = performance.now();

    while (this.paintSplats.length > 0 && now - this.paintSplats[0].bornMs > maxAge) {
      this.removeOldestSplat();
    }
  }

  private removeOldestSplat(): void {
    const oldest = this.paintSplats.shift();
    if (!oldest) return;

    this.scene.remove(oldest.mesh);
    const material = oldest.mesh.material;
    if (material instanceof THREE.Material) {
      material.dispose();
    }
  }

  private removePaintball(index: number): void {
    const projectile = this.paintballs[index];
    if (!projectile) return;

    this.scene.remove(projectile.mesh);
    const material = projectile.mesh.material;
    if (material instanceof THREE.Material) {
      material.dispose();
    }

    this.paintballs.splice(index, 1);
  }

  private removeRubberBall(index: number): void {
    const projectile = this.rubberBalls[index];
    if (!projectile) return;

    this.scene.remove(projectile.mesh);
    const material = projectile.mesh.material;
    if (material instanceof THREE.Material) {
      material.dispose();
    }

    this.rubberBalls.splice(index, 1);
  }

  private randomPaintColor(): THREE.Color {
    const hue = Math.random();
    const saturation = THREE.MathUtils.lerp(0.72, 0.95, Math.random());
    const lightness = THREE.MathUtils.lerp(0.45, 0.7, Math.random());
    return new THREE.Color().setHSL(hue, saturation, lightness);
  }

  private createSplatTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    ctx.clearRect(0, 0, size, size);

    // Main blob.
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.47, 0, Math.PI * 2);
    ctx.fill();

    // Extra dense spots for a thicker, chunkier look.
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = THREE.MathUtils.lerp(6, 54, Math.random());
      const radius = THREE.MathUtils.lerp(4, 12, Math.random());
      const x = size * 0.5 + Math.cos(angle) * dist;
      const y = size * 0.5 + Math.sin(angle) * dist;

      ctx.fillStyle = `rgba(255,255,255,${THREE.MathUtils.lerp(0.55, 1, Math.random())})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slight soft border that is still opaque enough to read clearly.
    const border = ctx.createLinearGradient(0, 0, size, size);
    border.addColorStop(0, 'rgba(255,255,255,0.9)');
    border.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = border;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
}

export function createBulletSystem(scene: THREE.Scene): BulletSystem {
  return new BulletSystem(scene);
}
