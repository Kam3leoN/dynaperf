import confetti from "canvas-confetti";

/** Couleurs alignées sur le thème (bleu primaire + accents festifs). */
const PALETTE = ["#2563eb", "#3b82f6", "#60a5fa", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24"];

/**
 * Lance des confettis après la finalisation d’un audit (canvas-confetti).
 * @see https://www.kirilv.com/canvas-confetti/
 */
export function fireAuditCompletionConfetti(): void {
  const run = (opts: confetti.Options) => {
    void confetti({ ...opts, colors: PALETTE, disableForReducedMotion: true });
  };

  run({
    particleCount: 95,
    spread: 72,
    startVelocity: 48,
    origin: { y: 0.62 },
    ticks: 320,
  });

  window.setTimeout(() => {
    run({
      particleCount: 55,
      spread: 100,
      origin: { y: 0.58 },
      scalar: 0.95,
      ticks: 280,
    });
  }, 180);

  window.setTimeout(() => {
    void confetti({
      particleCount: 35,
      angle: 125,
      spread: 78,
      origin: { x: 0, y: 0.68 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 35,
      angle: 55,
      spread: 78,
      origin: { x: 1, y: 0.68 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
  }, 380);
}
