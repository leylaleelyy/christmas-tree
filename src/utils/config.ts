import type { AppConfig, AppState } from '../types';

export const CONFIG: AppConfig = {
  colors: {
    bg: 0x000000,
    champagneGold: 0xffd966,
    deepGreen: 0x03180a,
    accentRed: 0x990000,
  },
  particles: {
    count: 1500,
    dustCount: 2500,
    treeHeight: 24,
    treeRadius: 8,
  },
  camera: {
    z: 50,
  },
};

export const createInitialState = (): AppState => ({
  mode: 'TREE',
  focusIndex: -1,
  focusTarget: null,
  hand: { detected: false, x: 0, y: 0 },
  rotation: { x: 0, y: 0 },
});
