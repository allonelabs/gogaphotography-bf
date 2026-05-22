"use client";

// Gemini Live API voice hook — true bidirectional streaming voice mode.
//
// Browser → WebSocket → Gemini 2.0 Flash (multimodal Live model). Mic audio is
// streamed as 16kHz PCM chunks; the model streams back 24kHz PCM audio chunks
// of Aoede speaking. Latency ≈ 500ms end-to-end (vs ~5-9s for our old STT →
// chat → TTS pipeline).
//
// Both sides get transcribed by the server (input_audio_transcription +
// output_audio_transcription) so the caller can surface user/assistant text
// in the chat UI as conversation progresses.
//
// API key is fetched from /api/voice/live-config and used directly in the WS
// URL. Restrict the key by HTTP referer in GCP Console for production safety.

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveState = "idle" | "connecting" | "listening" | "speaking";

interface UseGeminiLiveOptions {
  /** System instruction so the model knows it's AllOnce / the operator's assistant. */
  systemPrompt?: string;
  /** Optional chat-history priming (sent on session start so the model has context). */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Called with final user transcript when a user turn ends. */
  onUserText?: (text: string) => void;
  /** Called with partial assistant text as it streams (cumulative). */
  onAssistantTextDelta?: (delta: string) => void;
  /** Called with final assistant text when the model finishes a turn. */
  onAssistantTurnComplete?: (fullText: string) => void;
  /** Called on fatal error (UI should drop out of live mode). */
  onError?: (msg: string) => void;
}

// Float32 [-1,1] → little-endian Int16 PCM bytes
function floatToPcm16(input: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(input.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]!));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, s, true);
  }
  return buf;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(bin);
}

function base64ToPcm16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i]! / 0x8000;
  return out;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [state, setState] = useState<LiveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackHeadRef = useRef<number>(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const pendingAssistantTextRef = useRef<string>("");

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    pendingAssistantTextRef.current = "";

    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch {}
      micProcessorRef.current = null;
    }
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {}
      micSourceRef.current = null;
    }
    if (micCtxRef.current) {
      micCtxRef.current.close().catch(() => {});
      micCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;

    if (playbackCtxRef.current) {
      for (const src of playingSourcesRef.current) {
        try {
          src.stop();
        } catch {}
      }
      playingSourcesRef.current.clear();
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    playbackHeadRef.current = 0;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const playPcmChunk = useCallback((b64: string, sampleRate: number) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    const int16 = base64ToPcm16(b64);
    const float = pcm16ToFloat(int16);
    const buf = ctx.createBuffer(1, float.length, sampleRate);
    buf.getChannelData(0).set(float);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const startAt = Math.max(playbackHeadRef.current, ctx.currentTime);
    src.start(startAt);
    playbackHeadRef.current = startAt + buf.duration;
    playingSourcesRef.current.add(src);
    src.onended = () => {
      playingSourcesRef.current.delete(src);
      if (playingSourcesRef.current.size === 0) {
        setState((s) => (s === "speaking" ? "listening" : s));
      }
    };
    setState("speaking");
  }, []);

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      // Setup complete — ready to stream audio
      if ("setupComplete" in msg) {
        setState("listening");
        return;
      }
      const serverContent = (msg as { serverContent?: Record<string, unknown> })
        .serverContent;
      if (!serverContent) return;

      // Model audio output
      const modelTurn = serverContent["modelTurn"] as
        | { parts?: Array<Record<string, unknown>> }
        | undefined;
      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          const inlineData = part["inlineData"] as
            | { mimeType?: string; data?: string }
            | undefined;
          if (
            inlineData?.data &&
            inlineData.mimeType?.startsWith("audio/pcm")
          ) {
            const rateMatch = inlineData.mimeType.match(/rate=(\d+)/);
            const rate = rateMatch ? Number(rateMatch[1]) : 24000;
            playPcmChunk(inlineData.data, rate);
          }
        }
      }

      // Input (user) transcription
      const inputTr = serverContent["inputTranscription"] as
        | { text?: string }
        | undefined;
      if (inputTr?.text) {
        optionsRef.current.onUserText?.(inputTr.text);
      }

      // Output (assistant) transcription — accumulate then fire on turn complete
      const outputTr = serverContent["outputTranscription"] as
        | { text?: string }
        | undefined;
      if (outputTr?.text) {
        pendingAssistantTextRef.current += outputTr.text;
        optionsRef.current.onAssistantTextDelta?.(outputTr.text);
      }

      if (serverContent["turnComplete"]) {
        const full = pendingAssistantTextRef.current.trim();
        pendingAssistantTextRef.current = "";
        if (full) optionsRef.current.onAssistantTurnComplete?.(full);
      }
    },
    [playPcmChunk],
  );

  const start = useCallback(async () => {
    if (state !== "idle" && state !== "speaking" && state !== "listening") {
      // Already connecting
      return;
    }
    setError(null);
    setState("connecting");

    let cfg: { apiKey?: string; model?: string; voice?: string };
    try {
      const res = await fetch("/api/voice/live-config");
      if (!res.ok) throw new Error(`config ${res.status}`);
      cfg = await res.json();
      if (!cfg.apiKey) throw new Error("no api key");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "config failed";
      setError(msg);
      optionsRef.current.onError?.(msg);
      setState("idle");
      return;
    }

    // Open mic + audio contexts BEFORE WS so the user-gesture origin (button
    // click) is still valid for AudioContext on Safari.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      const msg = "Microphone access denied";
      setError(msg);
      optionsRef.current.onError?.(msg);
      setState("idle");
      return;
    }
    micStreamRef.current = stream;

    // Don't try to force 16kHz on AudioContext — Chrome ignores the hint on
    // mic input and you'll get whatever rate the device runs at (typically
    // 48kHz). We'll downsample to 16kHz in software before sending.
    const micCtx = new AudioContext();
    micCtxRef.current = micCtx;
    const source = micCtx.createMediaStreamSource(stream);
    micSourceRef.current = source;
    console.log(
      "[live] mic context sampleRate =",
      micCtx.sampleRate,
      "→ downsampling to 16000",
    );

    const analyser = micCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArr = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArr);
      const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length / 255;
      setAudioLevel(avg);
      animFrameRef.current = requestAnimationFrame(updateLevel);
    };
    updateLevel();

    // 24kHz playback context (matches Gemini's output rate)
    playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    playbackHeadRef.current = playbackCtxRef.current.currentTime;

    // Open WS — v1alpha is where BidiGenerateContent lives for the public
    // Live API (gemini-2.0-flash-exp). v1beta returned 404 in practice.
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(cfg.apiKey)}`;
    console.log("[live] opening WS to", url.replace(/key=[^&]+/, "key=***"));
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[live] WS open, sending setup");
      // Send setup frame
      const setupMsg = {
        setup: {
          model: cfg.model || "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: cfg.voice || "Aoede" },
              },
            },
          },
          systemInstruction: optionsRef.current.systemPrompt
            ? { parts: [{ text: optionsRef.current.systemPrompt }] }
            : undefined,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };
      ws.send(JSON.stringify(setupMsg));

      // Prime conversation history so the model has context
      const hist = optionsRef.current.history ?? [];
      if (hist.length > 0) {
        const turns = hist.map((t) => ({
          role: t.role === "assistant" ? "model" : "user",
          parts: [{ text: t.content }],
        }));
        ws.send(
          JSON.stringify({ clientContent: { turns, turnComplete: true } }),
        );
      }

      // Start streaming mic audio. Downsample whatever the device gave us
      // (commonly 48000) to 16000 Hz before sending — Gemini expects 16k.
      const SOURCE_RATE = micCtx.sampleRate;
      const TARGET_RATE = 16000;
      const ratio = SOURCE_RATE / TARGET_RATE;
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Linear-interpolation downsample (fine for speech band)
        const outLen = Math.floor(inputData.length / ratio);
        const out = new Float32Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const pos = i * ratio;
          const a = Math.floor(pos);
          const b = Math.min(a + 1, inputData.length - 1);
          const frac = pos - a;
          out[i] = inputData[a]! * (1 - frac) + inputData[b]! * frac;
        }
        const pcm = floatToPcm16(out);
        const b64 = arrayBufferToBase64(pcm);
        ws.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }],
            },
          }),
        );
      };
      source.connect(processor);
      // Connect to destination is required for onaudioprocess to fire in some
      // browsers, but we don't want to hear the mic loop. Gain=0 silences it.
      const silentGain = micCtx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(micCtx.destination);
    };

    ws.onmessage = (e) => {
      // The server may send Blob (binary) or string frames
      if (typeof e.data === "string") {
        handleMessage(e.data);
      } else if (e.data instanceof Blob) {
        e.data
          .text()
          .then(handleMessage)
          .catch(() => {});
      }
    };

    ws.onerror = (ev) => {
      console.error("[live] WS error", ev);
      const msg = "Voice connection error";
      setError(msg);
      optionsRef.current.onError?.(msg);
      cleanup();
      setState("idle");
    };
    ws.onclose = (ev) => {
      console.warn(
        "[live] WS closed — code:",
        ev.code,
        "reason:",
        ev.reason,
        "wasClean:",
        ev.wasClean,
      );
      // Surface every unclean close to the UI so we stop debugging blind.
      // Close codes that matter: 1006 = abnormal (network/auth), 1007 =
      // invalid payload, 1008 = policy violation, 1011 = server error.
      if (!ev.wasClean) {
        const msg = ev.reason
          ? `Voice closed (${ev.code}): ${ev.reason}`
          : `Voice closed unexpectedly (code ${ev.code}). The model name or API key may be rejected.`;
        setError(msg);
        optionsRef.current.onError?.(msg);
      }
      setState((s) => (s === "idle" ? s : "idle"));
    };
  }, [cleanup, handleMessage, state]);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  return {
    state,
    error,
    audioLevel,
    start,
    stop,
    active:
      state === "connecting" || state === "listening" || state === "speaking",
  };
}
