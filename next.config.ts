import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // sharp is a native module — let it resolve at runtime instead of being
  // pulled through the bundler (upload thumbnail generation).
  serverExternalPackages: ['sharp'],

  // The Business Forge multi-zone rewrite went with the /app -> /admin move.
  // It forwarded /app/business/* to a separate deployment this single-tenant
  // studio never had, and leaving it would shadow the /app redirect below for
  // those paths — sending anyone on an old link to a zone that never answers.

  // Landing page was lifted from a static-HTML site and still has hard-coded
  // /index.html and /signin/index.html hrefs (logo + sign-in link). Without
  // these redirects, clicking those links 404s on Next.js — surfacing as
  // "landing is broken". Pre-existing bug in local pnpm dev too.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/signin/index.html', destination: '/signin', permanent: true },

      // The admin moved from /app to /admin. Bookmarks, the callback URL
      // saved in a password manager and links pasted into chats all still
      // point at /app, so keep them working instead of 404ing. Permanent
      // emits 308, which preserves the request method — these paths sit
      // behind form posts, and a 301 would silently rewrite POST to GET.
      { source: '/app', destination: '/admin', permanent: true },
      { source: '/app/:path*', destination: '/admin/:path*', permanent: true },
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
