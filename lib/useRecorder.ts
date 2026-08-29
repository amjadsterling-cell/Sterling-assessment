"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopped" | "error";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkMic = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err: any) {
      setError(err.message ?? "Microphone permission denied");
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(finalBlob);
        setState("stopped");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err: any) {
      setError(err.message ?? "Could not start recording");
      setState("error");
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setBlob(null);
    setElapsed(0);
  }, []);

  return { state, error, blob, elapsed, checkMic, start, stop, reset };
}
