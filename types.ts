export type ThemeColors = {
  foliage: string;
  heavy: string; // Gifts
  light: string; // Balls
  extraLight: string; // Tiny lights
};

export enum TreeState {
  SCATTERED = 0,
  TREE = 1,
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  multiHandLandmarks: HandLandmark[][];
}

// MediaPipe global types (since we load via CDN)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}