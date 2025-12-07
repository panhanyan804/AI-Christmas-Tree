import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS } from '../constants';

interface PolaroidLayerProps {
  photos: string[];
  morphRef: React.MutableRefObject<number>;
  scale: number;
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
}

const PolaroidItem: React.FC<{ 
    url: string; 
    index: number; 
    total: number;
    morphRef: React.MutableRefObject<number>; 
    scale: number;
    isFocused: boolean;
    onToggleFocus: (e: ThreeEvent<MouseEvent>) => void;
}> = ({ url, index, total, morphRef, scale: globalScale, isFocused, onToggleFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const frameRef = useRef<THREE.Mesh>(null);
  const photoRef = useRef<THREE.Mesh>(null);
  
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (tex.image && tex.image.width && tex.image.height) {
          setAspect(tex.image.width / tex.image.height);
      }
      setTexture(tex);
    });
  }, [url]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  // Calculate Base Positions
  const { treePos, treeRot, galleryPos, galleryRot, randomOffsets } = useMemo(() => {
    const seed = index * 1337.1;
    const rand = () => {
      const x = Math.sin(seed + Math.random() * 100) * 10000;
      return x - Math.floor(x);
    };

    const h = (rand() - 0.5) * (TREE_HEIGHT - 2); 
    const rRatio = 1.0 - ((h + TREE_HEIGHT / 2) / TREE_HEIGHT);
    const r = (TREE_RADIUS + 1.2) * rRatio; 
    const theta = rand() * Math.PI * 2;
    const tPos = new THREE.Vector3(r * Math.cos(theta), h, r * Math.sin(theta));
    
    // Look away from center
    const lookDir = tPos.clone().normalize();
    const mTree = new THREE.Matrix4().lookAt(lookDir, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
    const tRot = new THREE.Quaternion().setFromRotationMatrix(mTree);

    const gx = (Math.random() - 0.5) * 30;
    const gy = (Math.random() - 0.5) * 16;
    const gz = 10 + Math.random() * 15; 
    const gPos = new THREE.Vector3(gx, gy, gz);
    const gRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5, 
        (Math.random() - 0.5) * 0.2
    ));

    return { 
      treePos: tPos, 
      treeRot: tRot,
      galleryPos: gPos, 
      galleryRot: gRot,
      randomOffsets: {
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
          amp: 0.5 + Math.random() * 0.5
      }
    };
  }, [index, total]);

  // Use priority 1 to run AFTER Scene update (which handles tree rotation)
  // This prevents jitter when calculating counter-rotation
  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    const morph = morphRef.current;

    let targetPos = new THREE.Vector3();
    let targetQuat = new THREE.Quaternion();
    let targetScale = globalScale;
    
    const frameScaleX = (aspect + 0.2) / 1.2;
    let targetFrameScaleVec = new THREE.Vector3(frameScaleX, 1, 1);
    let targetPhotoPos = new THREE.Vector3(0, 0.15, 0.03); 
    let targetPhotoScaleVec = new THREE.Vector3(aspect, 1, 1);

    if (isFocused) {
        // --- FOCUSED STATE (Frontal View) ---
        // Position: Fixed distance in front of camera
        const dist = 10; 
        const worldPos = new THREE.Vector3(0, 0, -dist);
        worldPos.applyQuaternion(camera.quaternion);
        worldPos.add(camera.position);

        if (groupRef.current.parent) {
            // Force update parent matrix to ensure smooth tracking without jitter
            groupRef.current.parent.updateWorldMatrix(true, false);
            targetPos.copy(groupRef.current.parent.worldToLocal(worldPos.clone()));
            
            // Rotation: Counter-rotate to face camera perfectly
            // LocalQ = ParentWorldQ_Inverse * CameraWorldQ
            const parentQ = new THREE.Quaternion();
            groupRef.current.parent.getWorldQuaternion(parentQ);
            
            const cameraQ = camera.quaternion.clone();
            targetQuat.copy(parentQ.invert().multiply(cameraQ));
        } else {
             targetPos.copy(worldPos);
             targetQuat.copy(camera.quaternion);
        }

        // Make it large enough to see details
        targetScale = (TREE_HEIGHT / 3) / 1.5;

    } else {
        // --- NORMAL STATE ---
        if (morph < 0.5) {
            targetPos.copy(galleryPos);
            targetQuat.copy(galleryRot);
            
            const { phase, speed, amp } = randomOffsets;
            const floatX = Math.sin(time * speed * 0.5 + phase) * amp;
            const floatY = Math.cos(time * speed * 0.3 + phase) * amp;
            const floatZ = Math.sin(time * speed * 0.2 + phase * 2) * amp * 0.5;
            
            targetPos.add(new THREE.Vector3(floatX, floatY, floatZ));
            
            if (hovered) {
                targetPos.z += 2.0;
                targetScale *= 1.2;
            }
        } else {
            targetPos.copy(treePos);
            targetQuat.copy(treeRot);
            
            const sway = Math.sin(time * 2 + randomOffsets.phase) * 0.05;
            const swayQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sway));
            targetQuat.multiply(swayQuat);
        }
    }

    const lerpSpeed = isFocused ? 0.2 : 0.04;

    if (isFocused) {
        // Snap/Fast lerp for stability when focused
        groupRef.current.position.lerp(targetPos, 0.2);
        groupRef.current.quaternion.slerp(targetQuat, 0.2);
    } else {
        // Smooth transitions
        const currentTargetPos = targetPos.clone(); // Use the calculated target for this frame
        
        // Manual lerp between states if needed to smooth out the morph switch
        if (morph > 0 && morph < 1) {
             const p1 = galleryPos.clone();
             const p2 = treePos.clone();
             const q1 = galleryRot.clone();
             const q2 = treeRot.clone();
             
             currentTargetPos.lerpVectors(p1, p2, morph);
             targetQuat.slerpQuaternions(q1, q2, morph);
        }

        groupRef.current.position.lerp(currentTargetPos, 0.05);
        groupRef.current.quaternion.slerp(targetQuat, 0.05);
    }

    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    
    if (frameRef.current) frameRef.current.scale.lerp(targetFrameScaleVec, 0.1);
    if (photoRef.current) {
        photoRef.current.position.lerp(targetPhotoPos, 0.1);
        photoRef.current.scale.lerp(targetPhotoScaleVec, 0.1);
    }
  }, 1); // Priority 1

  if (!texture) return null;

  return (
    <group 
        ref={groupRef} 
        onClick={onToggleFocus}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
    >
      <mesh ref={frameRef} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.5, 0.05]} />
        <meshStandardMaterial 
            color="#ffffff" 
            roughness={0.4} 
            metalness={0.1} 
            emissive="#ffffff"
            emissiveIntensity={hovered && !isFocused ? 0.1 : 0}
        />
      </mesh>
      
      <mesh ref={photoRef} position={[0, 0.15, 0.03]}>
        <planeGeometry args={[1.0, 1.0]} />
        {/* Use MeshStandardMaterial to respect lighting and avoid bloom washout */}
        <meshStandardMaterial 
            map={texture} 
            roughness={0.5} 
            metalness={0} 
            emissive="#000000"
            color="#ffffff"
        />
      </mesh>
    </group>
  );
};

export const PolaroidLayer: React.FC<PolaroidLayerProps> = ({ photos, morphRef, scale, focusedIndex, setFocusedIndex }) => {
  const handleToggle = (index: number, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (focusedIndex === index) {
        setFocusedIndex(null);
    } else {
        setFocusedIndex(index);
    }
  };

  return (
    <group>
      {photos.map((url, i) => (
        <PolaroidItem 
            key={`${url}-${i}`} 
            url={url} 
            index={i} 
            total={photos.length}
            morphRef={morphRef} 
            scale={scale} 
            isFocused={focusedIndex === i}
            onToggleFocus={(e) => handleToggle(i, e)}
        />
      ))}
    </group>
  );
};