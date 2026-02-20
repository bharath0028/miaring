import { useState, useEffect, useRef } from "react";

interface UseRingAnimationProps {
  ringModel: string;
  diamondShape: string;
  baseClone: any;
  headClone: any;
  isMobile?: boolean;
}

export const useRingAnimation = ({
  ringModel,
  diamondShape,
  baseClone,
  headClone,
  isMobile = false,
}: UseRingAnimationProps) => {
  const [animProgress, setAnimProgress] = useState(1);
  const [ringTransitionProgress, setRingTransitionProgress] = useState(1);
  const [ringScale, setRingScale] = useState(1);
  const [ringRotation, setRingRotation] = useState(0);
  const prevShapeRef = useRef(diamondShape);
  const prevRingModelRef = useRef(ringModel);
  const animFrameRef = useRef<number | null>(null);

  // Easing function (ease-in-out cubic)
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Handle ring model change animation (fade + scale + rotation)
  useEffect(() => {
    if (prevRingModelRef.current !== ringModel && prevRingModelRef.current) {
      prevRingModelRef.current = ringModel;

      const startTime = Date.now();
      const duration = isMobile ? 700 : 1050; // Shorter animation on mobile
      const fadeOutDuration = isMobile ? 250 : 400;
      const fadeInDuration = isMobile ? 400 : 600;
      const frameTime = isMobile ? 33 : 16; // Target 30fps on mobile, 60fps on desktop

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Only update every frameTime ms on mobile to reduce render calls
        if (elapsed % Math.ceil(frameTime) < 1 || !isMobile) {
          if (elapsed < fadeOutDuration) {
            const phaseProgress = elapsed / fadeOutDuration;
            const eased = easeInOutCubic(phaseProgress);

            setRingTransitionProgress(1 - eased);
            setRingScale(1 - eased * 0.2);
            setRingRotation(eased * Math.PI * 0.5);
          } else if (elapsed < fadeOutDuration + 150) {
            setRingTransitionProgress(0);
            setRingScale(0.8);
            setRingRotation(Math.PI * 0.5);
          } else {
            const phaseElapsed = elapsed - fadeOutDuration - 150;
            const phaseProgress = Math.min(phaseElapsed / fadeInDuration, 1);
            const eased = easeInOutCubic(phaseProgress);

            setRingTransitionProgress(eased);
            setRingScale(0.8 + eased * 0.2);
            setRingRotation(Math.PI * 0.5 - eased * Math.PI * 0.5);
          }
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setRingTransitionProgress(1);
          setRingScale(1);
          setRingRotation(0);
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else if (!prevRingModelRef.current) {
      prevRingModelRef.current = ringModel;
      setRingTransitionProgress(1);
      setRingScale(1);
      setRingRotation(0);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ringModel, baseClone, headClone, isMobile]);

  // Handle diamond shape change animation
  useEffect(() => {
    if (prevShapeRef.current !== diamondShape) {
      setAnimProgress(0);
      prevShapeRef.current = diamondShape;

      const startTime = Date.now();
      const duration = isMobile ? 400 : 600; // Shorter animation on mobile
      const frameTime = isMobile ? 33 : 16;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Only update at throttled rate on mobile
        if (elapsed % Math.ceil(frameTime) < 1 || !isMobile) {
          setAnimProgress(eased);
        }
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [diamondShape, isMobile]);

  return {
    animProgress,
    ringTransitionProgress,
    ringScale,
    ringRotation,
  };
};

