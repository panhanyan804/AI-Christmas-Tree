import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { FoliageLayer } from './FoliageLayer';
import { OrnamentsLayer } from './OrnamentsLayer';
import { TopStar } from './TopStar';
import { PolaroidLayer } from './PolaroidLayer';
import { SnowLayer } from './SnowLayer';
import { ThemeColors, TreeState } from '../types';
import * as THREE from 'three';

interface SceneProps {
  colors: ThemeColors;
  targetState: TreeState;
  handPosition: { x: number; y: number };
  treeScale: number;
  photos: string[];
  photoScale: number;
}

export const Scene: React.FC<SceneProps> = ({ colors, targetState, handPosition, treeScale, photos, photoScale }) => {
  const morphRef = useRef(0);
  const treeGroupRef = useRef<THREE.Group>(null);
  
  // Physics Refs
  const angularVelocity = useRef(0); // Current rotation speed
  const lastHandX = useRef(handPosition.x);
  const isDragging = useRef(false);

  useFrame((state, delta) => {
    // 1. Morph Transition
    morphRef.current = THREE.MathUtils.lerp(morphRef.current, targetState, delta * 2.0);

    // 2. Physics / Interaction Logic
    if (targetState === TreeState.TREE) {
      // Calculate hand velocity (delta)
      const dx = handPosition.x - lastHandX.current;
      
      // Determine if hand is actively moving/controlling
      // Simple threshold to avoid noise
      const speed = dx / delta;
      
      // Apply torque if hand is moving significantly
      if (Math.abs(dx) > 0.001) {
          isDragging.current = true;
          // Add impulse to angular velocity
          // Factor of 5.0 makes it responsive
          angularVelocity.current += dx * 5.0; 
      } else {
          isDragging.current = false;
      }
    }

    // Apply Friction / Damping
    angularVelocity.current *= 0.95; // 5% energy loss per frame

    // Cap velocity to prevent spinning too wildly
    angularVelocity.current = THREE.MathUtils.clamp(angularVelocity.current, -5.0, 5.0);

    // Stop completely if very slow
    if (Math.abs(angularVelocity.current) < 0.001) angularVelocity.current = 0;

    // Apply rotation
    if (treeGroupRef.current) {
        treeGroupRef.current.rotation.y += angularVelocity.current * delta;
        
        // Also add subtle pitch (X-axis) based on hand Y, but keep it direct, not inertial for stability
        const targetRotX = handPosition.y * 0.3;
        treeGroupRef.current.rotation.x = THREE.MathUtils.lerp(
            treeGroupRef.current.rotation.x, 
            targetRotX, 
            delta * 2
        );

        // Apply scale
        const currentScale = treeGroupRef.current.scale.x;
        const nextScale = THREE.MathUtils.lerp(currentScale, treeScale, delta * 5);
        treeGroupRef.current.scale.setScalar(nextScale);
    }

    // Update history
    lastHandX.current = handPosition.x;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 30]} fov={50} />
      
      {/* Disable auto rotate if interacting or in tree mode to let inertia take over */}
      <OrbitControls 
        enablePan={false} 
        minDistance={10} 
        maxDistance={50} 
        autoRotate={targetState === TreeState.SCATTERED} 
        autoRotateSpeed={0.5} 
        enabled={targetState === TreeState.SCATTERED} // Disable orbit controls when interacting with tree
      />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 20, 10]} intensity={1} color="#ffaa00" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0044ff" />
      <spotLight 
        position={[0, 50, 0]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        castShadow 
      />
      
      <Environment preset="city" />

      <SnowLayer angularVelocity={angularVelocity} />

      {/* Main Tree Group */}
      <group ref={treeGroupRef} position={[0, -2, 0]}>
         <WrappedComponents 
            colors={colors} 
            morphRef={morphRef} 
            photos={photos} 
            photoScale={photoScale} 
            angularVelocity={angularVelocity}
         />
      </group>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const WrappedComponents = ({ 
    colors, 
    morphRef, 
    photos, 
    photoScale, 
    angularVelocity
}: { 
    colors: ThemeColors, 
    morphRef: React.MutableRefObject<number>, 
    photos: string[], 
    photoScale: number,
    angularVelocity: React.MutableRefObject<number>
}) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    return (
        <>
            <FoliageLayer 
                color={colors.foliage} 
                morphRef={morphRef} 
                angularVelocity={angularVelocity}
            />
            <TopStar morphRef={morphRef} />
            <OrnamentsLayer 
                count={150} 
                type="cube" 
                color={colors.heavy} 
                morphRef={morphRef} 
                scaleBase={0.35} 
            />
            <OrnamentsLayer 
                count={250} 
                type="sphere" 
                color={colors.light} 
                morphRef={morphRef} 
                scaleBase={0.2}
            />
             <OrnamentsLayer 
                count={300} 
                type="sphere" 
                color={colors.extraLight} 
                morphRef={morphRef} 
                scaleBase={0.1}
            />
            <PolaroidLayer 
                photos={photos} 
                morphRef={morphRef} 
                scale={photoScale} 
                focusedIndex={focusedIndex}
                setFocusedIndex={setFocusedIndex}
            />
        </>
    )
}