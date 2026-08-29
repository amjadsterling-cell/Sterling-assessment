import type { WhisperWord } from "./npvi";

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "erm",
  "like",
  "actually",
  "basically",
  "you know"
]);

export type FluencyResult = {
  score: number;
  wpm: number;
  longPauseCount: number;
  fillerRate: number;
  durationSeconds: number;
};

/**
 * Blends words-per-minute, long-pause frequency, and filler-word rate from
 * the free-speech transcript's word timestamps into a single 0-100 score.
 * Target band: ~110-160 WPM is treated as the fluent zone for this
 * population; adjust after calibration (see README).
 */
export function scoreFluency(words: WhisperWord[]): FluencyResult {
  if (words.length === 0) {
    return { score: 0, wpm: 0, longPauseCount: 0, fillerRate: 0, durationSeconds: 0 };
  }

  const start = words[0].start;
  const end = words[words.length - 1].end;
  const durationSeconds = Math.max(end - start, 1);
  const wpm = (words.length / durationSeconds) * 60;

  let longPauseCount = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 1.2) longPauseCount++;
  }

  const fillerCount = words.filter((w) =>
    FILLER_WORDS.has(w.word.toLowerCase().replace(/[^a-z]/g, ""))
  ).length;
  const fillerRate = fillerCount / words.length;

  // WPM component: peaks in the 110-160 band, tapers off outside it.
  let wpmScore: number;
  if (wpm < 60) wpmScore = 20;
  else if (wpm < 90) wpmScore = 50;
  else if (wpm <= 160) wpmScore = 95;
  else if (wpm <= 190) wpmScore = 75;
  else wpmScore = 55; // very fast can mean rushed/unclear

  // Pauses per minute of speech.
  const pausesPerMinute = (longPauseCount / durationSeconds) * 60;
  let pauseScore: number;
  if (pausesPerMinute < 2) pauseScore = 95;
  else if (pausesPerMinute < 5) pauseScore = 70;
  else if (pausesPerMinute < 9) pauseScore = 45;
  else pauseScore = 20;

  let fillerScore: number;
  if (fillerRate < 0.02) fillerScore = 95;
  else if (fillerRate < 0.05) fillerScore = 75;
  else if (fillerRate < 0.1) fillerScore = 50;
  else fillerScore = 25;

  const score = Math.round(wpmScore * 0.5 + pauseScore * 0.3 + fillerScore * 0.2);

  return { score, wpm: Math.round(wpm), longPauseCount, fillerRate, durationSeconds };
}
