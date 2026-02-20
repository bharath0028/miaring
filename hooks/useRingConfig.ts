import { useState, useEffect } from "react";
import { loadRingConfig, RingConfig, RingConfigData } from "../utils/ringConfig";

export const useRingConfig = (ringModel: string) => {
  const [ringConfig, setRingConfig] = useState<RingConfig | null>(null);
  const [diamondEXR, setDiamondEXR] = useState<string>("/assets/diamond/gem.exr");

  useEffect(() => {
    loadRingConfig().then((config: RingConfigData) => {
      const selectedRing = config.rings[ringModel] || config.rings["ring"];
      if (selectedRing) {
        setRingConfig(selectedRing);
        // Defer head preloading to after initial render for better performance
        if (selectedRing.heads) {
          const preloadHeads = () => {
            const { useGLTF } = require("@react-three/drei");
            Object.values(selectedRing.heads).forEach((url) => {
              requestIdleCallback(() => useGLTF.preload(url));
            });
          };
          requestIdleCallback(preloadHeads);
        }
      }
      setDiamondEXR(config.diamondEXR);
    });
  }, [ringModel]);

  return { ringConfig, diamondEXR };
};

