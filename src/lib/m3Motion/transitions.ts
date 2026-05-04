/**
 * Recettes de transitions M3 (patterns) — combinaison durée + easing + famille physique.
 * @see https://m3.material.io/styles/motion/overview
 */

import type { Transition } from "framer-motion";
import {
  M3_MOTION_EASE,
  m3DurationSeconds,
  type M3MotionDurationToken,
  type M3MotionEaseToken,
} from "./easing-duration";
import { m3FramerSpring, type M3PhysicsFamily, type M3PhysicsSpeed } from "./physics";
import { m3ResolveDurationMs } from "./reduced-motion";

export type M3TransitionPattern =
  | "containerTransform"
  | "forwardBackward"
  | "lateral"
  | "topLevel"
  | "enterExit"
  | "skeleton";

type Direction = "enter" | "exit";

interface M3TransitionRecipe {
  durationToken: M3MotionDurationToken;
  easeToken: M3MotionEaseToken;
  /** Ressort optionnel pour mouvement spatial */
  spring?: { family: M3PhysicsFamily; speed: M3PhysicsSpeed };
}

/** Mapping pattern → presets par défaut (entrée / sortie). */
const RECIPES: Record<
  M3TransitionPattern,
  { enter: M3TransitionRecipe; exit: M3TransitionRecipe }
> = {
  containerTransform: {
    enter: {
      durationToken: "emphasized",
      easeToken: "emphasizedDecelerate",
      spring: { family: "spatial", speed: "default" },
    },
    exit: {
      durationToken: "emphasized",
      easeToken: "emphasizedAccelerate",
      spring: { family: "spatial", speed: "default" },
    },
  },
  forwardBackward: {
    enter: {
      durationToken: "standardDecelerate",
      easeToken: "standardDecelerate",
      spring: { family: "spatial", speed: "default" },
    },
    exit: {
      durationToken: "standardAccelerate",
      easeToken: "standardAccelerate",
      spring: { family: "spatial", speed: "slow" },
    },
  },
  lateral: {
    enter: {
      durationToken: "standard",
      easeToken: "standardDecelerate",
      spring: { family: "spatial", speed: "fast" },
    },
    exit: {
      durationToken: "standard",
      easeToken: "standardAccelerate",
      spring: { family: "spatial", speed: "fast" },
    },
  },
  topLevel: {
    enter: {
      durationToken: "emphasized",
      easeToken: "emphasizedDecelerate",
      spring: { family: "spatial", speed: "default" },
    },
    exit: {
      durationToken: "emphasizedAccelerate",
      easeToken: "emphasizedAccelerate",
      spring: { family: "spatial", speed: "default" },
    },
  },
  enterExit: {
    enter: {
      durationToken: "standardDecelerate",
      easeToken: "standardDecelerate",
      spring: { family: "effects", speed: "default" },
    },
    exit: {
      durationToken: "standardAccelerate",
      easeToken: "standardAccelerate",
      spring: { family: "effects", speed: "default" },
    },
  },
  skeleton: {
    enter: {
      durationToken: "emphasized",
      easeToken: "standard",
      spring: { family: "effects", speed: "slow" },
    },
    exit: {
      durationToken: "standard",
      easeToken: "standard",
      spring: { family: "effects", speed: "slow" },
    },
  },
};

function recipeFor(pattern: M3TransitionPattern, direction: Direction): M3TransitionRecipe {
  return RECIPES[pattern][direction];
}

/** Classes Tailwind (durée + easing) — noms theme extend `duration-m3-*` `ease-m3-*`. */
export function m3TransitionTwClasses(pattern: M3TransitionPattern, direction: Direction): string {
  const r = recipeFor(pattern, direction);
  const dur = twDurationClass(r.durationToken);
  const ease = twEaseClass(r.easeToken);
  return `${dur} ${ease}`.trim();
}

function twDurationClass(token: M3MotionDurationToken): string {
  const map: Record<M3MotionDurationToken, string> = {
    emphasized: "duration-m3-emphasized",
    emphasizedDecelerate: "duration-m3-emphasized-decelerate",
    emphasizedAccelerate: "duration-m3-emphasized-accelerate",
    standard: "duration-m3-standard",
    standardDecelerate: "duration-m3-standard-decelerate",
    standardAccelerate: "duration-m3-standard-accelerate",
  };
  return map[token];
}

function twEaseClass(token: M3MotionEaseToken): string {
  const map: Record<M3MotionEaseToken, string> = {
    emphasized: "ease-m3-emphasized",
    emphasizedDecelerate: "ease-m3-emphasized-decelerate",
    emphasizedAccelerate: "ease-m3-emphasized-accelerate",
    standard: "ease-m3-standard",
    standardDecelerate: "ease-m3-standard-decelerate",
    standardAccelerate: "ease-m3-standard-accelerate",
  };
  return map[token];
}

/** Transition Framer : tween avec ease cubic, ou spring si la recette privilégie le mouvement spatial explicite. */
export function m3FramerTransition(
  pattern: M3TransitionPattern,
  direction: Direction,
  opts?: { useSpring?: boolean; reducedMotion?: boolean },
): Transition {
  const r = recipeFor(pattern, direction);
  const reduced = opts?.reducedMotion ?? false;
  const ms = m3ResolveDurationMs(r.durationToken, reduced);

  if (opts?.useSpring && r.spring) {
    return m3FramerSpring(r.spring.family, r.spring.speed);
  }

  return {
    duration: ms / 1000,
    ease: [...M3_MOTION_EASE[r.easeToken]] as [number, number, number, number],
  };
}

/** Objet transition Framer utilisant les durées nommées (secondes) + ease. */
export function m3FramerTweenFromRecipe(pattern: M3TransitionPattern, direction: Direction): Transition {
  const r = recipeFor(pattern, direction);
  return {
    duration: m3DurationSeconds(r.durationToken),
    ease: [...M3_MOTION_EASE[r.easeToken]] as [number, number, number, number],
  };
}

export { M3_MOTION_EASE };
