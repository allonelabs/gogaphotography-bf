// Re-render and upload a spawn's pages from its existing variant spec +
// fresh products. Used after operator changes (products, content slices)
// so the spawned site reflects the latest state without a full respawn.

import { getSupabaseAdmin, getDefaultTenantId } from './supabase-server';
import { renderSiteByTemplate } from './site-templates';
import type { VariantSpec } from './site-templates/schema';
import { readProducts, readCategories } from './shop-store';

async function downloadJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

async function uploadJson(slug: string, name: string, data: unknown): Promise<string> {
  const sb = getSupabaseAdmin();
  const path = `${slug}/${name}.json`;
  const { error } = await sb.storage.from('spawns').upload(path, JSON.stringify(data, null, 2), {
    upsert: true, contentType: 'application/json',
  });
  if (error) throw new Error(`upload ${name}: ${error.message}`);
  return sb.storage.from('spawns').getPublicUrl(path).data.publicUrl;
}

async function uploadText(slug: string, name: string, content: string, ext: string, contentType: string): Promise<string> {
  const sb = getSupabaseAdmin();
  const path = `${slug}/${name}.${ext}`;
  const { error } = await sb.storage.from('spawns').upload(path, content, {
    upsert: true, contentType,
  });
  if (error) throw new Error(`upload ${name}: ${error.message}`);
  return sb.storage.from('spawns').getPublicUrl(path).data.publicUrl;
}

export interface RebuildResult {
  ok: boolean;
  reason?: string;
  routes?: Record<string, string>;
  productsApplied?: number;
}

/**
 * Re-render a spawn's 5 pages using its stored variant spec + fresh products.
 *
 * Soft-fails (returns {ok:false, reason}) when the spawn is missing
 * artifacts or pre-dates the variant pipeline. Callers should treat
 * !ok as "skipped" rather than fatal.
 */
export async function rebuildSiteWithProducts(slug: string): Promise<RebuildResult> {
  const sb = getSupabaseAdmin();
  const tenantId = await getDefaultTenantId();
  const { data: row, error: rowErr } = await sb
    .from('bf_runs')
    .select('id, metrics, brief_id')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (rowErr || !row) return { ok: false, reason: 'spawn not found' };
  const runRow = row as { id: string; metrics?: { artifacts?: Record<string, string> }; brief_id: string };
  const artifacts: Record<string, string> = runRow.metrics?.artifacts ?? {};
  if (!artifacts['site-variant']) return { ok: false, reason: 'no site-variant artifact' };

  const spec = await downloadJson<VariantSpec>(artifacts['site-variant']);
  if (!spec) return { ok: false, reason: 'failed to load variant spec' };

  const { data: brief } = await sb.from('bf_briefs').select('brief').eq('id', runRow.brief_id).maybeSingle();
  const briefData = (brief as { brief?: { name?: string; paragraph?: string } } | null)?.brief ?? {};
  const name = briefData.name ?? slug;
  const paragraph = briefData.paragraph ?? '';

  // Read live products + categories from /tmp/business-forge-out/<slug>/.bf/.
  const [products, categories] = await Promise.all([
    readProducts(slug),
    readCategories(slug),
  ]);

  const pages = renderSiteByTemplate({
    name, slug, paragraph, spec,
    heroImageUrl: artifacts['hero-photo'],
    products,
    categories,
  });

  const routes: Record<string, string> = {};
  for (const [filename, html] of Object.entries(pages)) {
    const phaseKey = filename === 'index.html' ? 'index' : filename.replace(/\.html$/, '');
    const url = await uploadText(slug, phaseKey, html, 'html', 'text/html');
    // Map product-<slug>.html → /product/<slug>, category-<slug>.html
    // → /category/<slug>; others → /<basename>
    const base = filename.replace(/\.html$/, '');
    let route: string;
    if (filename === 'index.html') route = '/';
    else if (base.startsWith('product-')) route = '/product/' + base.slice('product-'.length);
    else if (base.startsWith('category-')) route = '/category/' + base.slice('category-'.length);
    else route = '/' + base;
    routes[route] = url;
  }
  const manifestUrl = await uploadJson(slug, 'site-manifest', {
    routes, generatedAt: new Date().toISOString(),
    rebuilt: { trigger: 'products-changed', at: new Date().toISOString(), productsCount: products.length },
  });

  const newArtifacts = {
    ...artifacts,
    'site-manifest': manifestUrl,
    'site-routes': routes['/'] ?? artifacts['site-routes'],
  };
  await sb.from('bf_runs').update({
    metrics: { ...(runRow.metrics ?? {}), artifacts: newArtifacts, lastRebuildAt: new Date().toISOString() },
  }).eq('id', runRow.id);

  return { ok: true, routes, productsApplied: products.length };
}
