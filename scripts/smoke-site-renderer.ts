// Smoke test for site-renderer: render all 5 pages from fallback content
// and write them to /tmp so you can open them in a browser and eyeball.
//
// Run: pnpm tsx scripts/smoke-site-renderer.ts
// Then: open /tmp/site-smoke/index.html

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fallbackContent, renderAllPages, type Palette } from '../app/lib/site-renderer';

const palette: Palette = {
  ink: '#0a0a0a',
  paper: '#fafafa',
  accent: '#0047ff',
  muted: '#6b6b6b',
  line: '#e5e5e5',
};

const name = 'Northwind';
const paragraph = 'A workflow tool for invoicing and recurring revenue, built for small services teams who hate spreadsheets.';
const content = fallbackContent(name, paragraph);

const pages = renderAllPages({
  name,
  slug: 'northwind',
  paragraph,
  content,
  palette,
  identity: { archetype: 'Sage', voice: 'Calm, useful, low-ego.' },
});

const outDir = '/tmp/site-smoke';
mkdirSync(outDir, { recursive: true });
for (const [filename, html] of Object.entries(pages)) {
  const p = join(outDir, filename);
  writeFileSync(p, html);
  console.log(`wrote ${p} (${html.length} bytes)`);
}
console.log(`\nopen ${outDir}/index.html`);
