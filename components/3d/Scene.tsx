import React, { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { MetalType, GemType, SkinTone, RingModelType } from "../../types";
import { RingModel } from "./RingModel";
import { HandModel } from "./HandModel";
import { RingLoader } from "../ui/RingLoader";
import * as THREE from "three";

interface SceneProps {
  metal: MetalType;
  gem: GemType;
  diamondShape: string;
  ringModel: RingModelType;
  autoRotate: boolean;
  skinTone: SkinTone;
  renderMode: "performance" | "quality";
  onToggleAutoRotate?: () => void;
}

const ENV_Metal = "/assets/metal/env.hdr";

export default function Scene({
  metal,
  gem,
  diamondShape,
  ringModel,
  autoRotate,
  // removed tryHandOn
  skinTone,
  renderMode,
  onToggleAutoRotate,
}: SceneProps) {
  const [isModelReady, setIsModelReady] = useState(false);
  const [dpr, setDpr] = useState<number>(1);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const isMacChrome = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      /Mac/.test(navigator.userAgent) &&
      /Chrome/.test(navigator.userAgent),
    []
  );

  useEffect(() => {
    const deviceDpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // Increase DPR for crisper rendering but cap to avoid excessive GPU cost
    const cap = 2;
    const capped = Math.min(deviceDpr, cap);
    setDpr(capped);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(max-width: 640px)');
    const handler = (e: MediaQueryList | MediaQueryListEvent) => setIsMobile((e as any).matches ?? (e as MediaQueryList).matches);
    if (mq) {
      setIsMobile(mq.matches);
      if (mq.addEventListener) mq.addEventListener('change', handler as any);
      else mq.addListener(handler as any);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', handler as any);
        else mq.removeListener(handler as any);
      };
    }
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Adjust ring size and position based on device
  const ringPosition = isMobile 
    ? new THREE.Vector3(0.1, 0.50, -0.3)   // Move up more on mobile
    : new THREE.Vector3(0.1, -0.29, -0.3); // Keep original position on desktop
  
  const ringGroupScale = isMobile ? 0.075 : 0.10; // Reduce size on mobile
  const handReferenceScale = 0.08;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<any>(null);

  // Request frame on user interaction for demand-based rendering on mobile
  useEffect(() => {
    if (!isMobile || !controlsRef.current) return;
    
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const handleInteraction = () => {
      controlsRef.current?.invalidate?.();
    };

    const passiveOptions = { passive: true };
    canvas.addEventListener('pointerdown', handleInteraction, passiveOptions as any);
    canvas.addEventListener('pointermove', handleInteraction, passiveOptions as any);
    canvas.addEventListener('pointerup', handleInteraction, passiveOptions as any);
    canvas.addEventListener('wheel', handleInteraction, passiveOptions as any);

    return () => {
      canvas.removeEventListener('pointerdown', handleInteraction);
      canvas.removeEventListener('pointermove', handleInteraction);
      canvas.removeEventListener('pointerup', handleInteraction);
      canvas.removeEventListener('wheel', handleInteraction);
    };
  }, [isMobile]);

  const zoomIn = () => {
    try {
      // call dollyOut to move camera closer for a + (zoom in) action
      controlsRef.current?.dollyOut?.(1.15);
      controlsRef.current?.update?.();
    } catch (err) {
      console.error('zoomIn failed', err);
    }
  };

  const zoomOut = () => {
    try {
      // call dollyIn to move camera farther for a - (zoom out) action
      controlsRef.current?.dollyIn?.(1.15);
      controlsRef.current?.update?.();
    } catch (err) {
      console.error('zoomOut failed', err);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed', err);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none">
      {!isModelReady && <RingLoader />}

        <Canvas
        shadows={false}
        dpr={dpr}
        frameloop={isMobile ? "demand" : "always"}
        gl={{
          antialias: true,
          precision: "highp",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
          depth: true,
          stencil: false,
          alpha: true,
          logarithmicDepthBuffer: false,
        }}
        camera={{ position: [-1, 2, 6], fov: 50 }}
        className="w-full h-full select-none"
        style={
          (() => {
            const base: React.CSSProperties = {
              opacity: isModelReady ? 1 : 0,
              transition: "opacity 0.5s ease-in-out",
            };
            if (!isMobile) {
              return {
                ...base,
                transform: 'translateX(50px) translateY(-50px)',
                marginLeft: '-100px',
                marginTop: '40px',
              };
            }
            return base;
          })()
        }
      >
        <Suspense fallback={null}>
          <Environment
            files={ENV_Metal}
            background={false}
            blur={0.0}
            environmentIntensity={0.9}
          />
          <ambientLight intensity={0.6} />
          <spotLight
            position={[5, 8, 5]}
            angle={0.3}
            penumbra={0.5}
            intensity={1.5}
          />

          <group position={[0, -0.5, 0]} scale={ringGroupScale}>
            <RingModel
              metal={metal}
              gem={gem}
              diamondShape={diamondShape}
              ringModel={ringModel}
              renderMode={renderMode}
              onModelReady={() => setIsModelReady(true)}
              isMobile={isMobile}
            />
          </group>

          <ContactShadows
            position={[0, -1.7, 0]}
            opacity={0.12}
            scale={10}
            blur={1.5}
            far={4}
          />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.8}
            minDistance={2.5}
            maxDistance={8}
            autoRotate={autoRotate}
            autoRotateSpeed={2}
          />

          <EffectComposer enableNormalPass={false}>
            {renderMode === "quality" && !isMobile && !isMacChrome && (
              <Bloom
                intensity={0.15}
                luminanceThreshold={2}
                luminanceSmoothing={0.3}
                radius={0.4}
                blendFunction={BlendFunction.SCREEN}
              />
            )}
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Top-right quick action buttons (rotate / center / zoom in / zoom out) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-3">
        <button
          aria-label="Toggle auto-rotate"
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
            autoRotate ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
          }`}
          onClick={() => onToggleAutoRotate && onToggleAutoRotate()}
        >
            <img
            src="/assets/images/rotate.png"
            alt="rotate"
            className="w-7 h-7 object-contain"
            draggable={false}
            style={{ filter: 'invert(1) brightness(2)' }}
          />
        </button>

        <button
          aria-label="Fullscreen"
          className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg"
          onClick={toggleFullscreen}
        >
          <img
            src="/assets/images/fullscreen.png"
            alt="fullscreen"
            className="w-4 h-4 object-contain"
            draggable={false}
            style={{ filter: 'invert(1) brightness(2)' }}
          />
        </button>

        <button
          aria-label="Zoom in"
          className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg"
          onClick={zoomIn}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          aria-label="Zoom out"
          className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg"
          onClick={zoomOut}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};
