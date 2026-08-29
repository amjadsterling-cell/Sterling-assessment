export type WhisperWord = { word: string; start: number; end: number };

/**
 * Normalised Pairwise Variability Index over word durations. Low nPVI = flat,
 * syllable-timed delivery (often mother-tongue influence for many Indian
 * language backgrounds); high nPVI = stress-timed, closer to native English
 * rhythm. The band mapping below is a starting point ONLY — the build spec
 * calls for calibrating these bands on ~20 real recordings before trusting
 * scores in production (see README "Calibration").
 */
export function computeNPVI(words: WhisperWord[]): number {
  const durations = words
    .map((w) => w.end - w.start)
    .filter((d) => d > 0.02); // drop zero/negative-length artifacts

  if (durations.length < 2) return 0;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < durations.length - 1; i++) {
    const d1 = durations[i];
    const d2 = durations[i + 1];
    const denom = (d1 + d2) / 2;
    if (denom > 0) {
      sum += Math.abs(d1 - d2) / denom;
      count++;
    }
  }
  if (count === 0) return 0;
  return (100 * sum) / count;
}

export function npviToScore(npvi: number): number {
  // Uncalibrated starting bands, per build spec Part 6.
  if (npvi < 40) return 25;
  if (npvi < 55) return 50;
  if (npvi < 70) return 75;
  return 90;
}
