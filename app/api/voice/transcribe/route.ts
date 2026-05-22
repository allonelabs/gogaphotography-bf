// Voice mode STT — Groq Whisper large-v3-turbo. Server-side fallback when the
// browser's SpeechRecognition is unavailable or returns nothing usable.

import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "STT not configured" }, { status: 500 });
  }
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const lang =
      (formData.get("lang") as string | null)?.trim().toLowerCase() || "";

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file required" },
        { status: 400 },
      );
    }

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.webm");
    whisperForm.append("model", "whisper-large-v3-turbo");
    if (lang) whisperForm.append("language", lang);
    whisperForm.append("response_format", "json");
    whisperForm.append("temperature", "0");

    const sttRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: whisperForm,
      },
    );

    if (!sttRes.ok) {
      const err = await sttRes.text();
      console.error("[voice/transcribe] whisper error:", err);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 },
      );
    }

    const sttData = await sttRes.json();
    const text: string = (sttData.text || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "No speech detected" },
        { status: 400 },
      );
    }

    // Whisper sometimes hallucinates on silence — guard against the obvious
    // pathological outputs: long runs without spaces, repeated characters.
    const words = text.split(/\s+/);
    const avgWordLen =
      text.replace(/\s/g, "").length / Math.max(words.length, 1);
    const hasRepeats = /(.)\1{4,}/.test(text);
    if (hasRepeats || (text.length > 15 && avgWordLen > 30)) {
      return NextResponse.json(
        { error: "No speech detected" },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[voice/transcribe]", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
