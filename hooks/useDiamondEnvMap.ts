import { useState, useEffect } from "react";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export const useDiamondEnvMap = (diamondEXR: string, isMobile?: boolean) => {
  const [diamondEnvMap, setDiamondEnvMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new EXRLoader();
    let currentTexture: THREE.Texture | null = null;

    // Defer loading on mobile to prioritize initial render
    const load = () => {
      if (!isMounted) return;
      
      loader.load(
        diamondEXR,
        (tex) => {
          if (!isMounted) {
            tex.dispose();
            return;
          }
          // Ensure high quality sampling for the environment map
          tex.mapping = THREE.EquirectangularReflectionMapping;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          try {
            // Favor sRGB for color-correct reflections when appropriate
            tex.encoding = (THREE as any).sRGBEncoding || THREE.LinearEncoding;
          } catch (err) {
            tex.encoding = THREE.LinearEncoding;
          }
          // Some DataTextures support anisotropy — increase for sharper sampling
          try {
            (tex as any).anisotropy = 16;
          } catch (err) {}
          tex.needsUpdate = true;
          currentTexture = tex;
          setDiamondEnvMap(tex);
        },
        undefined,
        (err) => {
          if (isMounted) {
            console.warn("EXR load error:", err);
          }
        }
      );
    };

    if (isMobile) {
      // On mobile, defer loading of EXR until idle
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(load, { timeout: 2000 });
        return () => {
          isMounted = false;
          cancelIdleCallback(id);
          if (currentTexture) {
            currentTexture.dispose();
          }
        };
      }
    }
    
    load();

    return () => {
      isMounted = false;
      if (currentTexture) {
        currentTexture.dispose();
      }
      // EXRLoader inherits from DataTextureLoader; dispose is available in three >=0.180
      if (typeof (loader as any).dispose === "function") {
        (loader as any).dispose();
      }
      setDiamondEnvMap(null);
    };
  }, [diamondEXR, isMobile]);

  return diamondEnvMap;
};

