import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoLight from "@/assets/DynaPerf_light.svg";

const SPLASH_DURATION = 2200;

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.body.style.backgroundColor = "#ee4540";
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={() => {
      document.body.style.backgroundColor = "";
      onFinished();
    }}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "#ee4540" }}
        >
          <motion.img
            src={logoLight}
            alt="DynaPerf"
            className="w-[80%] sm:w-[60%] lg:w-[40%] max-w-md mb-6"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />
          <motion.p
            className="text-white/80 text-base sm:text-lg mt-2 font-medium"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            Performance &amp; Excellence
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
