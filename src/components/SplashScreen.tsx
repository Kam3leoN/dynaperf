import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION = 2200;

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "#ee4540" }}
        >
          {/* Logo */}
          <motion.img
            src={`${import.meta.env.BASE_URL}pwaDynaperf.svg`}
            alt="DynaPerf"
            className="w-24 h-24 mb-6"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />

          {/* App name */}
          <motion.h1
            className="text-3xl font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            DynaPerf
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="text-white/80 text-sm mt-2 font-medium"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          >
            Performance &amp; Excellence
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
