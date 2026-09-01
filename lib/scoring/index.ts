import { scoreIntelligibility } from "./diff";
import { computeNPVI, npviToScore, type WhisperWord } from "./npvi";
import { scoreFluency } from "./fluency";
import type { Passage } from "../content-types";

export type ScoringInput = {
  passageTranscript: string;
  passage: Passage;
  passageWords: WhisperWord[];
  speakingWords1: WhisperWord[];
  speakingWords2: WhisperWord[];
  quizScore: number; // 0-100
  speechGrammarRating: number; // 0-100, from LLM
  vocabularyRating: number; // 0-100, from LLM
};

export type ScoringOutput = {
  intelligibility_score: number;
  rhythm_score: number;
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
  overall_score: number;
  cefr_fallback: string;
  metrics: Record<string, unknown>;
};

export function runScoringEngine(input: ScoringInput): ScoringOutput {
  const intelligibility = scoreIntelligibility(input.passageTranscript, input.passage);

  const npvi = computeNPVI(input.passageWords);
  const rhythm_score = npviToScore(npvi);

  // Two speaking recordings — score each independently (their timestamps
  // aren't on a shared timeline, so they can't simply be concatenated) and
  // average. A recording with zero words (e.g. missing) contributes a 0
  // rather than being silently dropped, so a bad second take still counts.
  const fluency1 = scoreFluency(input.speakingWords1);
  const fluency2 = scoreFluency(input.speakingWords2);
  const fluency_score = Math.round((fluency1.score + fluency2.score) / 2);

  const grammar_score = Math.round(
    input.quizScore * 0.3 + input.speechGrammarRating * 0.7
  );

  const overall_score = Math.round(
    fluency_score * 0.3 +
      input.vocabularyRating * 0.2 +
      intelligibility.score * 0.25 +
      rhythm_score * 0.15 +
      grammar_score * 0.1
  );

  return {
    intelligibility_score: intelligibility.score,
    rhythm_score,
    fluency_score,
    grammar_score,
    vocabulary_score: input.vocabularyRating,
    overall_score,
    cefr_fallback: overallScoreToCEFR(overall_score),
    metrics: {
      speaking1: {
        wpm: fluency1.wpm,
        longPauseCount: fluency1.longPauseCount,
        fillerRate: fluency1.fillerRate,
        durationSeconds: fluency1.durationSeconds
      },
      speaking2: {
        wpm: fluency2.wpm,
        longPauseCount: fluency2.longPauseCount,
        fillerRate: fluency2.fillerRate,
        durationSeconds: fluency2.durationSeconds
      },
      npvi,
      editDistance: intelligibility.editDistance,
      expectedWordCount: intelligibility.expectedWordCount,
      missedTargetWords: intelligibility.missedTargetWords
    }
  };
}

// Deterministic fallback if the LLM doesn't return a usable CEFR level.
export function overallScoreToCEFR(overall: number): string {
  if (overall < 25) return "A1";
  if (overall < 40) return "A2";
  if (overall < 55) return "B1";
  if (overall < 70) return "B2";
  if (overall < 85) return "C1";
  return "C2";
}
