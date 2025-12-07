import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, SCATTER_RADIUS } from '../constants';

interface TopStarProps {
  morphRef: React.MutableRefObject<number>;
}

export const TopStar: React.FC<TopStarProps> = ({ morphRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Precompute positions and Geometry
  const { treePos, scatterPos, starGeometry } = useMemo(() => {
    // Top of the tree
    const tPos = new THREE.Vector3(0, TREE_HEIGHT / 2 + 0.8, 0);
    
    // Random scatter position
    const sr = SCATTER_RADIUS;
    const sPos = new THREE.Vector3(
      (Math.random() - 0.5) * sr,
      (Math.random() - 0.5) * sr + 10,
      (Math.random() - 0.5) * sr
    );

    // Create 5-Pointed Star Shape
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    const angleStep = Math.PI / points;

    // Start at top point
    shape.moveTo(0, outerRadius);
    
    for (let i = 1; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const a = i * angleStep;
      // Use sin/cos correctly for typical XY orientation where 0 is usually right, 
      // but here we want top (Y) to be 0 angle or start point.
      // Standard mapping: x = sin(a), y = cos(a) starts at top (0, r)
      shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    
    // Center geometry so rotation happens around the middle
    geometry.center();

    return { 
      treePos: tPos, 
      scatterPos: sPos,
      starGeometry: geometry
    };
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const time = clock.getElapsedTime();
    const morph = morphRef.current; // 0 = Scattered, 1 = Tree

    // Interpolate Position
    meshRef.current.position.lerpVectors(scatterPos, treePos, morph);

    // Rotate (Spinning star)
    meshRef.current.rotation.y = time * 1.0; 
    // Add a slight wobble
    meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;

    // Scale pulsing
    const scale = 1.0 + Math.sin(time * 3) * 0.15;
    // When scattered, keep it slightly smaller
    meshRef.current.scale.setScalar(scale * (0.6 + 0.4 * morph));
  });

  return (
    <mesh ref={meshRef} geometry={starGeometry}>
      <meshStandardMaterial 
        color="#ffdd00" 
        emissive="#ffaa00"
        emissiveIntensity={3.0} // Very bright glow
        roughness={0.2}
        metalness={1.0}
      />
    </mesh>
  );
};