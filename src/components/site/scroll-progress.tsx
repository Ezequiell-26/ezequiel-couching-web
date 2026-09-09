"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/** Progreso de lectura: hairline volt en el borde superior. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, restDelta: 0.001 });
  const reduce = useReducedMotion();

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="absolute inset-x-0 top-0 h-0.5 origin-left bg-primary"
    />
  );
}
