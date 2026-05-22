// Eight background renderers. Each returns a CSS snippet (string) that goes
// straight into the page <style>. They all read from the resolved palette
// and (when relevant) from params.bgGradientStops.

import type { BackgroundKey, ResolvedPalette, VariantParams } from '../schema';

export function backgroundCss(key: BackgroundKey, palette: ResolvedPalette, params: VariantParams): string {
  switch (key) {
    case 'solid':
      return `body{background:${palette.paper}}`;
    case 'subtle-grain':
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.4;background-image:radial-gradient(${palette.ink}11 1px,transparent 1px);background-size:4px 4px;mix-blend-mode:multiply}`;
    case 'gradient-mesh': {
      const stops = (params.bgGradientStops && params.bgGradientStops.length >= 2)
        ? params.bgGradientStops
        : [palette.paper, palette.accentSoft];
      const [a = palette.paper, b = palette.accentSoft, c] = stops;
      const third = c ?? a;
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;background:
radial-gradient(60vw 60vh at 20% 10%, ${a} 0%, transparent 60%),
radial-gradient(50vw 50vh at 80% 30%, ${b} 0%, transparent 55%),
radial-gradient(70vw 70vh at 50% 90%, ${third} 0%, transparent 70%)}`;
    }
    case 'dot-grid':
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.35;background-image:radial-gradient(${palette.muted}55 1.2px,transparent 1.2px);background-size:24px 24px}`;
    case 'line-grid':
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.18;background-image:linear-gradient(${palette.line} 1px,transparent 1px),linear-gradient(90deg,${palette.line} 1px,transparent 1px);background-size:48px 48px}`;
    case 'abstract-shape':
      return `body{background:${palette.paper};position:relative;overflow-x:hidden}
body::before{content:"";position:fixed;top:-15vh;right:-10vw;width:55vmax;height:55vmax;border-radius:50%;background:radial-gradient(circle at 30% 30%, ${palette.accent}33 0%, transparent 70%);pointer-events:none;z-index:-1;filter:blur(60px)}
body::after{content:"";position:fixed;bottom:-20vh;left:-10vw;width:45vmax;height:45vmax;border-radius:50%;background:radial-gradient(circle at 50% 50%, ${palette.accentSoft} 0%, transparent 65%);pointer-events:none;z-index:-1;filter:blur(80px)}`;
    case 'film-grain':
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.06;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>")}`;
    case 'paper-grain':
      // Subtle warm paper texture — soft fibers + slight color variation.
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.08;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='p'><feTurbulence type='turbulence' baseFrequency='0.04' numOctaves='4'/><feColorMatrix values='0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>");mix-blend-mode:multiply}`;
    case 'crosshatch':
      return `body{background:${palette.paper}}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.06;background-image:
repeating-linear-gradient(45deg, ${palette.ink} 0 1px, transparent 1px 6px),
repeating-linear-gradient(-45deg, ${palette.ink} 0 1px, transparent 1px 6px)}`;
    case 'noise-overlay':
      // High-contrast noise as character-builder texture; sits above content slightly.
      return `body{background:${palette.paper};position:relative}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.04;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");mix-blend-mode:multiply}`;
    case 'vignette':
      // Subtle radial darkening at edges — concentrates attention.
      return `body{background:${palette.paper};position:relative}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at center, transparent 0%, transparent 50%, ${palette.ink}14 100%)}`;
    case 'none':
    default:
      return `body{background:${palette.paper}}`;
  }
}
