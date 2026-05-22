// Vertex AI Imagen wrapper — used by the chat `generate_image` tool.
// Calls the Imagen `:predict` endpoint with the same service-account JWT
// flow as the Gemini text path (see llm-fallback.ts:mintGcpAccessToken).
// Output is uploaded to Supabase Storage so the chat can return a signed
// URL without keeping a large base64 blob in the message thread.

import { mintGcpAccessToken } from "./llm-fallback";

interface ImagenResponse {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
  }>;
  error?: { message?: string };
}

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  /** Imagen model. Default = imagen-4.0-generate-preview-06-06 (production-quality on solid-heaven). */
  model?: string;
}

export interface GenerateImageResult {
  ok: true;
  data: {
    /** Base64 PNG/JPEG. Caller decides whether to upload or return inline. */
    base64: string;
    mimeType: string;
    elapsedMs: number;
    model: string;
  };
}

export interface GenerateImageError {
  ok: false;
  error: string;
}

const DEFAULT_MODEL = "imagen-4.0-generate-preview-06-06";

export async function generateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult | GenerateImageError> {
  const prompt = input.prompt?.trim();
  if (!prompt) return { ok: false, error: "prompt required" };

  const saB64 = process.env.GCP_SA_JSON_B64;
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "us-central1";
  if (!saB64 || !project) {
    return {
      ok: false,
      error:
        "image generation not configured (set GCP_SA_JSON_B64 + GCP_PROJECT_ID)",
    };
  }

  let credentials: { client_email: string; private_key: string };
  try {
    const raw = Buffer.from(saB64, "base64").toString("utf-8");
    credentials = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: `bad GCP_SA_JSON_B64: ${(e as Error).message}`,
    };
  }

  const t0 = Date.now();
  let accessToken: string;
  try {
    accessToken = await mintGcpAccessToken(credentials);
  } catch (e) {
    return { ok: false, error: `gcp-token: ${(e as Error).message}` };
  }

  const model = input.model ?? DEFAULT_MODEL;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: input.aspectRatio ?? "16:9",
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return { ok: false, error: `network: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      error: `imagen ${res.status}: ${t.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as ImagenResponse;
  if (data.error?.message)
    return { ok: false, error: `imagen: ${data.error.message}` };

  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) {
    return { ok: false, error: "imagen: empty response" };
  }

  return {
    ok: true,
    data: {
      base64: pred.bytesBase64Encoded,
      mimeType: pred.mimeType ?? "image/png",
      elapsedMs: Date.now() - t0,
      model,
    },
  };
}
