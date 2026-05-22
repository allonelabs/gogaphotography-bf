// Slim Gemini image client.
//
// Generates one hero image per spawn from a text prompt. Returns the bytes
// + mime type so callers can upload to Supabase Storage. Returns null when
// no auth is available, the prompt is filtered, or the response is empty —
// the renderer treats null as "use the gradient hero fallback" and the
// page still ships.
//
// Auth fallback order (matches llm-fallback.ts):
//   1. Vertex AI — GCP_SA_JSON_B64 + GCP_PROJECT_ID set. Production path
//      for AllOnce — AI Studio billing is depleted per memory.
//   2. AI Studio — GOOGLE_AI_API_KEY set. Local-dev convenience.

import { mintGcpAccessToken } from './llm-fallback';

const AI_STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash-preview-image-generation';
// On Vertex, the 2.0-flash-preview model isn't enabled on solid-heaven
// (per memory: "gemini-2.0-flash returns 404 — not yet on this project").
// The 2.5 family IS available. Try both — first the 2.0 name AI Studio
// expects, then 2.5 as Vertex fallback.
const VERTEX_MODEL_CANDIDATES = [
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.5-flash-image-preview',
];
// Imagen — Vertex's purpose-built image-gen API, uses :predict endpoint
// with a totally different body shape from Gemini's :generateContent.
// Latest stable first, faster generic last.
const IMAGEN_MODEL_CANDIDATES = [
  'imagen-4.0-generate-preview-06-06',
  'imagen-3.0-generate-002',
  'imagen-3.0-fast-generate-001',
];

interface ImagenPrediction {
  bytesBase64Encoded?: string;
  mimeType?: string;
}
interface ImagenResponse {
  predictions?: ImagenPrediction[];
}

interface InlineData {
  data: string;
  mime_type?: string;
  mimeType?: string;
}
interface ResponsePart {
  inline_data?: InlineData;
  inlineData?: InlineData;
  text?: string;
}
interface ResponseCandidate { content?: { parts?: ResponsePart[] } }
interface GeminiResponse {
  candidates?: ResponseCandidate[];
  usageMetadata?: { totalTokenCount?: number };
}

export interface HeroImageRequest {
  prompt: string;
  /** Photographic style hint baked into the prompt header. */
  style?: 'cinematic' | 'editorial' | 'natural-light' | 'high-contrast'
        | 'overhead' | 'environmental' | 'product-isolation' | 'candid'
        | 'photorealistic' | 'illustration' | 'minimal' | 'abstract' | 'product-shot' | 'flat-design';
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface HeroImageResult {
  /** Raw image bytes (decoded from base64). */
  bytes: Buffer;
  mimeType: string;
  /** The full prompt actually sent to Gemini (style + prompt + avoid + aspect). */
  prompt: string;
  /** Gemini's revised prompt, if the model returned one. */
  revisedPrompt?: string;
  tokensUsed: number;
}

function styleHeader(style: HeroImageRequest['style']): string {
  if (!style) return '';
  switch (style) {
    case 'cinematic': return 'Style: cinematic wide shot, anamorphic lens compression, color graded, shallow depth of field, golden-hour or moody lighting. ';
    case 'editorial': return 'Style: editorial fashion-photography aesthetic, hard rim light, magazine-spread quality, restrained composition. ';
    case 'natural-light': return 'Style: documentary photography, soft overcast daylight, real environment, no studio lighting, observational mood. ';
    case 'high-contrast': return 'Style: high-contrast photography, deep blacks, bright highlights, dramatic shadows, bold simple composition. ';
    case 'overhead': return 'Style: overhead flat-lay photograph, top-down camera angle, considered arrangement, even lighting. ';
    case 'environmental': return 'Style: environmental portrait photography, subject in their working space, telling the story of the place. ';
    case 'product-isolation': return 'Style: studio product photography, clean seamless backdrop, soft directional lighting, careful focus. ';
    case 'candid': return 'Style: candid documentary photography, in-the-moment, no posing, slightly imperfect framing, real and warm. ';
    case 'photorealistic': return 'Style: photorealistic photograph. ';
    case 'illustration': return 'Style: editorial illustration, distinctive line work, considered color palette. ';
    case 'minimal': return 'Style: minimal composition, lots of negative space, single subject, quiet. ';
    case 'abstract': return 'Style: abstract composition, color and form over subject, painterly. ';
    case 'product-shot': return 'Style: studio product photograph. ';
    case 'flat-design': return 'Style: flat illustration, simple geometric shapes, bold limited palette, no gradients. ';
    default: return '';
  }
}

/** Generate a single image. Returns null on any failure or when no auth path. */
export async function generateHeroImage(req: HeroImageRequest): Promise<HeroImageResult | null> {
  const style = styleHeader(req.style);
  const avoid = req.negativePrompt ? ` Avoid: ${req.negativePrompt}.` : '';
  const aspect = req.aspectRatio ? ` Aspect ratio: ${req.aspectRatio}.` : ' Aspect ratio: 16:9.';
  const noText = ' No text, no watermarks, no logos, no captions.';
  const fullPrompt = `${style}${req.prompt}${avoid}${aspect}${noText}`;
  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };
  const bodyStr = JSON.stringify(body);

  // 1. Vertex AI — production path. Uses the same generateContent shape as
  //    AI Studio but signed with a service-account-minted OAuth token.
  //    Soft-fails to AI Studio (and ultimately null) if the call returns
  //    non-2xx or the image-preview model isn't enabled on the project.
  const saB64 = process.env['GCP_SA_JSON_B64'];
  const project = process.env['GCP_PROJECT_ID'];
  if (saB64 && project) {
    const location = process.env['GCP_LOCATION'] ?? 'us-central1';
    try {
      const credentials = JSON.parse(Buffer.from(saB64, 'base64').toString('utf-8'));
      const accessToken = await mintGcpAccessToken(credentials);

      // 1a. Imagen via :predict — the actual production image-gen API on Vertex.
      // Different request shape than Gemini :generateContent. Tries the latest
      // stable + fastest in order; first 2xx with predictions[].bytesBase64Encoded
      // wins. If both fail (model not enabled / safety block / quota), falls
      // through to the Gemini :generateContent attempts below.
      const aspect = (req.aspectRatio ?? '16:9');
      const imagenBody = JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspect,
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      });
      for (const model of IMAGEN_MODEL_CANDIDATES) {
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: imagenBody,
          });
          if (!res.ok) {
            if (res.status !== 404) {
              const errText = await res.text();
              console.warn(`[hero-image] imagen ${model} ${res.status}: ${errText.slice(0, 200)}`);
              break;
            }
            continue;
          }
          const data = (await res.json()) as ImagenResponse;
          const pred = data.predictions?.[0];
          if (pred?.bytesBase64Encoded) {
            return {
              bytes: Buffer.from(pred.bytesBase64Encoded, 'base64'),
              mimeType: pred.mimeType ?? 'image/png',
              prompt: fullPrompt,
              tokensUsed: 0,
            };
          }
        } catch (err) {
          console.warn(`[hero-image] imagen ${model} threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 1b. Gemini :generateContent on the image-preview models. Kept as a
      // fallback for projects where Imagen isn't enabled but Gemini image
      // generation is. Both candidates returned empty on solid-heaven so
      // far, but harmless to try.
      for (const model of VERTEX_MODEL_CANDIDATES) {
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: bodyStr,
          });
          if (!res.ok) {
            // 404 on this model name = not enabled, try the next candidate.
            // 4xx other = body issue, won't help to retry, log + bail.
            if (res.status !== 404) {
              const errText = await res.text();
              console.warn(`[hero-image] vertex ${model} ${res.status}: ${errText.slice(0, 200)}`);
              break;
            }
            continue;
          }
          const data = (await res.json()) as GeminiResponse;
          const result = extractImage(data, fullPrompt);
          if (result) return result;
        } catch (err) {
          console.warn(`[hero-image] vertex ${model} threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      console.warn(`[hero-image] vertex setup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. AI Studio — dev/local convenience. Billing depleted in AllOnce prod.
  const apiKey = process.env['GOOGLE_AI_API_KEY'];
  if (apiKey && apiKey.trim() !== '') {
    const url = `${AI_STUDIO_BASE}/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      if (res.ok) {
        const data = (await res.json()) as GeminiResponse;
        return extractImage(data, fullPrompt);
      }
    } catch { /* fall through to null */ }
  }

  return null;
}

/** Find the first inline image in a Gemini response. Shared by both auth paths. */
function extractImage(data: GeminiResponse, fullPrompt: string): HeroImageResult | null {
  for (const cand of data.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      const inline = part.inline_data ?? part.inlineData;
      if (inline?.data) {
        const mime = inline.mime_type ?? inline.mimeType ?? 'image/png';
        return {
          bytes: Buffer.from(inline.data, 'base64'),
          mimeType: mime,
          prompt: fullPrompt,
          revisedPrompt: part.text,
          tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
        };
      }
    }
  }
  return null;
}

// ── Style picker — when LLM didn't provide heroImagePrompt ──────────────

/**
 * Build a default prompt from the brand identity + variant pick, when the
 * LLM either omitted heroImagePrompt or it failed validation.
 */
export function defaultHeroPrompt(opts: {
  businessName: string;
  paragraph: string;
  archetype?: string;
  photoStyle: HeroImageRequest['style'];
}): string {
  const archetypeFlavor = (() => {
    switch (opts.archetype?.toLowerCase()) {
      case 'sage':
      case 'ruler': return 'understated authority, considered detail';
      case 'creator':
      case 'magician': return 'inventive, distinctive visual idea';
      case 'caregiver':
      case 'innocent': return 'gentle, warm, soft palette';
      case 'outlaw':
      case 'hero': return 'bold, high-contrast, confident';
      case 'lover': return 'intimate, tactile, sensual texture';
      case 'jester':
      case 'explorer': return 'playful, energetic, unexpected';
      case 'everyman': return 'honest, real, lived-in';
      default: return 'considered, professional';
    }
  })();
  return `A wide editorial photograph for ${opts.businessName}: ${opts.paragraph}. Visual mood: ${archetypeFlavor}. Single clear subject, no clutter.`;
}
