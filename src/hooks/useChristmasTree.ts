import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG, createInitialState } from '../utils/config';
import { Particle } from '../utils/Particle';
import type { AppState } from '../types';
import { useQiniuPhotos } from './useQiniuPhotos';

// 本地默认照片资源（随机使用）
const DEFAULT_PHOTO_URLS: string[] = [
  new URL('../assets/tree1.jpg', import.meta.url).href,
  new URL('../assets/tree2.jpg', import.meta.url).href,
  new URL('../assets/tree3.jpg', import.meta.url).href,
  new URL('../assets/tree4.jpg', import.meta.url).href,
  new URL('../assets/tree5.jpg', import.meta.url).href,
  new URL('../assets/tree6.jpg', import.meta.url).href,
  new URL('../assets/tree7.jpg', import.meta.url).href,
  new URL('../assets/tree8.jpg', import.meta.url).href,
  new URL('../assets/tree9.jpg', import.meta.url).href,
  new URL('../assets/tree10.jpg', import.meta.url).href,
];

// 在文件顶部添加浏览器检测
const isSafari = (): boolean => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };
  
  const isIOS = (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };
  

export const useChristmasTree = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onLoaded: () => void
) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const particleSystemRef = useRef<Particle[]>([]);
  const photoMeshGroupRef = useRef<THREE.Group>(new THREE.Group());
  const stateRef = useRef<AppState>(createInitialState());
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const caneTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const animationIdRef = useRef<number>(0);
  // 记录最后一次点击时间，用于优先处理点击事件
  const lastClickTimeRef = useRef<number>(0);
    // 添加这行：获取七牛云照片
    const { photos: qiniuPhotos, loading: photosLoading } = useQiniuPhotos();
  
    // 记录已加载的照片
    const loadedPhotosRef = useRef<Set<string>>(new Set());
  // 预加载纹理缓存，避免渲染空白
  const preloadedTexturesRef = useRef<Map<string, THREE.Texture>>(new Map());
  // 记录已添加的默认占位图数量
  const defaultPlaceholderCountRef = useRef<number>(0);

  // 通过 fetch + createImageBitmap 全量下载再创建纹理，避免半成品渲染
  const loadTextureFully = useCallback(async (url: string): Promise<THREE.Texture> => {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const tex = new THREE.Texture(bitmap);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true; // 与 Three.js 默认 UV 对齐
    tex.needsUpdate = true;
    return tex;
  }, []);

  const createTextures = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#880000';
    ctx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 32, 128);
      ctx.lineTo(i + 16, 128);
      ctx.lineTo(i - 16, 0);
    }
    ctx.fill();
    caneTextureRef.current = new THREE.CanvasTexture(canvas);
    caneTextureRef.current.wrapS = THREE.RepeatWrapping;
    caneTextureRef.current.wrapT = THREE.RepeatWrapping;
    caneTextureRef.current.repeat.set(3, 3);
  }, []);
  

  const addPhotoToScene = useCallback((texture: THREE.Texture) => {
    // 固定照片宽度
    const photoWidth = 1.2;
    let photoHeight = 1.2; // 默认正方形
    
    // 如果纹理有图片数据，根据宽高比计算高度
    const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null;
    if (image && 'width' in image && 'height' in image && image.width && image.height) {
      const aspectRatio = image.height / image.width;
      photoHeight = photoWidth * aspectRatio;
    }
    
    // 框架尺寸：比照片大 0.1（上下各 0.05）
    const frameWidth = photoWidth + 0.1;
    const frameHeight = photoHeight + 0.1;
    
    const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.champagneGold,
      metalness: 1.0,
      roughness: 0.1,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);

    const photoGeo = new THREE.PlaneGeometry(photoWidth, photoHeight);
    const photoMat = new THREE.MeshBasicMaterial({ map: texture });
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = 0.04;

    const group = new THREE.Group();
    group.add(frame);
    group.add(photo);

    const s = 0.8;
    group.scale.set(s, s, s);

    photoMeshGroupRef.current.add(group);
    particleSystemRef.current.push(new Particle(group, 'PHOTO', false));
  }, []);


  const createDefaultPhotos = useCallback((count: number = 1) => {
    const loader = new THREE.TextureLoader();

    // 作为兜底的本地图形生成
    const createFallbackCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // 背景
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 512, 512);
      
      // 金色边框
      ctx.strokeStyle = '#eebb66';
      ctx.lineWidth = 15;
      ctx.strokeRect(20, 20, 472, 472);

      // 简单的居中文本作为兜底
      ctx.font = '700 72px Cinzel, Times New Roman, serif';
      ctx.fillStyle = '#eebb66';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MERRY', 256, 230);
      ctx.fillText('CHRISTMAS', 256, 310);
  
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      addPhotoToScene(tex);
    };

    if (!DEFAULT_PHOTO_URLS.length) {
      createFallbackCanvas();
      defaultPlaceholderCountRef.current += count;
      return;
    }

    for (let i = 0; i < count; i++) {
      const randomUrl = DEFAULT_PHOTO_URLS[Math.floor(Math.random() * DEFAULT_PHOTO_URLS.length)];
      loader.load(
        randomUrl,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          addPhotoToScene(tex);
          defaultPlaceholderCountRef.current += 1;
        },
        undefined,
        (err) => {
          console.warn('Load default photo failed:', err);
          createFallbackCanvas();
          defaultPlaceholderCountRef.current += 1;
        }
      );
    }
  }, [addPhotoToScene]);

  // 预加载远端照片，确保完整加载后再添加到场景，避免空白
  useEffect(() => {
    if (photosLoading) return;
    if (!mainGroupRef.current) return;

    const loadTasks = qiniuPhotos
      .filter((photo) => !loadedPhotosRef.current.has(photo.id) && !preloadedTexturesRef.current.has(photo.id))
      .map(async (photo) => {
        try {
          const tex = await loadTextureFully(photo.url);
          preloadedTexturesRef.current.set(photo.id, tex);
          loadedPhotosRef.current.add(photo.id);
          addPhotoToScene(tex);
        } catch (err) {
          console.warn('Load failed:', photo.url, err);
          preloadedTexturesRef.current.delete(photo.id);
          loadedPhotosRef.current.delete(photo.id);
        }
      });

    if (loadTasks.length) {
      Promise.allSettled(loadTasks).catch(() => {
        /* swallow errors */
      });
    }
  }, [qiniuPhotos, photosLoading, addPhotoToScene, loadTextureFully]);

  // 当可渲染照片少于 5 张时，补充默认占位图
  useEffect(() => {
    if (photosLoading) return;
    if (!mainGroupRef.current) return;

    const remoteCount = loadedPhotosRef.current.size;
    const placeholderCount = defaultPlaceholderCountRef.current;
    const total = remoteCount + placeholderCount;

    if (total >= 5) return;

    const need = 5 - total;
    createDefaultPhotos(need);
  }, [photosLoading, createDefaultPhotos]);

  const createParticles = useCallback(() => {
    const mainGroup = mainGroupRef.current!;
    const particleSystem = particleSystemRef.current;

    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0.1, 0.5, 0),
      new THREE.Vector3(0.3, 0.4, 0),
    ]);
    const candyGeo = new THREE.TubeGeometry(curve, 16, 0.08, 8, false);

    const goldMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.champagneGold,
      metalness: 1.0,
      roughness: 0.1,
      envMapIntensity: 2.0,
      emissive: 0x443300,
      emissiveIntensity: 0.3,
    });

    const greenMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.deepGreen,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x002200,
      emissiveIntensity: 0.2,
    });

    const redMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.colors.accentRed,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 1.0,
      emissive: 0x330000,
    });

    const candyMat = new THREE.MeshStandardMaterial({
      map: caneTextureRef.current!,
      roughness: 0.4,
    });

    for (let i = 0; i < CONFIG.particles.count; i++) {
      const rand = Math.random();
      let mesh: THREE.Mesh;
      let type: 'BOX' | 'GOLD_BOX' | 'GOLD_SPHERE' | 'RED' | 'CANE';

      if (rand < 0.4) {
        mesh = new THREE.Mesh(boxGeo, greenMat);
        type = 'BOX';
      } else if (rand < 0.7) {
        mesh = new THREE.Mesh(boxGeo, goldMat);
        type = 'GOLD_BOX';
      } else if (rand < 0.92) {
        mesh = new THREE.Mesh(sphereGeo, goldMat);
        type = 'GOLD_SPHERE';
      } else if (rand < 0.97) {
        mesh = new THREE.Mesh(sphereGeo, redMat);
        type = 'RED';
      } else {
        mesh = new THREE.Mesh(candyGeo, candyMat);
        type = 'CANE';
      }

      const s = 0.4 + Math.random() * 0.5;
      mesh.scale.set(s, s, s);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

      mainGroup.add(mesh);
      particleSystem.push(new Particle(mesh, type, false));
    }

    const starGeo = new THREE.OctahedronGeometry(1.2, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffdd88,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0,
      metalness: 1.0,
      roughness: 0,
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(0, CONFIG.particles.treeHeight / 2 + 1.2, 0);
    mainGroup.add(star);

    mainGroup.add(photoMeshGroupRef.current);
  }, []);

  const createDust = useCallback(() => {
    const mainGroup = mainGroupRef.current!;
    const particleSystem = particleSystemRef.current;

    const geo = new THREE.TetrahedronGeometry(0.08, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < CONFIG.particles.dustCount; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(0.5 + Math.random());
      mainGroup.add(mesh);
      particleSystem.push(new Particle(mesh, 'DUST', true));
    }
  }, []);

  const processGestures = useCallback((result: any) => {
    const state = stateRef.current;

    // 如果最近有点击事件（2秒内），忽略手势控制，让点击事件优先
    const timeSinceLastClick = Date.now() - lastClickTimeRef.current;
    if (timeSinceLastClick < 2000) {
      return;
    }

    if (result.landmarks && result.landmarks.length > 0) {
      state.hand.detected = true;
      const lm = result.landmarks[0];
      state.hand.x = (lm[9].x - 0.5) * 2;
      state.hand.y = (lm[9].y - 0.5) * 2;

      const thumb = lm[4];
      const index = lm[8];
      const wrist = lm[0];
      const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
      const tips = [lm[8], lm[12], lm[16], lm[20]];
      let avgDist = 0;
      tips.forEach((t: any) => {
        avgDist += Math.hypot(t.x - wrist.x, t.y - wrist.y);
      });
      avgDist /= 4;

      if (pinchDist < 0.05) {
        if (state.mode !== 'FOCUS') {
          state.mode = 'FOCUS';
          const photos = particleSystemRef.current.filter((p) => p.type === 'PHOTO');
          if (photos.length) {
            state.focusTarget = photos[Math.floor(Math.random() * photos.length)].mesh;
          }
        }
      } else if (avgDist < 0.25) {
        state.mode = 'TREE';
        state.focusTarget = null;
      } else if (avgDist > 0.4) {
        state.mode = 'SCATTER';
        state.focusTarget = null;
      }
    } else {
      state.hand.detected = false;
    }
  }, []);

  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;
  
    if (!video || !handLandmarker) {
      requestAnimationFrame(predictWebcam);
      return;
    }
  
    // 确保视频已准备好
    if (video.readyState < 2) {
      requestAnimationFrame(predictWebcam);
      return;
    }
  
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const result = handLandmarker.detectForVideo(video, performance.now());
        processGestures(result);
      } catch (error) {
        console.warn('Hand detection error:', error);
      }
    }
    
    requestAnimationFrame(predictWebcam);
  }, [processGestures, videoRef]);
  

  const initMediaPipe = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
  
    if (!video || !canvas) {
      console.warn('Video or canvas ref not available');
      return;
    }
  
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 160;
      canvas.height = 120;
    }
  
    // iOS Safari 上 MediaPipe 支持有限，可以选择跳过
    if (isIOS()) {
      console.warn('MediaPipe hand tracking may not work well on iOS Safari');
    }
  
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );
  
      // Safari 和 iOS 使用 CPU delegate
      const useCPU = isSafari() || isIOS();
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: useCPU ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
  
      // 获取摄像头
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
          },
          audio: false,
        });
  
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
  
        // 等待视频加载
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video load timeout'));
          }, 10000);
  
          video.onloadedmetadata = async () => {
            clearTimeout(timeout);
            try {
              await video.play();
              resolve();
            } catch (playError) {
              // Safari 可能需要用户交互才能播放
              console.warn('Auto-play blocked, waiting for user interaction');
              
              const playOnInteraction = async () => {
                try {
                  await video.play();
                  document.removeEventListener('click', playOnInteraction);
                } catch (e) {
                  console.error('Play failed:', e);
                }
              };
              
              document.addEventListener('click', playOnInteraction, { once: true });
              resolve();
            }
          };
  
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video load error'));
          };
        });
  
        // 开始预测
        predictWebcam();
      }
    } catch (error) {
      console.warn('MediaPipe initialization failed:', error);
      // 静默失败，手势控制不可用但其他功能正常
    }
  }, [canvasRef, predictWebcam, videoRef]);
  
  

  const animate = useCallback(() => {
    animationIdRef.current = requestAnimationFrame(animate);

    const dt = clockRef.current.getDelta();
    const state = stateRef.current;
    const mainGroup = mainGroupRef.current;
    const camera = cameraRef.current;
    const composer = composerRef.current;

    if (!mainGroup || !camera || !composer) return;

    if (state.mode === 'SCATTER' && state.hand.detected) {
      const targetRotY = state.hand.x * Math.PI * 0.9;
      const targetRotX = state.hand.y * Math.PI * 0.25;
      state.rotation.y += (targetRotY - state.rotation.y) * 3.0 * dt;
      state.rotation.x += (targetRotX - state.rotation.x) * 3.0 * dt;
    } else {
      if (state.mode === 'TREE') {
        state.rotation.y += 0.3 * dt;
        state.rotation.x += (0 - state.rotation.x) * 2.0 * dt;
      } else {
        state.rotation.y += 0.1 * dt;
      }
    }

    mainGroup.rotation.y = state.rotation.y;
    mainGroup.rotation.x = state.rotation.x;

    particleSystemRef.current.forEach((p) =>
      p.update(
        dt,
        state.mode,
        state.focusTarget,
        camera,
        mainGroup,
        clockRef.current.elapsedTime
      )
    );
    composer.render();
  }, []);

  const handleResize = useCallback(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const composer = composerRef.current;

    if (!camera || !renderer || !composer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }, []);

  const handleClick = useCallback((event: MouseEvent | TouchEvent) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const state = stateRef.current;
    const mainGroup = mainGroupRef.current;

    if (!renderer || !camera || !scene || !mainGroup) return;

    // 防重复触发（移动端可能触发双击/双派发）
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    // 记录点击时间，用于优先处理点击事件
    lastClickTimeRef.current = now;

    // 阻止事件冒泡，避免触发其他点击处理
    event.stopPropagation();

    // 获取点击坐标
    let clientX: number, clientY: number;
    if (event instanceof TouchEvent) {
      // 使用 changedTouches 获取触摸结束时的坐标
      if (event.changedTouches.length === 0) return;
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // 将屏幕坐标转换为归一化设备坐标
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // 使用 Raycaster 检测点击的对象
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // 获取所有照片对象
    const photos = particleSystemRef.current.filter((p) => p.type === 'PHOTO');
    const photoMeshes = photos.map((p) => p.mesh);

    // 检测与照片的交集（包括子对象）
    const intersects: THREE.Intersection[] = [];
    photoMeshes.forEach((mesh) => {
      const groupIntersects = raycaster.intersectObject(mesh, true);
      intersects.push(...groupIntersects);
    });

    if (intersects.length > 0) {
      // 找到被点击的照片组
      const clickedObject = intersects[0].object;
      let photoGroup: THREE.Object3D | null = null;

      // 向上查找照片组（Group）
      let current: THREE.Object3D | null = clickedObject;
      while (current) {
        if (current instanceof THREE.Group && photos.some((p) => p.mesh === current)) {
          photoGroup = current;
          break;
        }
        current = current.parent;
      }

      if (photoGroup) {
        // 如果点击的是当前聚焦的照片，则退出聚焦模式
        if (state.mode === 'FOCUS' && state.focusTarget === photoGroup) {
          state.mode = 'TREE';
          state.focusTarget = null;
        } else {
          // 否则聚焦到这张照片
          state.mode = 'FOCUS';
          state.focusTarget = photoGroup;
        }
      }
    } else {
      // 点击空白区域，退出聚焦模式
      if (state.mode === 'FOCUS') {
        state.mode = 'TREE';
        state.focusTarget = null;
      }
    }
  }, []);

  const handleFileUpload = useCallback(
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            new THREE.TextureLoader().load(ev.target.result as string, (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              addPhotoToScene(t);
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [addPhotoToScene]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.bg);
    scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.01);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, CONFIG.camera.z);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    mainGroupRef.current = mainGroup;

    // Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const innerLight = new THREE.PointLight(0xffaa00, 2, 20);
    innerLight.position.set(0, 5, 0);
    mainGroup.add(innerLight);

    const spotGold = new THREE.SpotLight(0xffcc66, 1200);
    spotGold.position.set(30, 40, 40);
    spotGold.angle = 0.5;
    spotGold.penumbra = 0.5;
    scene.add(spotGold);

    const spotBlue = new THREE.SpotLight(0x6688ff, 600);
    spotBlue.position.set(-30, 20, -30);
    scene.add(spotBlue);

    const fill = new THREE.DirectionalLight(0xffeebb, 0.8);
    fill.position.set(0, 0, 50);
    scene.add(fill);

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0.7;
    bloomPass.strength = 0.45;
    bloomPass.radius = 0.4;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Create scene elements
    createTextures();
    createParticles();
    createDust();

    // Initialize MediaPipe
    initMediaPipe().then(() => {
      onLoaded();
    });

    // Event listeners
    window.addEventListener('resize', handleResize);
    
    // 添加点击事件监听（点击照片放大）
    const rendererDom = renderer.domElement;
    rendererDom.addEventListener('click', handleClick);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      rendererDom.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [
    containerRef,
    createTextures,
    createParticles,
    createDust,
    createDefaultPhotos,
    initMediaPipe,
    handleResize,
    handleClick,
    animate,
    onLoaded,
  ]);

  return { handleFileUpload };
};
