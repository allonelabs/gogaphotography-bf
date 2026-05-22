// AllOnce marketing landing — nested layout for the `(landing)` route
// group. Loads the landing's pre-built CSS bundles + Caveat font +
// analytics-tracker stubs (so legacy data/*.js scripts on the page
// don't error). Operator UI under /app/* uses the OPERATOR layout
// instead, so the landing CSS never bleeds into it.
//
// Lifted from /private/tmp/allonce-next/app/layout.tsx with the html/body
// wrappers stripped — those live in BF's root app/layout.tsx.

import type { Metadata, Viewport } from 'next';

const SITE_URL = 'https://bf.allonelabs.com';
const OG_IMAGE = `${SITE_URL}/images/og-card.png`;
const TITLE = 'AllOnce — Your business, all at once.';
const DESCRIPTION =
  'One prompt. Your entire business. All at once. Stop running 14 tabs. AllOnce gives operators one window for the whole company — site, ops, customers, decisions.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-touch-icon.png' },
  },
  openGraph: {
    type: 'website',
    siteName: 'AllOnce',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'AllOnce — your business, all at once' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

const TRACKER_STUBS = `try{if(!window.dataLayer)window.dataLayer=[];if(!window.gtag)window.gtag=function(){};if(!window.ga)window.ga=function(){};if(!window.fbq)window.fbq=function(){};if(!window._satellite)window._satellite={track:function(){},getVar:function(){},setVar:function(){}};if(!window.optimizely)window.optimizely={push:function(){}};if(!window.__tcfapi)window.__tcfapi=function(){}}catch(e){}`;

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Pre-built CSS bundles served from /public/css. Each url(/fonts/…)
          inside resolves at runtime against the same /public root. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/style-0.css" />
      <link rel="stylesheet" href="/css/theme-light.css" />
      <link rel="stylesheet" href="/css/ig-mix.css" />
      <link rel="stylesheet" href="/css/workflow.css" />
      <link rel="stylesheet" href="/css/accent.css" />
      <link rel="stylesheet" href="/css/signin.css" />
      <script dangerouslySetInnerHTML={{ __html: TRACKER_STUBS }} />
      {children}
    </>
  );
}
