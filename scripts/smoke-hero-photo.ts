// Smoke the Gemini hero photo generator.
// If GOOGLE_AI_API_KEY is set in env, this actually calls Gemini and writes
// /tmp/hero-smoke.jpg. Otherwise it logs that the wiring works and would
// fall back to the gradient hero.

import { writeFileSync } from 'node:fs';
import { generateHeroImage, defaultHeroPrompt } from '../app/lib/gemini-image';

const hasKey = !!process.env['GOOGLE_AI_API_KEY'];
console.log('GOOGLE_AI_API_KEY set?', hasKey);

if (!hasKey) {
  // Confirm the function shape.
  const r = await generateHeroImage({ prompt: 'A photograph of a leather workshop.', style: 'editorial' });
  console.log('result with no key:', r);
  console.log('(this is the production-soft-fail path; renderer uses gradient hero)');
  process.exit(0);
}

const prompt = defaultHeroPrompt({
  businessName: 'Atelier Volans',
  paragraph: 'A leather workshop making hand-finished travel goods, one piece at a time, in Tbilisi since 2024.',
  archetype: 'Creator',
  photoStyle: 'editorial',
});
console.log('prompt:', prompt);

const result = await generateHeroImage({
  prompt,
  style: 'editorial',
  aspectRatio: '16:9',
});

if (!result) {
  console.log('Gemini returned null (filtered or no images). Soft-fail OK.');
  process.exit(0);
}

const ext = result.mimeType.includes('jpeg') ? 'jpg' : 'png';
const out = `/tmp/hero-smoke.${ext}`;
writeFileSync(out, result.bytes);
console.log(`wrote ${out} (${result.bytes.length} bytes, ${result.mimeType})`);
console.log('tokens used:', result.tokensUsed);
if (result.revisedPrompt) console.log('revised prompt:', result.revisedPrompt);
console.log(`\nopen ${out}`);
