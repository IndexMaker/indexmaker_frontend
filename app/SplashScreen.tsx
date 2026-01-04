"use client";

import { useEffect, useState, useMemo } from "react";
import { useMediaQuery } from "react-responsive";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const topTitle = "/frames/frame53.svg";
const bottomTitle = "/frames/frame52.svg";

const svgs = [
  "/frames/1.svg", // Left
  "/frames/2.svg", // Middle
  "/frames/3.svg", // Right (desktop only)
];

// Preload images function
const preloadImages = (urls: string[]) => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        })
    )
  );
};

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const prefersReducedMotion = useReducedMotion();
  const visibleSvgs = useMemo(
    () => (isMobile ? svgs.slice(0, 2) : svgs),
    [isMobile]
  );

  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [ready, setReady] = useState(false);

  // Preload all images before showing animations
  useEffect(() => {
    const imagesToPreload = [topTitle, bottomTitle, ...visibleSvgs];
    
    preloadImages(imagesToPreload)
      .then(() => {
        setImagesPreloaded(true);
        // Small delay for smooth transition
        setTimeout(() => setReady(true), 100);
      })
      .catch((err) => {
        console.error("Failed to preload images:", err);
        // Still proceed even if preload fails
        setImagesPreloaded(true);
        setReady(true);
      });
  }, [visibleSvgs]);

  useEffect(() => {
    if (!ready) return;
    
    // Reduced animation time for better UX
    const animationDuration = prefersReducedMotion ? 500 : 1800;
    const timeout = setTimeout(() => onFinish(), animationDuration);
    return () => clearTimeout(timeout);
  }, [ready, onFinish, prefersReducedMotion]);

  // Optimized animation variants with shorter delays
  const fadeVariants = (i: number) => ({
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0.2 }
        : {
            delay: i * 0.15 + 0.2,
            type: "spring",
            stiffness: 120,
            damping: 20,
          },
    },
  });

  // Show a minimal loading state if images aren't preloaded yet
  if (!imagesPreloaded) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-white flex flex-col justify-center items-center px-4 md:px-12 py-8 md:py-12 will-change-transform">
      {/* Top Title aligned inside container */}
      <div
        className={`w-full max-w-[720px] flex ${
          isMobile ? "justify-center mt-[-100px]" : "justify-start"
        } mb-4`}
      >
        <motion.div
          className="relative w-[450px] md:w-[400px] h-[60px] md:h-[80px]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.3 } }}
        >
          <Image
            src={topTitle}
            alt="Top Title"
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 450px, 400px"
          />
        </motion.div>
      </div>

      {/* SVG Cards with responsive sizing */}
      <div className="w-full max-w-[720px] flex justify-center gap-4 md:gap-6">
        {visibleSvgs.map((src, i) => (
          <motion.div
            key={i}
            variants={fadeVariants(i) as any}
            initial="hidden"
            animate="visible"
            className="flex-1 max-w-[220px] aspect-[3/4] relative will-change-transform"
          >
            <Image
              src={src}
              alt={`Frame ${i + 1}`}
              fill
              priority
              className="object-contain"
              sizes="(max-width: 768px) 220px, 220px"
            />
          </motion.div>
        ))}
      </div>

      {/* Bottom Logo */}
      <motion.div
        className={`flex justify-center mt-8 ${
          isMobile ? "absolute bottom-15" : ""
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          transition: { 
            delay: prefersReducedMotion ? 0.2 : 0.8, 
            duration: 0.3 
          } 
        }}
      >
        <div className="relative w-[360px] md:w-[40vw] h-[80px]">
          <Image
            src={bottomTitle}
            alt="Bottom Title"
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 360px, 40vw"
          />
        </div>
      </motion.div>
    </div>
  );
}
