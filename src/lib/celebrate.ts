/**
 * Celebraciones con canvas-confetti (licencia ISC, Task 33).
 * Import dinámico: el chunk de confetti solo se descarga al celebrar por
 * primera vez, sin costo para el bundle inicial.
 */

const BRAND_COLORS = ["#3DDC97", "#E6EFEA", "#94A7A5"];

/** Ráfaga corta al lograr un PR (respeta prefers-reduced-motion vía lib). */
export async function celebratePR(): Promise<void> {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 38,
      origin: { y: 0.72 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
      zIndex: 200,
    });
  } catch {
    /* la celebración nunca debe romper el registro de la serie */
  }
}
