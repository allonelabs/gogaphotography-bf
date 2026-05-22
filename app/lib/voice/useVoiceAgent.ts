"use client";

// Voice mode hook — ported from allone.ge presentation chat.
//
// Two surfaces it powers:
//  1. Quick voice-to-text in the chat input (push-to-talk style).
//  2. Full voice-conversation mode: listen → transcribe → send → speak → auto-listen
//     while `dialogueActive` stays true.
//
// STT strategy: browser SpeechRecognition for live interim text; if it produces
// nothing usable (Safari, locked permissions, unsupported lang), the captured
// MediaRecorder blob is POSTed to /api/voice/transcribe (Groq Whisper).
// TTS strategy: /api/voice/tts (Gemini 2.5 Flash preview TTS, audio/wav).

import { useCallback, useEffect, useRef, useState } from "react";

export type AgentState = "idle" | "listening" | "processing" | "speaking";

interface UseVoiceAgentOptions {
  /** Browser SpeechRecognition language tag, e.g. "en-US". Default: browser default. */
  lang?: string;
  /** Whisper fallback language hint (ISO-639-1 like "en"). */
  whisperLang?: string;
  /** Called whenever a final transcript lands (push-to-talk fallback). */
  onTranscript?: (text: string) => void | Promise<string | null>;
  /**
   * Dialogue-mode handler — when set AND dialogue is active, the hook routes
   * the user transcript here, awaits the assistant reply, and speaks it.
   * This is the allone.ge pattern: hook owns the conversation loop end to
   * end so timing bugs around React state batching go away.
   */
  chatHandler?: (text: string) => Promise<string | null>;
  /** Fires with the user's transcribed turn just before chatHandler runs. */
  onUserTurn?: (text: string) => void;
  /** Fires with the assistant's reply just before TTS plays. */
  onAssistantTurn?: (text: string) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const [state, setState] = useState<AgentState>("idle");
  const [transcript, setTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dialogueActive, setDialogueActive] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const srTranscriptRef = useRef("");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const dialogueActiveRef = useRef(false);
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    return () => {
      cleanupMic();
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupMic = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const scheduleAutoListen = useCallback(() => {
    if (!dialogueActiveRef.current) return;
    if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    autoListenTimerRef.current = setTimeout(() => {
      if (dialogueActiveRef.current) startListeningRef.current();
    }, 300);
  }, []);

  const speakText = useCallback(async (text: string): Promise<boolean> => {
    setState("speaking");
    const clean = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_#`]/g, "")
      .trim();
    if (!clean) {
      setState("idle");
      return false;
    }

    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return false;
      const audioBuffer = await res.arrayBuffer();
      if (audioBuffer.byteLength < 100) return false;
      const blob = new Blob([audioBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      return new Promise<boolean>((resolve) => {
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          resolve(true);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          resolve(false);
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    dialogueActiveRef.current = false;
    setDialogueActive(false);
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    setState("idle");
  }, []);

  // Hand the captured audio blob to /api/voice/transcribe, then push the
  // result through onTranscript. Returns assistant reply if the caller resolved.
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setState("processing");
      setTranscript((t) => t || "…");
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        if (optionsRef.current.whisperLang) {
          formData.append("lang", optionsRef.current.whisperLang);
        }
        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          setError("Could not transcribe — try again");
          setState("idle");
          return;
        }
        const data = await res.json();
        const text = (data.text || "").trim();
        if (!text) {
          if (dialogueActiveRef.current) scheduleAutoListen();
          else setState("idle");
          return;
        }
        setTranscript(text);
        const opts = optionsRef.current;
        let reply: string | null = null;
        if (dialogueActiveRef.current && opts.chatHandler) {
          opts.onUserTurn?.(text);
          reply = (await opts.chatHandler(text)) ?? null;
          if (reply) opts.onAssistantTurn?.(reply);
        } else {
          const r = await opts.onTranscript?.(text);
          reply = typeof r === "string" ? r : null;
        }
        if (typeof reply === "string" && reply.trim()) {
          const spoke = await speakText(reply);
          if (spoke && dialogueActiveRef.current) scheduleAutoListen();
          else setState("idle");
        } else {
          setState("idle");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice error");
        setState("idle");
      }
    },
    [scheduleAutoListen, speakText],
  );

  // Handle a transcript that landed via browser SpeechRecognition (preferred
  // path — no server round-trip for the STT step).
  const processSrTranscript = useCallback(
    async (text: string) => {
      setState("processing");
      setTranscript(text);
      try {
        const opts = optionsRef.current;
        let reply: string | null = null;

        // Dialogue mode + chatHandler: hook owns the conversation. Fires
        // onUserTurn so the parent can show the user message immediately,
        // then awaits the assistant reply.
        if (dialogueActiveRef.current && opts.chatHandler) {
          opts.onUserTurn?.(text);
          reply = (await opts.chatHandler(text)) ?? null;
          if (reply) opts.onAssistantTurn?.(reply);
        } else {
          // Push-to-talk fallback (mic button outside dialogue mode).
          const r = await opts.onTranscript?.(text);
          reply = typeof r === "string" ? r : null;
        }

        if (typeof reply === "string" && reply.trim()) {
          const spoke = await speakText(reply);
          if (spoke && dialogueActiveRef.current) scheduleAutoListen();
          else setState("idle");
        } else {
          setState("idle");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice error");
        setState("idle");
      }
    },
    [scheduleAutoListen, speakText],
  );

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");
      srTranscriptRef.current = "";
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArr = new Uint8Array(analyserRef.current.frequencyBinCount);
      let silenceStart = 0;
      let hasSpoken = false;
      const SILENCE_THRESHOLD = 0.04;
      const SILENCE_DURATION = 1500;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length / 255;
        setAudioLevel(avg);

        if (avg >= SILENCE_THRESHOLD) {
          hasSpoken = true;
          silenceStart = 0;
        } else if (hasSpoken) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION) {
            if (
              recorderRef.current &&
              recorderRef.current.state === "recording"
            ) {
              recorderRef.current.stop();
            }
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        cleanupMic();

        const srText = srTranscriptRef.current.trim();
        if (srText.length > 1) {
          processSrTranscript(srText);
        } else if (blob.size > 4000) {
          processAudio(blob);
        } else if (dialogueActiveRef.current) {
          scheduleAutoListen();
        } else {
          setState("idle");
        }
      };

      recorder.start(250);
      updateLevel();

      // Native SpeechRecognition — primary STT when available
      try {
        const SR =
          (window as typeof window).SpeechRecognition ||
          (window as typeof window).webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR();
          recognition.continuous = true;
          recognition.interimResults = true;
          if (optionsRef.current.lang)
            recognition.lang = optionsRef.current.lang;
          recognitionRef.current = recognition;

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalText = "";
            let interimText = "";
            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i]!;
              if (result.isFinal) finalText += result[0]!.transcript;
              else interimText += result[0]!.transcript;
            }
            const display = finalText + interimText;
            if (display) setTranscript(display);
            srTranscriptRef.current = finalText || interimText;
          };
          recognition.onerror = () => {};
          recognition.onend = () => {
            recognitionRef.current = null;
          };
          recognition.start();
        }
      } catch {
        // SR unavailable — Whisper fallback path will catch it
      }

      setState("listening");
    } catch {
      setError("Microphone access denied");
      setState("idle");
    }
  }, [cleanupMic, processAudio, processSrTranscript, scheduleAutoListen]);
  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    dialogueActiveRef.current = false;
    setDialogueActive(false);
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    } else {
      cleanupMic();
      setState("idle");
    }
  }, [cleanupMic]);

  const startConversation = useCallback(async () => {
    dialogueActiveRef.current = true;
    setDialogueActive(true);
    await startListening();
  }, [startListening]);

  const endConversation = useCallback(() => {
    dialogueActiveRef.current = false;
    setDialogueActive(false);
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    } else {
      cleanupMic();
    }
    setState("idle");
  }, [cleanupMic]);

  return {
    state,
    transcript,
    audioLevel,
    error,
    dialogueActive,
    startListening,
    stopListening,
    startConversation,
    endConversation,
    speakText,
    stopSpeaking,
  };
}
