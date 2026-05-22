// Template dispatcher.
//
// Routes a spawn to the right per-vertical render() based on
// VariantSpec.picks.template. Each template consumes the same input shape
// and returns a Record<filename, html>. Renderer choice is the only
// branch — palette/fonts/motion/decorations are template-agnostic.

import type { VariantSpec, TemplateKey } from './schema';
import type { Product, Category } from '../shop-store';
import { renderSite as renderVercelSaas } from './vercel-saas/render';
import { renderSite as renderWalkbyEcom } from './walkby-ecom/render';
import { renderSite as renderAfishaHotel } from './afisha-hotel/render';
import { renderSite as renderEquivalenzaRetail } from './equivalenza-retail/render';
import { renderSite as renderUtopiaPortfolio } from './utopia-portfolio/render';
// qualige-edu render kept on disk but no longer wired — see case 'qualige-edu'
// in the dispatcher below for why.

export interface TemplateInput {
  name: string;
  slug: string;
  paragraph: string;
  spec: VariantSpec;
  heroImageUrl?: string;
  /** Real products from /shop-store. When present, e-commerce templates
   *  render these instead of synthesizing from content.features. */
  products?: Product[];
  /** Real categories from /shop-store. Drives /category/<slug> landing
   *  pages on e-commerce templates. */
  categories?: Category[];
}

export function renderSiteByTemplate(input: TemplateInput): Record<string, string> {
  const tpl: TemplateKey = input.spec.picks.template;
  switch (tpl) {
    case 'walkby-ecom':
      return renderWalkbyEcom(input);
    case 'afisha-hotel':
      return renderAfishaHotel(input);
    case 'equivalenza-retail':
      return renderEquivalenzaRetail(input);
    case 'utopia-portfolio':
      return renderUtopiaPortfolio(input);
    case 'qualige-edu':
      // Deliberately routed to vercel-saas — qualige-edu was an early
      // "online course" template, but real LMS functionality (courses,
      // lessons, quizzes, roster, enrollment) lives in the Team surface
      // (components/team/). Spawned edu briefs get a marketing site, not
      // an in-product course platform.
      return renderVercelSaas(input);
    case 'vercel-saas':
      return renderVercelSaas(input);
    default:
      return renderVercelSaas(input);
  }
}
