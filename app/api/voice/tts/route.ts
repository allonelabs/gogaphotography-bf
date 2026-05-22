// Voice mode TTS — Gemini 2.5 Flash preview TTS.
// Returns audio/wav. Lifted from allone.ge presentation chat (Aoede voice).

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const VOICE_NAME = "Aoede";

function createWavHeader(
  dataSize: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return header;
}

async function tryTTS(apiKey: string, ttsBody: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15000),
          body: ttsBody,
        },
      );
      if (response.ok) {
        const data = await response.json();
        const audioBase64 =
          data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioBase64) return null;
        const pcmBuffer = Buffer.from(audioBase64, "base64");
        const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
        return Buffer.concat([wavHeader, pcmBuffer]);
      }
      if (response.status === 429 || response.status === 403) return null;
      if (response.status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return null;
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (GEMINI_API_KEYS.length === 0) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
  }
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_#`]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 800);

    if (!cleanText) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }

    const ttsBody = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Read the following aloud in a warm, friendly, confident tone:\n${cleanText}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE_NAME },
          },
        },
      },
    });

    for (const key of GEMINI_API_KEYS) {
      const wavBuffer = await tryTTS(key, ttsBody);
      if (wavBuffer) {
        return new NextResponse(new Uint8Array(wavBuffer), {
          headers: {
            "Content-Type": "audio/wav",
            "Content-Length": wavBuffer.length.toString(),
          },
        });
      }
    }
    return NextResponse.json(
      { error: "TTS generation failed" },
      { status: 502 },
    );
  } catch (err) {
    console.error("[voice/tts]", err);
    return NextResponse.json(
      { error: "TTS generation failed" },
      { status: 500 },
    );
  }
}
