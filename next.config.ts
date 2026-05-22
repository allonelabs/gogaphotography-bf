import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Multi-zone: shell-zone IS the root domain (bf.allonelabs.com).
  // It rewrites /app/business/:id/:path* to business-zone.
  // assetPrefix not needed here since this zone IS the root.
  async rewrites() {
    const businessZone = process.env.BUSINESS_ZONE_URL ?? 'https://business-forge-zone-business.vercel.app';
    return [
      { source: '/app/business/:id', destination: `${businessZone}/app/business/:id` },
      { source: '/app/business/:id/:path*', destination: `${businessZone}/app/business/:id/:path*` },
    ];
  },

  // Landing page was lifted from a static-HTML site and still has hard-coded
  // /index.html and /signin/index.html hrefs (logo + sign-in link). Without
  // these redirects, clicking those links 404s on Next.js — surfacing as
  // "landing is broken". Pre-existing bug in local pnpm dev too.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/signin/index.html', destination: '/signin', permanent: true },
    ];
  },

  // Stub @bf/* to keep the bundle off the spawn pipeline graph.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@bf': path.resolve(process.cwd(), '_stubs/bf-stub.ts'),
    };
    return config;
  },
};

export default config;
