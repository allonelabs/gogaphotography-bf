// Voice mode — Gemini Live API session config.
//
// Returns the API key the browser uses to open a direct WebSocket to
// generativelanguage.googleapis.com. The key is server-side `GEMINI_API_KEY`
// (already in Vercel env). For production lock the key down by referer in
// GCP Console → APIs & Services → Credentials → restrict to bf.allonelabs.com.
//
// This endpoint exists so we can later swap to short-lived auth_tokens
// (Google's ephemeral-token pattern) without re-shipping client code.

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) {
    return NextResponse.json(
      { error: "Live voice not configured" },
      { status: 500 },
    );
  }
  return NextResponse.json(
    {
      apiKey: key,
      // GA model name. The original `gemini-2.0-flash-exp` was the preview
      // alias and most accounts now only accept this canonical name on the
      // Live API endpoint — using the old preview name returns a 1007/1011
      // close almost immediately.
      model: "models/gemini-2.0-flash-live-001",
      voice: "Aoede",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
