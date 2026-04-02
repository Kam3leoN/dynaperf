import { motion, AnimatePresence } from "framer-motion";
import type { Badge } from "@/hooks/useGamification";

interface BadgeRewardProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export function BadgeReward({ badge, onDismiss }: BadgeRewardProps) {
  if (!badge) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4"
        >
          {/* Confetti burst animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            className="text-6xl mb-4"
          >
            {badge.icon}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-1">
              🎉 Nouveau Badge !
            </h2>
            <h3 className="text-lg font-semibold text-primary mb-2">
              {badge.label}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {badge.description}
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onDismiss}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Super ! 🚀
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
