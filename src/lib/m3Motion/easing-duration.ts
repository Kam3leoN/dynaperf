/**
 * Durées et courbes M3 Expressive — miroir des variables CSS (--m3-duration-*, --m3-ease-*).
 * @see https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
 */

/** Durées en millisecondes (tableau « sensible defaults »). */
export const M3_MOTION_DURATION_MS = {
  emphasized: 500,
  emphasizedDecelerate: 400,
  emphasizedAccelerate: 200,
  standard: 300,
  standardDecelerate: 250,
  standardAccelerate: 200,
} as const;

export type M3MotionDurationToken = keyof typeof M3_MOTION_DURATION_MS;

/** Courbes cubic-bezier [x1,y1,x2,y2] pour Framer Motion `ease`. */
export const M3_MOTION_EASE = {
  emphasized: [0.2, 0, 0, 1] as const,
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1] as const,
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15] as const,
  standard: [0.2, 0, 0, 1] as const,
  standardDecelerate: [0, 0, 0, 1] as const,
  standardAccelerate: [0.3, 0, 1, 1] as const,
} as const;

export type M3MotionEaseToken = keyof typeof M3_MOTION_EASE;

/** Même courbes en `cubic-bezier(...)` pour APIs type Recharts / Canvas. */
export const M3_MOTION_EASE_CSS: Record<M3MotionEaseToken, string> = {
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  standardDecelerate: "cubic-bezier(0, 0, 0, 1)",
  standardAccelerate: "cubic-bezier(0.3, 0, 1, 1)",
};

/** Durée en secondes pour Framer `transition.duration`. */
export function m3DurationSeconds(token: M3MotionDurationToken): number {
  return M3_MOTION_DURATION_MS[token] / 1000;
}

/** Fade liste (AnimatePresence) — entrée/sortie courtes, easing M3 Standard accelerate. */
export const M3_FRAMER_FADE_PRESENCE = {
  duration: M3_MOTION_DURATION_MS.standardAccelerate / 1000,
  ease: [...M3_MOTION_EASE.standardAccelerate] as [number, number, number, number],
} as const;
