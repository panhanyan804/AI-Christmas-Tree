import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS, SCATTER_RADIUS } from '../constants';

interface OrnamentProps {
  count: number;
  type: 'cube' | 'sphere';
  color: string;
  morphRef: React.MutableRefObject<number>;
  scaleBase: number;
}

export const OrnamentsLayer: React.FC<OrnamentProps> = ({ count, type, color, morphRef, scaleBase }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { treePos, scatterPos, rotations, randoms } = useMemo(() => {
    const tPos = [];
    const sPos = [];
    const rot = [];
    const rnd = [];

    for (let i = 0; i < count; i++) {
      const h = (Math.random() - 0.5) * (TREE_HEIGHT - 1); 
      const rRatio = 1.0 - ((h + TREE_HEIGHT / 2) / TREE_HEIGHT);
      const r = (Math.random() * 0.5 + 0.8) * TREE_RADIUS * rRatio; 
      const theta = Math.random() * Math.PI * 2 * 3; 
      
      tPos.push(new THREE.Vector3(r * Math.cos(theta), h, r * Math.sin(theta)));

      const sr = SCATTER_RADIUS * (0.8 + Math.random() * 0.5);
      const u = Math.random();
      const v = Math.random();
      const phi = Math.acos(2 * u - 1) - Math.PI / 2;
      const lam = 2 * Math.PI * v;
      sPos.push(new THREE.Vector3(
        sr * Math.cos(phi) * Math.cos(lam),
        sr * Math.cos(phi) * Math.sin(lam),
        sr * Math.sin(phi)
      ));

      rot.push(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0));
      rnd.push(Math.random());
    }
    return { treePos: tPos, scatterPos: sPos, rotations: rot, randoms: rnd };
  }, [count]);

  useLayoutEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.copy(scatterPos[i]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy, scatterPos]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const time = clock.getElapsedTime();
    const morphFactor = morphRef.current;

    for (let i = 0; i < count; i++) {
      const tP = treePos[i];
      const sP = scatterPos[i];
      const r = randoms[i];

      dummy.position.lerpVectors(sP, tP, morphFactor);

      const floatY = Math.sin(time * 1.5 + r * 10) * 0.2;
      dummy.position.y += floatY;

      dummy.rotation.x = rotations[i].x + time * 0.5 * (1 - morphFactor);
      dummy.rotation.y = rotations[i].y + time * 0.3;
      dummy.rotation.z = rotations[i].z + time * 0.2 * (1 - morphFactor);

      const scale = scaleBase + Math.sin(time * 3 + r * 100) * (scaleBase * 0.2);
      dummy.scale.setScalar(scale * (0.5 + 0.5 * morphFactor));

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.color.set(color);
        meshRef.current.material.emissive.set(color);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      {type === 'cube' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : (
        <sphereGeometry args={[0.6, 16, 16]} />
      )}
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.9}
        emissiveIntensity={0.4}
      />
    </instancedMesh>
  );
};