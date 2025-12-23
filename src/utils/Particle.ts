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
        // 基于相机位置计算目标位置，确保照片居中显示
        // 相机位置通常是 (0, 2, 50)，我们希望在相机前方居中显示照片
        if (camera instanceof THREE.PerspectiveCamera) {
          // 计算相机前方的位置（在相机前方一定距离，与相机同高）
          // 相机在 z=50，我们希望照片在 z=35，所以距离是 15
          const distance = camera.position.z - 35; // 通常是 15
          const worldTarget = new THREE.Vector3(
            camera.position.x,  // 与相机 X 坐标对齐，确保居中
            camera.position.y,  // 与相机 Y 坐标对齐
            camera.position.z - distance  // 在相机前方
          );
          
          // 转换为 mainGroup 的本地坐标
          const invMatrix = new THREE.Matrix4().copy(mainGroup.matrixWorld).invert();
          target = worldTarget.applyMatrix4(invMatrix);
        } else {
          // 回退到原来的方法
          const desiredWorldPos = new THREE.Vector3(0, 2, 35);
          const invMatrix = new THREE.Matrix4().copy(mainGroup.matrixWorld).invert();
          target = desiredWorldPos.applyMatrix4(invMatrix);
        }
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
      if (this.mesh === focusTargetMesh) {
        s = 4.5;
        
        // 手机端限制照片大小不超出屏幕
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && camera instanceof THREE.PerspectiveCamera) {
          // 照片在 z=35 位置，相机在 z=50
          const photoZ = 35;
          const cameraZ = camera.position.z;
          const distance = Math.abs(cameraZ - photoZ);
          
          // 计算视野范围（留 15% 边距，确保不会贴边）
          const fov = camera.fov * (Math.PI / 180);
          const aspect = camera.aspect;
          const visibleHeight = 2 * Math.tan(fov / 2) * distance * 0.85;
          const visibleWidth = visibleHeight * aspect * 0.85;
          
          // 获取照片的实际尺寸（包括框架）
          // 照片基础宽度 1.2，框架宽度 1.2 + 0.1 = 1.3
          let frameWidth = 1.3;
          let frameHeight = 1.3; // 默认正方形
          
          // 尝试获取照片的实际高度（如果有子对象是框架）
          if (this.mesh instanceof THREE.Group && this.mesh.children.length > 0) {
            // 查找框架（BoxGeometry）
            const frameMesh = this.mesh.children.find(child => 
              child instanceof THREE.Mesh && 
              (child as THREE.Mesh).geometry instanceof THREE.BoxGeometry
            ) as THREE.Mesh | undefined;
            if (frameMesh && frameMesh.geometry instanceof THREE.BoxGeometry) {
              const geo = frameMesh.geometry;
              frameWidth = geo.parameters.width || 1.3;
              frameHeight = geo.parameters.height || 1.3;
            } else {
              // 如果没有找到框架，尝试从照片平面获取尺寸
              const photoMesh = this.mesh.children.find(child => 
                child instanceof THREE.Mesh && 
                (child as THREE.Mesh).geometry instanceof THREE.PlaneGeometry
              ) as THREE.Mesh | undefined;
              if (photoMesh && photoMesh.geometry instanceof THREE.PlaneGeometry) {
                const geo = photoMesh.geometry;
                const photoWidth = geo.parameters.width || 1.2;
                const photoHeight = geo.parameters.height || 1.2;
                frameWidth = photoWidth + 0.1;
                frameHeight = photoHeight + 0.1;
              }
            }
          }
          
          // 计算最大允许的缩放比例
          // s 是绝对缩放值，实际尺寸 = frameSize * s
          // 我们需要：frameSize * s <= visibleSize
          // 所以：s <= visibleSize / frameSize
          const maxScaleByWidth = visibleWidth / frameWidth;
          const maxScaleByHeight = visibleHeight / frameHeight;
          const maxScale = Math.min(maxScaleByWidth, maxScaleByHeight);
          
          // 限制缩放比例不超过计算出的最大值
          s = Math.min(s, maxScale);
        }
      } else {
        s = this.baseScale * 0.8;
      }
    }

    this.mesh.scale.lerp(new THREE.Vector3(s, s, s), 4 * dt);
  }
}
