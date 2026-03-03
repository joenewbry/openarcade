import * as THREE from 'three';

export const GLASS_CHARACTER_TUNING = {
  CRACK_STAGE_1_HP: 75,
  CRACK_STAGE_2_HP: 45,
  CRACK_STAGE_3_HP: 20,
  CRACK_STAGE_OPACITY: [0.34, 0.58, 0.84] as const,

  GLASS_TINT: 0x98d8ff,
  LOCAL_GLASS_OPACITY: 0.56,
  REMOTE_GLASS_OPACITY: 0.7,

  SHATTER_FRAGMENT_COUNT: 22,
  SHATTER_LIFETIME_SECONDS: 0.9,
  SHATTER_SPEED_MIN: 2.6,
  SHATTER_SPEED_MAX: 5.2,
  SHATTER_GRAVITY: -7.8
} as const;

type GlassTargetKey = 'local' | 'remote';

interface GlassTargetState {
  root: THREE.Object3D;
  crackOverlays: THREE.Mesh[];
  crackStage: number;
}

interface ShatterShard {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

interface ShatterBurst {
  group: THREE.Group;
  material: THREE.MeshPhysicalMaterial;
  shards: ShatterShard[];
  ageSeconds: number;
  lifetimeSeconds: number;
}

export class GlassCharacterSystem {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly crackTextures: readonly THREE.CanvasTexture[];
  private readonly shardGeometry: THREE.TetrahedronGeometry;

  private readonly targets = new Map<GlassTargetKey, GlassTargetState>();
  private readonly shatterBursts: ShatterBurst[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.crackTextures = [
      this.createCrackTexture(1),
      this.createCrackTexture(2),
      this.createCrackTexture(3)
    ] as const;
    this.shardGeometry = new THREE.TetrahedronGeometry(0.08, 0);
  }

  public applyGlassToFirstPersonProxy(proxy: THREE.Group): void {
    this.applyGlassMaterialAndCracks(proxy, 'local', true);
  }

  public applyGlassToRemoteMesh(mesh: THREE.Mesh): void {
    this.applyGlassMaterialAndCracks(mesh, 'remote', false);
  }

  public setLocalHealth(hp: number): void {
    this.setCrackStage('local', this.resolveCrackStage(hp));
  }

  public setRemoteHealth(hp: number): void {
    this.setCrackStage('remote', this.resolveCrackStage(hp));
  }

  public resetLocal(): void {
    this.setCrackStage('local', 0);
  }

  public resetRemote(): void {
    this.setCrackStage('remote', 0);
  }

  public shatterLocal(worldPosition?: THREE.Vector3): void {
    const spawn = worldPosition?.clone() ?? new THREE.Vector3();
    if (!worldPosition) {
      this.camera.getWorldPosition(spawn);
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      spawn.addScaledVector(forward, 0.75);
      spawn.y -= 0.45;
    }

    this.spawnShatterBurst(spawn);
  }

  public shatterRemote(worldPosition?: THREE.Vector3): void {
    if (worldPosition) {
      this.spawnShatterBurst(worldPosition.clone());
      return;
    }

    const remote = this.targets.get('remote');
    if (!remote) return;

    const spawn = new THREE.Vector3();
    remote.root.getWorldPosition(spawn);
    this.spawnShatterBurst(spawn);
  }

  public update(deltaSeconds: number): void {
    for (let i = this.shatterBursts.length - 1; i >= 0; i--) {
      const burst = this.shatterBursts[i];
      burst.ageSeconds += deltaSeconds;

      const lifeRatio = Math.max(0, 1 - burst.ageSeconds / burst.lifetimeSeconds);
      burst.material.opacity = 0.92 * lifeRatio;

      for (const shard of burst.shards) {
        shard.velocity.y += GLASS_CHARACTER_TUNING.SHATTER_GRAVITY * deltaSeconds;
        shard.mesh.position.addScaledVector(shard.velocity, deltaSeconds);

        shard.mesh.rotation.x += shard.spin.x * deltaSeconds;
        shard.mesh.rotation.y += shard.spin.y * deltaSeconds;
        shard.mesh.rotation.z += shard.spin.z * deltaSeconds;
      }

      if (burst.ageSeconds >= burst.lifetimeSeconds) {
        this.disposeBurst(i);
      }
    }
  }

  private applyGlassMaterialAndCracks(
    root: THREE.Object3D,
    key: GlassTargetKey,
    firstPerson: boolean
  ): void {
    this.disposeTargetState(key);

    const crackOverlays: THREE.Mesh[] = [];

    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      node.material = this.toGlassMaterial(node.material, firstPerson);
      node.castShadow = !firstPerson;
      node.receiveShadow = !firstPerson;

      const crackOverlay = this.createCrackOverlay(node, firstPerson);
      node.add(crackOverlay);
      crackOverlays.push(crackOverlay);
    });

    this.targets.set(key, {
      root,
      crackOverlays,
      crackStage: 0
    });

    this.setCrackStage(key, 0);
  }

  private toGlassMaterial(material: THREE.Material | THREE.Material[], firstPerson: boolean): THREE.Material | THREE.Material[] {
    if (Array.isArray(material)) {
      return material.map((entry) => this.toSingleGlassMaterial(entry, firstPerson));
    }

    return this.toSingleGlassMaterial(material, firstPerson);
  }

  private toSingleGlassMaterial(material: THREE.Material, firstPerson: boolean): THREE.MeshPhysicalMaterial {
    const sourceColor = this.extractMaterialColor(material);
    const tint = new THREE.Color(GLASS_CHARACTER_TUNING.GLASS_TINT);

    return new THREE.MeshPhysicalMaterial({
      color: sourceColor.lerp(tint, 0.55),
      roughness: firstPerson ? 0.18 : 0.1,
      metalness: 0.02,
      transmission: firstPerson ? 0.68 : 0.9,
      opacity: firstPerson
        ? GLASS_CHARACTER_TUNING.LOCAL_GLASS_OPACITY
        : GLASS_CHARACTER_TUNING.REMOTE_GLASS_OPACITY,
      transparent: true,
      ior: 1.12,
      thickness: firstPerson ? 0.2 : 0.45,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1,
      depthWrite: !firstPerson,
      depthTest: !firstPerson
    });
  }

  private extractMaterialColor(material: THREE.Material): THREE.Color {
    const fallback = new THREE.Color(0xb7e6ff);

    if ('color' in material && material.color instanceof THREE.Color) {
      return material.color.clone();
    }

    return fallback;
  }

  private createCrackOverlay(sourceMesh: THREE.Mesh, firstPerson: boolean): THREE.Mesh {
    const crackMaterial = new THREE.MeshBasicMaterial({
      map: this.crackTextures[0],
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: !firstPerson,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const overlay = new THREE.Mesh(sourceMesh.geometry, crackMaterial);
    overlay.name = 'glass-crack-overlay';
    overlay.visible = false;
    overlay.renderOrder = firstPerson ? 998 : 20;
    overlay.scale.setScalar(firstPerson ? 1.02 : 1.015);
    return overlay;
  }

  private resolveCrackStage(hp: number): number {
    if (hp <= GLASS_CHARACTER_TUNING.CRACK_STAGE_3_HP) return 3;
    if (hp <= GLASS_CHARACTER_TUNING.CRACK_STAGE_2_HP) return 2;
    if (hp <= GLASS_CHARACTER_TUNING.CRACK_STAGE_1_HP) return 1;
    return 0;
  }

  private setCrackStage(key: GlassTargetKey, stage: number): void {
    const state = this.targets.get(key);
    if (!state) return;

    const boundedStage = Math.max(0, Math.min(3, stage));
    if (state.crackStage === boundedStage) return;

    state.crackStage = boundedStage;

    for (const overlay of state.crackOverlays) {
      const material = overlay.material;
      if (!(material instanceof THREE.MeshBasicMaterial)) continue;

      if (boundedStage <= 0) {
        overlay.visible = false;
        material.opacity = 0;
        continue;
      }

      overlay.visible = true;
      material.map = this.crackTextures[boundedStage - 1];
      material.opacity = GLASS_CHARACTER_TUNING.CRACK_STAGE_OPACITY[boundedStage - 1];
      material.needsUpdate = true;
    }
  }

  private spawnShatterBurst(origin: THREE.Vector3): void {
    const burstGroup = new THREE.Group();
    burstGroup.position.copy(origin);

    const burstMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(GLASS_CHARACTER_TUNING.GLASS_TINT),
      roughness: 0.2,
      metalness: 0.02,
      transmission: 0.75,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });

    const shards: ShatterShard[] = [];

    for (let i = 0; i < GLASS_CHARACTER_TUNING.SHATTER_FRAGMENT_COUNT; i++) {
      const shard = new THREE.Mesh(this.shardGeometry, burstMaterial);

      const scale = THREE.MathUtils.lerp(0.05, 0.14, Math.random());
      shard.scale.setScalar(scale);
      shard.position.set(
        (Math.random() - 0.5) * 0.22,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.22
      );

      burstGroup.add(shard);

      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.3 + 0.15,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = THREE.MathUtils.lerp(
        GLASS_CHARACTER_TUNING.SHATTER_SPEED_MIN,
        GLASS_CHARACTER_TUNING.SHATTER_SPEED_MAX,
        Math.random()
      );

      shards.push({
        mesh: shard,
        velocity: direction.multiplyScalar(speed),
        spin: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(14),
          THREE.MathUtils.randFloatSpread(14),
          THREE.MathUtils.randFloatSpread(14)
        )
      });
    }

    this.scene.add(burstGroup);
    this.shatterBursts.push({
      group: burstGroup,
      material: burstMaterial,
      shards,
      ageSeconds: 0,
      lifetimeSeconds: GLASS_CHARACTER_TUNING.SHATTER_LIFETIME_SECONDS
    });
  }

  private createCrackTexture(stage: 1 | 2 | 3): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const crackSegments = stage === 1 ? 16 : stage === 2 ? 28 : 42;
    const radialBursts = stage === 1 ? 3 : stage === 2 ? 5 : 7;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineCap = 'round';

    for (let burst = 0; burst < radialBursts; burst++) {
      const cx = size * (0.26 + Math.random() * 0.48);
      const cy = size * (0.26 + Math.random() * 0.48);

      for (let i = 0; i < crackSegments; i++) {
        const angle = Math.random() * Math.PI * 2;
        const length = THREE.MathUtils.lerp(20, stage === 3 ? 92 : 68, Math.random());

        let px = cx;
        let py = cy;

        const branchCount = stage === 1 ? 2 : stage === 2 ? 3 : 4;
        for (let branch = 0; branch < branchCount; branch++) {
          const t = (branch + 1) / branchCount;
          const wobble = (Math.random() - 0.5) * (stage * 0.35);
          const nx = cx + Math.cos(angle + wobble) * length * t;
          const ny = cy + Math.sin(angle + wobble) * length * t;

          ctx.lineWidth = THREE.MathUtils.lerp(0.7, 1.9, 1 - t);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          px = nx;
          py = ny;
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private disposeTargetState(key: GlassTargetKey): void {
    const state = this.targets.get(key);
    if (!state) return;

    for (const overlay of state.crackOverlays) {
      if (overlay.parent) {
        overlay.parent.remove(overlay);
      }

      const material = overlay.material;
      if (material instanceof THREE.Material) {
        material.dispose();
      }
    }

    this.targets.delete(key);
  }

  private disposeBurst(index: number): void {
    const burst = this.shatterBursts[index];
    if (!burst) return;

    this.scene.remove(burst.group);
    burst.material.dispose();
    this.shatterBursts.splice(index, 1);
  }
}
