import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FOLIAGE_COUNT, TREE_HEIGHT, TREE_RADIUS, SCATTER_RADIUS } from '../constants';

const FoliageMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uColor: { value: new THREE.Color() },
    uPixelRatio: { value: 1 },
    uWind: { value: 0 }, // New uniform for rotational wind force
  },
  vertexShader: `
    uniform float uTime;
    uniform float uMorph;
    uniform float uPixelRatio;
    uniform float uWind;
    
    attribute vec3 aTreePos;
    attribute vec3 aScatterPos;
    attribute float aSize;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec3 targetPos = mix(aScatterPos, aTreePos, uMorph);
      
      // Physics simulation in shader
      float breathe = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
      float drift = sin(uTime * 0.5 + aRandom * 100.0) * (1.0 - uMorph) * 2.0;
      
      // Wind effect: Deflect particles based on wind strength and height
      // More deflection at the bottom/outer edges (simplified)
      float windEffect = uWind * (aTreePos.y + 6.0) * 0.1 * sin(uTime * 5.0 + aRandom * 20.0);
      
      vec3 finalPos = targetPos + vec3(drift) + normal * breathe;
      
      // Apply wind rotation/shear
      finalPos.x += windEffect;
      finalPos.z += windEffect * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Increased multiplier from 40.0 to 70.0 for more prominent particles
      gl_PointSize = (aSize * 70.0 * uPixelRatio) / -mvPosition.z;
      
      // Slightly more opaque when formed
      vAlpha = 0.7 + 0.3 * uMorph; 
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float circle = 1.0 - smoothstep(0.1, 0.5, dist);
      float core = 1.0 - smoothstep(0.0, 0.15, dist);
      
      vec3 finalColor = uColor + vec3(0.5, 0.5, 0.2) * core; 

      if (circle < 0.01) discard;

      gl_FragColor = vec4(finalColor, circle * vAlpha);
    }
  `
};

interface FoliageProps {
  color: string;
  morphRef: React.MutableRefObject<number>;
  angularVelocity: React.MutableRefObject<number>; // Receive physics ref
}

export const FoliageLayer: React.FC<FoliageProps> = ({ color, morphRef, angularVelocity }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positions, treePositions, scatterPositions, sizes, randoms } = useMemo(() => {
    const pos = new Float32Array(FOLIAGE_COUNT * 3);
    const treePos = new Float32Array(FOLIAGE_COUNT * 3);
    const scatterPos = new Float32Array(FOLIAGE_COUNT * 3);
    const sz = new Float32Array(FOLIAGE_COUNT);
    const rnd = new Float32Array(FOLIAGE_COUNT);

    for (let i = 0; i < FOLIAGE_COUNT; i++) {
      const h = (Math.random() - 0.5) * TREE_HEIGHT;
      const rRatio = 1.0 - ((h + TREE_HEIGHT / 2) / TREE_HEIGHT);
      const r = Math.random() * TREE_RADIUS * rRatio; 
      const theta = Math.random() * Math.PI * 2;
      
      treePos[i * 3] = r * Math.cos(theta);
      treePos[i * 3 + 1] = h;
      treePos[i * 3 + 2] = r * Math.sin(theta);

      const u = Math.random();
      const v = Math.random();
      const phi = Math.acos(2 * u - 1) - Math.PI / 2;
      const lam = 2 * Math.PI * v;
      const sr = SCATTER_RADIUS * (0.5 + Math.random() * 0.5); 
      
      scatterPos[i * 3] = sr * Math.cos(phi) * Math.cos(lam);
      scatterPos[i * 3 + 1] = sr * Math.cos(phi) * Math.sin(lam);
      scatterPos[i * 3 + 2] = sr * Math.sin(phi);

      pos[i * 3] = scatterPos[i * 3];
      pos[i * 3 + 1] = scatterPos[i * 3 + 1];
      pos[i * 3 + 2] = scatterPos[i * 3 + 2];

      sz[i] = Math.random() * 1.5 + 0.5;
      rnd[i] = Math.random();
    }

    return {
      positions: pos,
      treePositions: treePos,
      scatterPositions: scatterPos,
      sizes: sz,
      randoms: rnd
    };
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uMorph.value = morphRef.current;
      materialRef.current.uniforms.uColor.value.set(color);
      materialRef.current.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
      
      // Pass physics velocity to shader
      materialRef.current.uniforms.uWind.value = THREE.MathUtils.lerp(
         materialRef.current.uniforms.uWind.value,
         angularVelocity.current,
         0.1
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={FOLIAGE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aTreePos" count={FOLIAGE_COUNT} array={treePositions} itemSize={3} />
        <bufferAttribute attach="attributes-aScatterPos" count={FOLIAGE_COUNT} array={scatterPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={FOLIAGE_COUNT} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={FOLIAGE_COUNT} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[FoliageMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};