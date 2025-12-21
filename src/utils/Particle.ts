import * as THREE from 'three';
import type { ParticleType, AppMode } from '../types';
import { CONFIG } from './config';

export class Particle {
  mesh: THREE.Object3D;
  type: ParticleType;
  isDust: boolean;
  posTree: THREE.Vector3;
  posScatter: THREE.Vector3;
  baseScale: number;
  spinSpeed: THREE.Vector3;

  constructor(mesh: THREE.Object3D, type: ParticleType, isDust: boolean = false) {
    this.mesh = mesh;
    this.type = type;
    this.isDust = isDust;

    this.posTree = new THREE.Vector3();
    this.posScatter = new THREE.Vector3();
    this.baseScale = mesh.scale.x;

    const speedMult = type === 'PHOTO' ? 0.3 : 2.0;

    this.spinSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * speedMult,
      (Math.random() - 0.5) * speedMult,
      (Math.random() - 0.5) * speedMult
    );

    this.calculatePositions();
  }

  calculatePositions(): void {
    const h = CONFIG.particles.treeHeight;
    const halfH = h / 2;
    let t = Math.random();
    t = Math.pow(t, 0.8);
    const y = t * h - halfH;
    let rMax = CONFIG.particles.treeRadius * (1.0 - t);
    if (rMax < 0.5) rMax = 0.5;
    const angle = t * 50 * Math.PI + Math.random() * Math.PI;
    const r = rMax * (0.8 + Math.random() * 0.4);
    this.posTree.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

    const rScatter = this.isDust ? 12 + Math.random() * 20 : 8 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    this.posScatter.set(
      rScatter * Math.sin(phi) * Math.cos(theta),
      rScatter * Math.sin(phi) * Math.sin(theta),
      rScatter * Math.cos(phi)
    );
  }

  update(
    dt: number,
    mode: AppMode,
    focusTargetMesh: THREE.Object3D | null,
    camera: THREE.Camera,
    mainGroup: THREE.Group,
    elapsedTime: number
  ): void {
    let target = this.posTree;

    if (mode === 'SCATTER') {
      target = this.posScatter;
    } else if (mode === 'FOCUS') {
      if (this.mesh === focusTargetMesh) {
        const desiredWorldPos = new THREE.Vector3(0, 2, 35);
        const invMatrix = new THREE.Matrix4().copy(mainGroup.matrixWorld).invert();
        target = desiredWorldPos.applyMatrix4(invMatrix);
      } else {
        target = this.posScatter;
      }
    }

    const lerpSpeed = mode === 'FOCUS' && this.mesh === focusTargetMesh ? 5.0 : 2.0;
    this.mesh.position.lerp(target, lerpSpeed * dt);

    if (mode === 'SCATTER') {
      this.mesh.rotation.x += this.spinSpeed.x * dt;
      this.mesh.rotation.y += this.spinSpeed.y * dt;
      this.mesh.rotation.z += this.spinSpeed.z * dt;
    } else if (mode === 'TREE') {
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt);
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, dt);
      this.mesh.rotation.y += 0.5 * dt;
    }

    if (mode === 'FOCUS' && this.mesh === focusTargetMesh) {
      this.mesh.lookAt(camera.position);
    }

    let s = this.baseScale;
    if (this.isDust) {
      s = this.baseScale * (0.8 + 0.4 * Math.sin(elapsedTime * 4 + this.mesh.id));
      if (mode === 'TREE') s = 0;
    } else if (mode === 'SCATTER' && this.type === 'PHOTO') {
      s = this.baseScale * 2.5;
    } else if (mode === 'FOCUS') {
      if (this.mesh === focusTargetMesh) s = 4.5;
      else s = this.baseScale * 0.8;
    }

    this.mesh.scale.lerp(new THREE.Vector3(s, s, s), 4 * dt);
  }
}
