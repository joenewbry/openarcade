import * as THREE from 'three';

export const PAINTBALL_TUNING = {
  SHOT_MAX_DISTANCE: 90,
  SHOT_ORIGIN_FORWARD_OFFSET: 0.35,
  TRACER_LIFETIME_MS: 110,
  IMPACT_SPARK_LIFETIME_MS: 140,

  SPLAT_LIFETIME_MS: 120000,
  MAX_SPLATS: 280,
  SPLAT_SIZE_MIN: 0.28,
  SPLAT_SIZE_MAX: 0.62,
  SPLAT_SURFACE_OFFSET: 0.018,

  RIGHT_CLICK_COOLDOWN_MS: 120,
  RUBBER_BALL_SPEED: 34,
  RUBBER_BALL_GRAVITY: 9,
  RUBBER_BALL_RADIUS: 0.08,
  RUBBER_BALL_BOUNCE_DAMPING: 0.84,
  RUBBER_BALL_MIN_SPEED: 3,
  RUBBER_BALL_MAX_BOUNCES: 6,
  RUBBER_BALL_LIFETIME_MS: 3200,
  MAX_RUBBER_BALLS: 24,

  COLLIDER_CACHE_MS: 350
} as const;

type PaintSplat = {
  mesh: THREE.Mesh;
  bornMs: number;
};

type RubberBallProjectile = {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bouncesRemaining: number;
  bornMs: number;
  color: THREE.Color;
};

export class BulletSystem {
  private readonly scene: THREE.Scene;
  private readonly raycaster: THREE.Raycaster;
  private readonly splatGeometry: THREE.PlaneGeometry;
  private readonly splatTexture: THREE.CanvasTexture;
  private readonly rubberBallGeometry: THREE.SphereGeometry;

  private readonly paintSplats: PaintSplat[] = [];
  private readonly rubberBalls: RubberBallProjectile[] = [];

  private cachedArenaColliders: THREE.Object3D[] = [];
  private cachedColliderChildCount = -1;
  private colliderCacheAtMs = 0;

  private lastRubberBallShotMs = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.splatGeometry = new THREE.PlaneGeometry(1, 1);
    this.splatTexture = this.createSplatTexture();
    this.rubberBallGeometry = new THREE.SphereGeometry(PAINTBALL_TUNING.RUBBER_BALL_RADIUS, 10, 10);
  }

  public firePaintball(origin: THREE.Vector3, direction: THREE.Vector3): void {
    const dir = direction.clone().normalize();
    const start = origin.clone().addScaledVector(dir, PAINTBALL_TUNING.SHOT_ORIGIN_FORWARD_OFFSET);
    const paintColor = this.randomPaintColor();

    const hit = this.castToArena(start, dir, PAINTBALL_TUNING.SHOT_MAX_DISTANCE);
    const end = hit
      ? hit.point.clone()
      : start.clone().addScaledVector(dir, PAINTBALL_TUNING.SHOT_MAX_DISTANCE);

    const impactNormal = hit
      ? this.getImpactNormal(hit, dir.clone().negate())
      : dir.clone().negate();

    this.spawnTracer(start, end, paintColor);
    this.spawnImpactSpark(end, paintColor);
    this.spawnSplat(end, impactNormal, paintColor);
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
      color
    });

    this.spawnTracer(origin, start, color);

    if (this.rubberBalls.length > PAINTBALL_TUNING.MAX_RUBBER_BALLS) {
      this.removeRubberBall(0);
    }
  }

  public update(deltaTime: number): void {
    this.updateRubberBalls(deltaTime);
    this.cleanupExpiredSplats();
  }

  private updateRubberBalls(deltaTime: number): void {
    const now = performance.now();

    for (let i = this.rubberBalls.length - 1; i >= 0; i--) {
      const projectile = this.rubberBalls[i];

      if (now - projectile.bornMs > PAINTBALL_TUNING.RUBBER_BALL_LIFETIME_MS) {
        this.removeRubberBall(i);
        continue;
      }

      projectile.velocity.y -= PAINTBALL_TUNING.RUBBER_BALL_GRAVITY * deltaTime;

      const step = projectile.velocity.clone().multiplyScalar(deltaTime);
      const distance = step.length();
      if (distance < 1e-5) {
        continue;
      }

      const castDir = step.clone().normalize();
      const hit = this.castToArena(
        projectile.position,
        castDir,
        distance + PAINTBALL_TUNING.RUBBER_BALL_RADIUS
      );

      if (!hit) {
        projectile.position.add(step);
        projectile.mesh.position.copy(projectile.position);
        continue;
      }

      const normal = this.getImpactNormal(hit, castDir.clone().negate());
      const contactPoint = hit.point.clone();

      projectile.position.copy(contactPoint).addScaledVector(normal, PAINTBALL_TUNING.RUBBER_BALL_RADIUS * 1.05);
      projectile.mesh.position.copy(projectile.position);

      this.spawnImpactSpark(contactPoint, projectile.color);
      this.spawnSplat(contactPoint, normal, projectile.color);

      projectile.velocity.reflect(normal).multiplyScalar(PAINTBALL_TUNING.RUBBER_BALL_BOUNCE_DAMPING);
      projectile.bouncesRemaining -= 1;

      if (
        projectile.bouncesRemaining <= 0
        || projectile.velocity.lengthSq() < PAINTBALL_TUNING.RUBBER_BALL_MIN_SPEED ** 2
      ) {
        this.removeRubberBall(i);
      }
    }
  }

  private castToArena(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): THREE.Intersection | null {
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

  private getImpactNormal(hit: THREE.Intersection, fallback: THREE.Vector3): THREE.Vector3 {
    if (!hit.face) {
      return fallback.normalize();
    }

    const worldNormal = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    worldNormal.applyMatrix3(normalMatrix).normalize();

    if (worldNormal.lengthSq() < 1e-5) {
      return fallback.normalize();
    }

    return worldNormal;
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color): void {
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
    }, PAINTBALL_TUNING.TRACER_LIFETIME_MS);
  }

  private spawnImpactSpark(point: THREE.Vector3, color: THREE.Color): void {
    const sparkCount = 10;
    const positions: number[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const spread = 0.18;
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
      size: 0.045,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const sparks = new THREE.Points(geometry, material);
    sparks.renderOrder = 95;
    this.scene.add(sparks);

    setTimeout(() => {
      this.scene.remove(sparks);
      geometry.dispose();
      material.dispose();
    }, PAINTBALL_TUNING.IMPACT_SPARK_LIFETIME_MS);
  }

  private spawnSplat(point: THREE.Vector3, normal: THREE.Vector3, color: THREE.Color): void {
    const size = THREE.MathUtils.lerp(
      PAINTBALL_TUNING.SPLAT_SIZE_MIN,
      PAINTBALL_TUNING.SPLAT_SIZE_MAX,
      Math.random()
    );

    const material = new THREE.MeshBasicMaterial({
      map: this.splatTexture,
      color,
      transparent: true,
      opacity: 0.95,
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
    const lightness = THREE.MathUtils.lerp(0.45, 0.62, Math.random());
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

    // Main blob
    const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, 8, size * 0.5, size * 0.5, size * 0.46);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    // Satellite droplets
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = THREE.MathUtils.lerp(10, 54, Math.random());
      const r = THREE.MathUtils.lerp(3, 10, Math.random());
      const x = size * 0.5 + Math.cos(angle) * dist;
      const y = size * 0.5 + Math.sin(angle) * dist;

      ctx.fillStyle = `rgba(255,255,255,${THREE.MathUtils.lerp(0.35, 0.9, Math.random())})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

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
