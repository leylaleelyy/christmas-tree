import * as THREE from 'three';

export type AppMode = 'TREE' | 'SCATTER' | 'FOCUS';

export interface AppState {
  mode: AppMode;
  focusIndex: number;
  focusTarget: THREE.Object3D | null;
  hand: {
    detected: boolean;
    x: number;
    y: number;
  };
  rotation: {
    x: number;
    y: number;
  };
}

export interface AppConfig {
  colors: {
    bg: number;
    champagneGold: number;
    deepGreen: number;
    accentRed: number;
  };
  particles: {
    count: number;
    dustCount: number;
    treeHeight: number;
    treeRadius: number;
  };
  camera: {
    z: number;
  };
}

export type ParticleType = 'BOX' | 'GOLD_BOX' | 'GOLD_SPHERE' | 'RED' | 'CANE' | 'PHOTO' | 'DUST';
