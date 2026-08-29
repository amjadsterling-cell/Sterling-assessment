import type { Passage } from "../content-types";

function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9']/g, "")
    .trim();
}

// Classic Levenshtein edit distance between two token arrays.
function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export type IntelligibilityResult = {
  score: number;
  editDistance: number;
  expectedWordCount: number;
  missedTargetWords: string[];
};

/**
 * Compares the Whisper transcript of the read-aloud passage against the
 * expected passage text. Whisper is never given the expected text up front
 * (that would bias the transcription) — this diff happens after the fact.
 * A miss on an engineered target word (a likely pronunciation trap) counts
 * double, per the build spec.
 */
export function scoreIntelligibility(
  transcript: string,
  passage: Passage
): IntelligibilityResult {
  const expected = passage.text.split(/\s+/).map(normalize).filter(Boolean);
  const actual = transcript.split(/\s+/).map(normalize).filter(Boolean);

  const editDistance = levenshtein(expected, actual);
  const actualSet = new Set(actual);

  const missedTargetWords = passage.targetWords
    .map((t) => normalize(t.word))
    .filter((w) => !actualSet.has(w));

  // Base penalty from edit distance, plus an extra hit per missed target word.
  const basePenalty = (editDistance / Math.max(expected.length, 1)) * 100;
  const targetPenalty = missedTargetWords.length * (100 / Math.max(expected.length, 1));

  const score = Math.max(0, Math.round(100 - basePenalty - targetPenalty));

  return {
    score,
    editDistance,
    expectedWordCount: expected.length,
    missedTargetWords
  };
}
