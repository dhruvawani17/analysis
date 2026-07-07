"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorEffect() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const x = useSpring(cursorX, { damping: 25, stiffness: 200, mass: 0.5 });
  const y = useSpring(cursorY, { damping: 25, stiffness: 200, mass: 0.5 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 12);
      cursorY.set(e.clientY - 12);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-6 h-6 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 pointer-events-none z-[9999] mix-blend-screen hidden md:block"
      style={{ x, y }}
    />
  );
}
