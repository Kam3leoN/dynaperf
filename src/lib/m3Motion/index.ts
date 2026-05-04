/**
 * Motion Material Design 3 Expressive — point d’entrée unique.
 * @see https://m3.material.io/styles/motion/overview
 *
 * Inclut : durées & easing (tokens), physique ressorts Spatial/Effects,
 * recettes de transitions (patterns), réduction de mouvement.
 */

export {
  M3_MOTION_DURATION_MS,
  M3_MOTION_EASE,
  M3_MOTION_EASE_CSS,
  M3_FRAMER_FADE_PRESENCE,
  m3DurationSeconds,
  type M3MotionDurationToken,
  type M3MotionEaseToken,
} from "./easing-duration";

export { M3_PHYSICS_PAIRS, m3FramerSpring, type M3PhysicsFamily, type M3PhysicsSpeed } from "./physics";

export { prefersReducedMotion, m3ResolveDurationMs } from "./reduced-motion";

export {
  m3TransitionTwClasses,
  m3FramerTransition,
  m3FramerTweenFromRecipe,
  type M3TransitionPattern,
} from "./transitions";
