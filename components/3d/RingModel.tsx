import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useRingConfig } from "../../hooks/useRingConfig";
import { useDiamondEnvMap } from "../../hooks/useDiamondEnvMap";
import { useRingAnimation } from "../../hooks/useRingAnimation";
import { getHeadUrl, isDiamondName } from "../../utils/helpers";
import { applyOpacityToObject } from "../../utils/materials";
import { METAL_COLORS } from "../../types";
import { DiamondMesh } from "../ring/DiamondMesh";

interface RingModelProps {
  metal: string;
  gem: string;
  diamondShape: string;
  ringModel?: string;
  envMapIntensity?: number;
  renderMode?: "performance" | "quality";
  onModelReady?: () => void;
  isMobile?: boolean;
}

export const RingModel: React.FC<RingModelProps> = ({
  metal,
  gem,
  diamondShape,
  ringModel = "ring",
  envMapIntensity = 1.5,
  renderMode = "performance",
  onModelReady,
  isMobile = false,
}) => {
  const { ringConfig, diamondEXR } = useRingConfig(ringModel);
  const diamondEnvMap = useDiamondEnvMap(diamondEXR, isMobile);
  const hasNotifiedRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);

  const baseRingUrl = ringConfig?.baseRing || "/assets/models/ring/earmetal.glb";
  const hasHeads = ringConfig?.heads && Object.keys(ringConfig.heads).length > 0;
  const headUrl = hasHeads ? getHeadUrl(ringConfig, diamondShape) : "/assets/models/ring/heads/round.glb";

  // Lazy load models - only load when actually needed
  const { scene: baseScene } = useGLTF(baseRingUrl, true);
  const { scene: headScene } = useGLTF(headUrl, hasHeads && !!ringConfig);

  // Clone scenes and apply materials
  const disposeObject = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => {
            if ((mat as any).map) {
              ((mat as any).map as THREE.Texture).dispose?.();
            }
            mat.dispose?.();
          });
        } else if (material) {
          if ((material as any).map) {
            ((material as any).map as THREE.Texture).dispose?.();
          }
          (material as any).dispose?.();
        }
      }
    });
  };

  const baseClone = useMemo(() => {
    if (!baseScene) return null;
    const clone = baseScene.clone(true);
    const metalColor = new THREE.Color(METAL_COLORS[metal] || "#D9D9D9");
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material?.clone();
        if (!isDiamondName(child.name)) {
          child.material = new THREE.MeshStandardMaterial({
            color: metalColor,
            metalness: 1,
            roughness: 0.05,
            envMapIntensity: 2.5,
          });
        }
      }
    });
    return clone;
  }, [baseScene, metal]);

  const headClone = useMemo(() => {
    // Only create head clone if ring has heads
    if (!headScene || !hasHeads) return null;
    const clone = headScene.clone(true);
    const metalColor = new THREE.Color(METAL_COLORS[metal] || "#D9D9D9");
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => m.clone())
          : child.material?.clone();
        if (!isDiamondName(child.name)) {
          child.material = new THREE.MeshStandardMaterial({
            color: metalColor,
            metalness: 1,
            roughness: 0.05,
            envMapIntensity: 2.5,
          });
        }
      }
    });
    return clone;
  }, [headScene, metal, hasHeads]);

  // Animation hook
  const { animProgress, ringTransitionProgress, ringScale, ringRotation } =
    useRingAnimation({
      ringModel,
      diamondShape,
      baseClone,
      headClone,
      isMobile,
    });

  // Collect diamond meshes
  const baseDiamondWorld = useMemo(() => {
    if (!baseClone) return [];
    const list: Array<{
      pos: THREE.Vector3;
      quat: THREE.Quaternion;
      scale: THREE.Vector3;
      geo: THREE.BufferGeometry;
      minY: number;
      height: number;
    }> = [];

    baseClone.updateMatrixWorld(true);
    baseClone.traverse((c) => {
      if (c instanceof THREE.Mesh && isDiamondName(c.name)) {
        c.visible = false;
        const bbox = new THREE.Box3().setFromObject(c);
        // Extract world position and quaternion from the matrix
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        c.matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
        list.push({
          pos: worldPos,
          quat: worldQuat,
          scale: worldScale,
          geo: c.geometry.clone(),
          minY: bbox.min.y,
          height: bbox.max.y - bbox.min.y,
        });
      }
    });
    return list;
  }, [baseClone]);

  const headDiamondWorld = useMemo(() => {
    if (!headClone) return [];
    const list: Array<{
      pos: THREE.Vector3;
      quat: THREE.Quaternion;
      scale: THREE.Vector3;
      geo: THREE.BufferGeometry;
      minY: number;
      height: number;
    }> = [];

    headClone.updateMatrixWorld(true);
    headClone.traverse((c) => {
      if (c instanceof THREE.Mesh && isDiamondName(c.name)) {
        c.visible = false;
        const bbox = new THREE.Box3().setFromObject(c);
        // Extract world position and quaternion from the matrix
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        c.matrixWorld.decompose(worldPos, worldQuat, worldScale);
        
        list.push({
          pos: worldPos,
          quat: worldQuat,
          scale: worldScale,
          geo: c.geometry.clone(),
          minY: bbox.min.y,
          height: bbox.max.y - bbox.min.y,
        });
      }
    });
    return list;
  }, [headClone]);

  // Update materials when metal changes (optimized to reuse materials)
  useEffect(() => {
    if (!baseClone) return;
    const metalColor = new THREE.Color(METAL_COLORS[metal] || "#D9D9D9");
    const applyMetal = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && !isDiamondName(child.name)) {
          // Reuse existing material and just update color to prevent shader recompilation
          if (child.material && (child.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            (child.material as THREE.MeshStandardMaterial).color.set(metalColor);
          } else {
            // Only create new material if it doesn't exist or isn't MeshStandardMaterial
            child.material = new THREE.MeshStandardMaterial({
              color: metalColor,
              metalness: 1,
              roughness: 0.05,
              envMapIntensity: 2.5,
            });
          }
        }
      });
    };
    applyMetal(baseClone);
    if (headClone) {
      applyMetal(headClone);
    }
  }, [baseClone, headClone, metal]);

  // Update group transform and opacity
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(ringScale);
      groupRef.current.rotation.y = ringRotation;
    }

    if (baseClone) {
      applyOpacityToObject(baseClone, ringTransitionProgress);
    }
    if (headClone) {
      applyOpacityToObject(headClone, ringTransitionProgress);
    }
  }, [ringScale, ringRotation, ringTransitionProgress, baseClone, headClone]);

  // Notify when loaded
  useEffect(() => {
    // For rings without heads, only need baseClone. For rings with heads, need both.
    const isReady = hasHeads
      ? (diamondEnvMap && baseClone && headClone)
      : baseClone;

    if (isReady && !hasNotifiedRef.current) {
      const timer = setTimeout(() => {
        if (onModelReady) {
          onModelReady();
          hasNotifiedRef.current = true;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [diamondEnvMap, baseClone, headClone, onModelReady, hasHeads]);

  // Reset notification on shape change
  useEffect(() => {
    hasNotifiedRef.current = false;
  }, [diamondShape]);

  // Cleanup cloned scenes to avoid GPU leaks on repeated mounts
  useEffect(() => {
    return () => {
      if (baseClone) {
        disposeObject(baseClone);
      }
      if (headClone) {
        disposeObject(headClone);
      }
      // Removed useGLTF.clear() calls to prevent heavy re-initialization
      // This was causing shader recompilation and bounding box recalculation
    };
  }, [baseClone, headClone]);

  if (!baseClone) return null;

  return (
    <group ref={groupRef}>
      <primitive object={baseClone} visible={ringTransitionProgress > 0} />
      {headClone && (
        <primitive object={headClone} visible={ringTransitionProgress > 0} />
      )}

      {diamondEnvMap && (
        <>
          {/* Base ring diamonds */}
          {baseDiamondWorld.map((d, i) => (
            <DiamondMesh
              key={`base-${ringModel}-${i}`}
              geometry={d.geo}
              position={d.pos}
              quaternion={d.quat}
              scale={d.scale}
              gem={gem}
              envMap={diamondEnvMap}
              opacity={ringTransitionProgress}
              renderMode={renderMode}
              isMobile={isMobile}
            />
          ))}

          {/* Head diamonds */}
          {headDiamondWorld.map((d, i) => (
            <DiamondMesh
              key={`head-${diamondShape}-${i}`}
              geometry={d.geo}
              position={d.pos}
              quaternion={d.quat}
              scale={d.scale}
              gem={gem}
              envMap={diamondEnvMap}
              opacity={ringTransitionProgress * Math.min(animProgress * 2, 1)}
              minY={d.minY}
              height={d.height}
              animProgress={animProgress}
              renderMode={renderMode}
              isMobile={isMobile}
            />
          ))}
        </>
      )}
    </group>
  );
};
