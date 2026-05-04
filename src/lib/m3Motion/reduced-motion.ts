/**
 * Accessibilité — alignement avec @media (prefers-reduced-motion: reduce)
 * et variables CSS --m3-duration-reduced.
 */

import { M3_MOTION_DURATION_MS, type M3MotionDurationToken } from "./easing-duration";

const REDUCED_MS = 1;

/** `true` si l’utilisateur demande moins d’animation (navigateur / hook). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Durée effective (ms) pour un token M3. */
export function m3ResolveDurationMs(token: M3MotionDurationToken, reduced?: boolean): number {
  const r = reduced ?? prefersReducedMotion();
  return r ? REDUCED_MS : M3_MOTION_DURATION_MS[token];
}
