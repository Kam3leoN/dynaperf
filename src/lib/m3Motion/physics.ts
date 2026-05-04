/**
 * Motion physics Expressive — Spatial vs Effects (Fast / Default / Slow).
 * Paires documentées (damping ratio, stiffness). Conversion vers Framer Motion :
 * damping = 2 * ζ * √(k·m), m = 1 (masse unitaire).
 * @see https://m3.material.io/styles/motion/overview
 */

export type M3PhysicsFamily = "spatial" | "effects";
export type M3PhysicsSpeed = "fast" | "default" | "slow";

/** Paires (dampingRatio, stiffness) telles que sur la doc M3 Expressive. */
export const M3_PHYSICS_PAIRS: Record<M3PhysicsFamily, Record<M3PhysicsSpeed, { zeta: number; stiffness: number }>> = {
  spatial: {
    fast: { zeta: 0.6, stiffness: 800 },
    default: { zeta: 0.8, stiffness: 380 },
    slow: { zeta: 0.8, stiffness: 200 },
  },
  effects: {
    fast: { zeta: 1, stiffness: 3800 },
    default: { zeta: 1, stiffness: 1600 },
    slow: { zeta: 1, stiffness: 800 },
  },
};

function dampingFromRatio(zeta: number, stiffness: number, mass = 1): number {
  return 2 * zeta * Math.sqrt(stiffness * mass);
}

/** Ressort Framer Motion calibré sur la spec M3 (Spatial / Effects). */
export function m3FramerSpring(
  family: M3PhysicsFamily,
  speed: M3PhysicsSpeed,
  mass = 1,
): { type: "spring"; stiffness: number; damping: number; mass: number } {
  const { zeta, stiffness } = M3_PHYSICS_PAIRS[family][speed];
  return {
    type: "spring",
    stiffness,
    damping: dampingFromRatio(zeta, stiffness, mass),
    mass,
  };
}
