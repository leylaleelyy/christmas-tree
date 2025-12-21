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
    
    // 框架尺寸：比照片大 0.2（上下各 0.1）
    const frameWidth = photoWidth + 0.2;
    const frameHeight = photoHeight + 0.2;
    
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

  const createDefaultPhotos = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#eebb66';
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, 472, 472);
    ctx.font = '500 60px Times New Roman';
    ctx.fillStyle = '#eebb66';
    ctx.textAlign = 'center';
    ctx.fillText('JOYEUX', 256, 230);
    ctx.fillText('NOEL', 256, 300);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    addPhotoToScene(tex);
  }, [addPhotoToScene]);

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
                  document.removeEventListener('touchstart', playOnInteraction);
                } catch (e) {
                  console.error('Play failed:', e);
                }
              };
              
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('touchstart', playOnInteraction, { once: true });
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
    createDefaultPhotos();

    // Initialize MediaPipe
    initMediaPipe().then(() => {
      onLoaded();
    });

    // Event listeners
    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
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
    animate,
    onLoaded,
  ]);

  return { handleFileUpload };
};
