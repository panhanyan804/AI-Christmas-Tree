import { useEffect, useRef, useState } from 'react';
import { HandResults } from '../types';

// Global cache to prevent double-loading in Strict Mode
const scriptPromises: Record<string, Promise<unknown>> = {};

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [pinchDistance, setPinchDistance] = useState(1); // 1 = Open, 0 = Closed
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 }); // -1 to 1 normalized center
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    let hands: any;
    let camera: any;
    let isActive = true; // Cleanup flag

    const loadMediaPipe = async () => {
      // Robust script loader
      const loadScript = (src: string) => {
        if (scriptPromises[src]) return scriptPromises[src];

        scriptPromises[src] = new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve(true);
          script.onerror = reject;
          document.body.appendChild(script);
        });
        return scriptPromises[src];
      };

      // Helper to wait for window global to be defined (execution delay)
      const waitForGlobal = async (name: string, retries = 50) => {
        while (!(window as any)[name] && retries > 0) {
          await new Promise(r => setTimeout(r, 100));
          retries--;
        }
        return (window as any)[name];
      };

      try {
        await Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
        ]);

        if (!isActive) return;

        // Ensure Hands class is actually available
        const HandsClass = await waitForGlobal('Hands');
        if (!HandsClass) throw new Error("MediaPipe Hands failed to load");

        hands = new HandsClass({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: HandResults) => {
          if (!isActive) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const wrist = landmarks[0];
            
            // Indices for fingertips: Index(8), Middle(12), Ring(16), Pinky(20)
            const fingertips = [8, 12, 16, 20];
            
            let totalDist = 0;
            
            fingertips.forEach(idx => {
              const tip = landmarks[idx];
              const dx = tip.x - wrist.x;
              const dy = tip.y - wrist.y;
              const dz = tip.z - wrist.z;
              totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
            });

            // Average distance of all fingertips to wrist
            const avgDist = totalDist / 4;

            // Map distance to logic:
            // Closed Fist (Tree) ~= 0.1 - 0.15 (depending on hand size/depth)
            // Open Hand (Scatter) ~= 0.3 - 0.5
            setPinchDistance(avgDist);

            // Calculate Hand Center for Rotation Control
            // We use the wrist + middle finger knuckle (9) for a stable center
            const middleKnuckle = landmarks[9];
            const centerX = (wrist.x + middleKnuckle.x) / 2;
            const centerY = (wrist.y + middleKnuckle.y) / 2;

            // Normalize to -1...1 range (0.5 is center)
            // Invert X because camera is mirrored
            setHandPosition({
              x: (centerX - 0.5) * -2,
              y: (centerY - 0.5) * 2 
            });

          } else {
             // Default to open (scattered) if hand leaves
             setPinchDistance((prev) => Math.min(prev + 0.05, 1));
             // Slowly reset rotation if hand leaves
             setHandPosition(prev => ({
               x: prev.x * 0.95,
               y: prev.y * 0.95
             }));
          }
        });

        if (videoRef.current) {
          const CameraClass = await waitForGlobal('Camera');
          if (CameraClass) {
            camera = new CameraClass(videoRef.current, {
              onFrame: async () => {
                if (videoRef.current && hands) {
                  await hands.send({ image: videoRef.current });
                }
              },
              width: 640,
              height: 480,
            });
            camera.start();
            setCameraActive(true);
            setIsReady(true);
          }
        }
      } catch (err) {
        console.error("Failed to load MediaPipe", err);
      }
    };

    loadMediaPipe();

    return () => {
      isActive = false;
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, []);

  return { videoRef, isReady, pinchDistance, handPosition, cameraActive };
};