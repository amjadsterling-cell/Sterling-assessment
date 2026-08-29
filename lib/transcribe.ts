import type { WhisperWord } from "./scoring/npvi";

export type TranscriptionResult = {
  text: string;
  words: WhisperWord[];
};

/**
 * Transcribes an audio buffer with Groq's hosted Whisper large-v3, requesting
 * word-level timestamps. Deliberately does NOT pass the expected passage text
 * as a prompt — biasing the transcription toward the expected words would
 * defeat the intelligibility score, which relies on Whisper failing exactly
 * where a human listener would.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq transcription failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const words: WhisperWord[] = (data.words ?? []).map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end
  }));

  return { text: data.text ?? "", words };
}
