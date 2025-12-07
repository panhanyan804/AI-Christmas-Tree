import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SNOW_COUNT = 3000;

const SnowMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uVelocity: { value: 0 }, // Tree angular velocity acting as wind
    uColor: { value: new THREE.Color('#ffffff') },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVelocity;
    
    attribute vec3 aRandom;
    attribute float aSize;
    
    varying float vAlpha;

    void main() {
      vec3 pos = position;
      
      // Fall down
      float fallSpeed = 2.0 + aRandom.y;
      pos.y -= uTime * fallSpeed;
      
      // Wrap around Y (height 30 to -10)
      float height = 40.0;
      pos.y = mod(pos.y + 10.0, height) - 10.0;
      
      // Wind/Centrifugal force from tree rotation
      // The faster the tree spins (uVelocity), the more particles spiral out
      float angle = atan(pos.z, pos.x);
      float radius = length(pos.xz);
      
      // Add rotation based on wind
      angle += uVelocity * 0.1 * (pos.y + 10.0) * 0.1; 
      
      // Add centrifugal push
      radius += abs(uVelocity) * 0.5 * sin(uTime + aRandom.x * 10.0);
      
      pos.x = radius * cos(angle);
      pos.z = radius * sin(angle);
      
      // Turbulence
      pos.x += sin(uTime * 2.0 + aRandom.z * 10.0) * 0.5;
      pos.z += cos(uTime * 1.5 + aRandom.x * 10.0) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      gl_PointSize = (aSize * 100.0) / -mvPosition.z;
      
      // Fade near edges of height
      float edge = smoothstep(-10.0, -5.0, pos.y) * (1.0 - smoothstep(25.0, 30.0, pos.y));
      vAlpha = 0.6 * edge;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float circle = 1.0 - smoothstep(0.4, 0.5, dist);
      float glow = 1.0 - smoothstep(0.0, 0.4, dist);
      
      if (circle < 0.01) discard;

      gl_FragColor = vec4(uColor + glow * 0.5, circle * vAlpha);
    }
  `
};

interface SnowProps {
  angularVelocity: React.MutableRefObject<number>;
}

export const SnowLayer: React.FC<SnowProps> = ({ angularVelocity }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positions, randoms, sizes } = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3);
    const rnd = new Float32Array(SNOW_COUNT * 3);
    const sz = new Float32Array(SNOW_COUNT);

    for (let i = 0; i < SNOW_COUNT; i++) {
      // Cylinder distribution
      const r = 2 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.25) * 40; // -10 to 30

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      rnd[i * 3] = Math.random();
      rnd[i * 3 + 1] = Math.random();
      rnd[i * 3 + 2] = Math.random();

      sz[i] = Math.random() * 0.5 + 0.2;
    }

    return { positions: pos, randoms: rnd, sizes: sz };
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      // Smoothly pass velocity to shader
      materialRef.current.uniforms.uVelocity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uVelocity.value,
        angularVelocity.current * 10.0, // Scale up for visual effect
        0.05
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={SNOW_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={SNOW_COUNT} array={randoms} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={SNOW_COUNT} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[SnowMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};